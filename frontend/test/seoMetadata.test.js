import assert from "node:assert/strict";
import test from "node:test";
import { buildSeoMetadata, FALLBACK_SEO } from "../src/utils/seoMetadata.js";

test("null and undefined SEO use complete fallback metadata", () => {
  for (const seo of [null, undefined, {}]) {
    assert.deepEqual(buildSeoMetadata(seo, null), FALLBACK_SEO);
  }
});

test("partial page SEO inherits missing site defaults", () => {
  const result = buildSeoMetadata(
    { title: "Services", keywords: undefined },
    { defaultDescription: "Default description", defaultKeywords: ["government", "online"] },
  );
  assert.equal(result.title, "Services");
  assert.equal(result.description, "Default description");
  assert.equal(result.keywords, "government, online");
  assert.equal(result.robots, "index,follow");
});

test("legacy string keywords and image shapes are normalized safely", () => {
  const result = buildSeoMetadata(
    { noIndex: true, noFollow: true, ogImage: null },
    { defaultKeywords: "digital services", defaultImage: { url: "https://example.com/default.webp" } },
  );
  assert.equal(result.keywords, "digital services");
  assert.equal(result.robots, "noindex,nofollow");
  assert.equal(result.ogImage, "https://example.com/default.webp");
});

test("empty page values cannot erase required fallback title and description", () => {
  const result = buildSeoMetadata({ title: "", description: "  " }, {});
  assert.equal(result.title, FALLBACK_SEO.title);
  assert.equal(result.description, FALLBACK_SEO.description);
});
