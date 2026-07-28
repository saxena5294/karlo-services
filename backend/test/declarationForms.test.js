import assert from "node:assert/strict";
import test from "node:test";
import { Writable } from "node:stream";
import mongoose from "mongoose";
import { getCloudinary } from "../src/config/cloudinary.js";
import { DeclarationForm } from "../src/models/declarationFormModel.js";
import {
  adminReplaceDeclarationPdf,
  buildDeclarationFormFilter,
  DECLARATION_CATEGORIES,
  DECLARATION_LANGUAGES,
  recordDeclarationDownload,
  slugify,
} from "../src/services/declarationFormService.js";
import { hasPdfSignature } from "../src/services/declarationPdfStorageService.js";

test("declaration form schema has unique Cloudinary and slug identifiers", () => {
  assert.equal(DeclarationForm.schema.path("publicId").options.unique, true);
  assert.equal(DeclarationForm.schema.path("slug").options.unique, true);
  assert.ok(
    DeclarationForm.schema.indexes().some(
      ([fields]) => fields.isActive === 1 && fields.visibleTo === 1 && fields.displayOrder === 1,
    ),
  );
});

test("declaration form schema requires a PDF, HTTPS URL, and audience", () => {
  const invalid = new DeclarationForm({
    title: "Test Declaration",
    slug: "test-declaration",
    category: "Test",
    language: "English",
    fileUrl: "http://unsafe.example/form.pdf",
    publicId: "karlo-services/declaration-forms/test",
    fileName: "test.pdf",
    fileType: "doc",
    visibleTo: [],
  }).validateSync();

  assert.ok(invalid.errors.fileUrl);
  assert.ok(invalid.errors.fileType);
  assert.ok(invalid.errors.visibleTo);
});

test("declaration form schema stores uploaded PDF metadata", () => {
  const form = new DeclarationForm({
    title: "Aadhaar Declaration",
    slug: "aadhaar-declaration",
    category: "Aadhaar",
    language: "English",
    fileUrl: "https://res.cloudinary.com/demo/raw/upload/form.pdf",
    publicId: "karlo-services/declaration-forms/aadhaar-declaration.pdf",
    fileName: "aadhaar.pdf",
    fileType: "pdf",
    mimeType: "application/pdf",
    fileSize: 1234,
    cloudinaryResourceType: "raw",
    visibleTo: ["customer"],
  });

  assert.equal(form.validateSync(), undefined);
  assert.equal(form.mimeType, "application/pdf");
  assert.equal(form.fileSize, 1234);
  assert.ok(DECLARATION_CATEGORIES.includes(form.category));
  assert.ok(DECLARATION_LANGUAGES.includes(form.language));
});

test("PDF content validation checks the file signature", () => {
  assert.equal(hasPdfSignature(Buffer.from("%PDF-1.7\ncontent")), true);
  assert.equal(hasPdfSignature(Buffer.from("PK zip content")), false);
});

test("customer and partner listing filters enforce active role visibility", () => {
  assert.deepEqual(buildDeclarationFormFilter("customer"), {
    isActive: true,
    visibleTo: "customer",
  });
  assert.deepEqual(buildDeclarationFormFilter("partner", { category: "Income", popular: "true" }), {
    isActive: true,
    visibleTo: "partner",
    category: "Income",
    isPopular: true,
  });
  assert.throws(() => buildDeclarationFormFilter("admin"), /unavailable for this role/);
});

test("search input is escaped before being used as a regular expression", () => {
  const filter = buildDeclarationFormFilter("customer", { search: "PAN (new)*" });
  assert.equal(filter.$or[0].title.test("PAN (new)* declaration"), true);
  assert.equal(slugify(" Income  Declaration (Hindi) "), "income-declaration-hindi");
});

test("successful download recording atomically increments only an active form visible to the role", async () => {
  const id = new mongoose.Types.ObjectId().toString();
  const original = DeclarationForm.updateOne;
  let operation;
  DeclarationForm.updateOne = async (filter, update) => {
    operation = { filter, update };
    return { modifiedCount: 1 };
  };

  try {
    const updated = await recordDeclarationDownload(id, "customer");
    assert.equal(updated, true);
    assert.deepEqual(operation.filter, {
      _id: id,
      isActive: true,
      visibleTo: "customer",
    });
    assert.deepEqual(operation.update, { $inc: { downloadCount: 1 } });
  } finally {
    DeclarationForm.updateOne = original;
  }
});

test("admin download recording can increment inactive declaration forms", async () => {
  const id = new mongoose.Types.ObjectId().toString();
  const original = DeclarationForm.updateOne;
  let filter;
  DeclarationForm.updateOne = async (nextFilter) => {
    filter = nextFilter;
    return { modifiedCount: 1 };
  };
  try {
    assert.equal(await recordDeclarationDownload(id, "admin"), true);
    assert.deepEqual(filter, { _id: id });
  } finally {
    DeclarationForm.updateOne = original;
  }
});

test("PDF replacement updates file fields before deleting the old asset and preserves metadata", async () => {
  process.env.CLOUDINARY_CLOUD_NAME ||= "declaration-test";
  process.env.CLOUDINARY_API_KEY ||= "test-key";
  process.env.CLOUDINARY_API_SECRET ||= "test-secret";

  const id = new mongoose.Types.ObjectId().toString();
  const oldAsset = {
    slug: "income-declaration",
    publicId: "karlo-services/declaration-forms/old.pdf",
    cloudinaryResourceType: "raw",
    cloudinaryDeliveryType: "upload",
  };
  const replacement = {
    public_id: "karlo-services/declaration-forms/new",
    secure_url: "https://res.cloudinary.com/test/image/upload/new.pdf",
    bytes: 28,
    asset_id: "new-asset",
    version: 2,
    resource_type: "image",
    type: "upload",
  };
  const file = {
    originalname: "replacement.pdf",
    mimetype: "application/pdf",
    size: 28,
    buffer: Buffer.from("%PDF-1.7\nreplacement body"),
  };
  const cloudinary = getCloudinary();
  const originals = {
    findById: DeclarationForm.findById,
    findByIdAndUpdate: DeclarationForm.findByIdAndUpdate,
    uploadStream: cloudinary.uploader.upload_stream,
    destroy: cloudinary.uploader.destroy,
  };
  const sequence = [];
  let databaseUpdate;

  DeclarationForm.findById = () => ({
    select: () => ({ lean: async () => oldAsset }),
  });
  DeclarationForm.findByIdAndUpdate = (_id, update) => {
    databaseUpdate = update;
    sequence.push("database-updated");
    return {
      select: () => ({ lean: async () => ({ _id: id, ...update.$set }) }),
    };
  };
  cloudinary.uploader.upload_stream = (_options, callback) => new Writable({
    write(_chunk, _encoding, done) {
      done();
    },
    final(done) {
      sequence.push("new-uploaded");
      callback(null, replacement);
      done();
    },
  });
  cloudinary.uploader.destroy = async (publicId, options) => {
    sequence.push("old-deleted");
    assert.equal(publicId, oldAsset.publicId);
    assert.equal(options.resource_type, oldAsset.cloudinaryResourceType);
    return { result: "ok" };
  };

  try {
    const updated = await adminReplaceDeclarationPdf(id, file, "admin-1");
    assert.equal(updated.publicId, replacement.public_id);
    assert.equal(updated.fileName, file.originalname);
    assert.deepEqual(sequence, ["new-uploaded", "database-updated", "old-deleted"]);
    for (const preserved of [
      "title",
      "slug",
      "category",
      "visibleTo",
      "displayOrder",
      "isPopular",
      "isActive",
      "downloadCount",
    ]) {
      assert.equal(databaseUpdate.$set[preserved], undefined);
    }
  } finally {
    DeclarationForm.findById = originals.findById;
    DeclarationForm.findByIdAndUpdate = originals.findByIdAndUpdate;
    cloudinary.uploader.upload_stream = originals.uploadStream;
    cloudinary.uploader.destroy = originals.destroy;
  }
});
