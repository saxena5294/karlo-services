import assert from "node:assert/strict";
import test from "node:test";
import { BlogPost } from "../src/models/blogPostModel.js";
import { Category } from "../src/models/categoryModel.js";
import { Notice } from "../src/models/noticeModel.js";
import { PageSeo, SEO_PAGE_KEYS } from "../src/models/pageSeoModel.js";
import { activeNoticeFilter, slugifyCms } from "../src/services/cmsExtendedService.js";

test("extended CMS schemas expose required uniqueness and public indexes", () => {
  const categoryIndexes = Category.schema.indexes();
  const blogIndexes = BlogPost.schema.indexes();
  const seoIndexes = PageSeo.schema.indexes();
  assert.equal(categoryIndexes.some(([keys, options]) => keys.slug === 1 && options.unique), true);
  assert.equal(blogIndexes.some(([keys, options]) => keys.slug === 1 && options.unique), true);
  assert.equal(seoIndexes.some(([keys, options]) => keys.pageKey === 1 && options.unique), true);
  assert.equal(Notice.schema.indexes().some(([keys]) => keys.isActive === 1 && keys.deletedAt === 1), true);
  assert.equal(Notice.schema.indexes().some(([keys]) => keys.startsAt === 1 && keys.endsAt === 1), true);
});

test("CMS slugs are stable and notices use bounded active schedules", () => {
  assert.equal(slugifyCms("  GST & ITR Filing  "), "gst-itr-filing");
  const now = new Date("2026-01-01T00:00:00.000Z");
  const filter = activeNoticeFilter(now);
  assert.equal(filter.isActive, true);
  assert.equal(filter.deletedAt, null);
  assert.equal(filter.$and[0].$or[1].startsAt.$lte, now);
  assert.equal(filter.$and[1].$or[1].endsAt.$gt, now);
});

test("blog publication and SEO page keys are constrained", () => {
  const invalidBlog = new BlogPost({ title: "Post", slug: "post", excerpt: "Summary", content: "Body", author: "Admin", status: "live" });
  assert.ok(invalidBlog.validateSync()?.errors.status);
  assert.deepEqual(SEO_PAGE_KEYS, ["homepage", "services", "contact", "faq", "blogs"]);
});
