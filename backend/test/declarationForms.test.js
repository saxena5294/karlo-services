import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { DeclarationForm } from "../src/models/declarationFormModel.js";
import {
  buildDeclarationFormFilter,
  DECLARATION_CATEGORIES,
  DECLARATION_LANGUAGES,
  getDeclarationDownload,
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

test("download atomically increments only an active form visible to the role", async () => {
  const id = new mongoose.Types.ObjectId().toString();
  const original = DeclarationForm.findOneAndUpdate;
  let operation;
  DeclarationForm.findOneAndUpdate = (filter, update, options) => {
    operation = { filter, update, options };
    return {
      select: async () => ({ fileUrl: "https://res.cloudinary.com/demo/raw/upload/form.pdf" }),
    };
  };

  try {
    const url = await getDeclarationDownload(id, "customer");
    assert.equal(url, "https://res.cloudinary.com/demo/raw/upload/form.pdf");
    assert.deepEqual(operation.filter, {
      _id: id,
      isActive: true,
      visibleTo: "customer",
    });
    assert.deepEqual(operation.update, { $inc: { downloadCount: 1 } });
    assert.equal(operation.options.returnDocument, "after");
  } finally {
    DeclarationForm.findOneAndUpdate = original;
  }
});
