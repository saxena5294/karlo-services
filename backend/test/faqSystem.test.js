import assert from "node:assert/strict";
import test from "node:test";
import { faqSeedData } from "../src/config/faqSeedData.js";
import { FAQ, FAQ_AUDIENCES, FAQ_CATEGORIES } from "../src/models/faqModel.js";

test("FAQ schema supports categories, audiences, keywords, featured state and display order", async () => {
  const faq = new FAQ({ question: "How does this work?", answer: "A complete answer.", category: "General", displayOrder: 7, isFeatured: true, audience: ["public", "customer"], keywords: ["Process"], createdBy: "admin", updatedBy: "admin" });
  await faq.validate();
  assert.equal(faq.order, 7);
  assert.equal(faq.isFeatured, true);
  assert.deepEqual(faq.audience, ["public", "customer"]);
  assert.deepEqual(faq.keywords, ["process"]);
  assert.deepEqual(FAQ_AUDIENCES, ["public", "customer", "partner"]);
  assert.ok(FAQ_CATEGORIES.includes("OTP & Security"));
});

test("FAQ validation rejects unsupported categories, duplicate audiences and excessive keywords", async () => {
  const invalid = new FAQ({ question: "Question?", answer: "Answer", category: "Unknown", audience: ["public", "public"], keywords: Array.from({ length: 21 }, (_, index) => `key-${index}`), createdBy: "admin", updatedBy: "admin" });
  await assert.rejects(invalid.validate(), /category|audience|keywords/i);
});

test("FAQ seed is unique, professional, searchable and free of reference branding", () => {
  assert.ok(faqSeedData.length >= 20);
  assert.equal(new Set(faqSeedData.map(({ question }) => question)).size, faqSeedData.length);
  assert.equal(JSON.stringify(faqSeedData).toLowerCase().includes(`csc${"wale"}`), false);
  assert.ok(faqSeedData.every(({ category, audience, keywords }) => FAQ_CATEGORIES.includes(category) && audience.length && Array.isArray(keywords)));
  assert.ok(faqSeedData.some(({ isFeatured }) => isFeatured));
  assert.ok(faqSeedData.some(({ audience }) => audience.includes("partner") && !audience.includes("public")));
});

test("FAQ collection includes public lookup and text-search indexes", () => {
  const indexes = FAQ.schema.indexes();
  assert.ok(indexes.some(([fields]) => fields.audience === 1 && fields.isFeatured === -1));
  assert.ok(indexes.some(([fields]) => fields.question === "text" && fields.answer === "text" && fields.keywords === "text"));
});
