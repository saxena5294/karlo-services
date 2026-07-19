import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { connectDatabase } from "../config/database.js";
import { serviceCatalogSeedData, serviceMigrationGroups } from "../config/serviceCatalogSeedData.js";
import { Service } from "../models/serviceModel.js";
import { ServiceForm } from "../models/serviceFormModel.js";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });
const force = process.argv.includes("--force");

const defaultForm = (serviceId, title) => ({
  service: serviceId, title: `${title} application form`, description: "Complete the details required for the selected service type.",
  sections: [{ id: "service", title: "Service details", description: "Tell us what you need.", order: 10 }],
  fields: [{ name: "requestDetails", label: "Request Details", type: "textarea", required: true, section: "service", order: 10, maxLength: 2000 }],
  isActive: true,
});

const migrateGroup = async (definition, stats) => {
  const seedParent = serviceCatalogSeedData.find(({ slug }) => slug === definition.parentSlug);
  let parent = await Service.findOne({ slug: definition.parentSlug });
  if (!parent) parent = await Service.findOne({ slug: { $in: definition.legacyParentSlugs } });
  if (!parent) { parent = await Service.create(seedParent); stats.created += 1; }
  else {
    const migrationVersionChanged = Boolean(seedParent.migrationSource && parent.migrationSource !== seedParent.migrationSource);
    const convertingStandalone = !(parent.variants || []).length && seedParent.variants?.length;
    const originalSlug = parent.slug;
    if (parent.slug !== definition.parentSlug) { parent.legacySlugs = [...new Set([...(parent.legacySlugs || []), originalSlug])]; parent.slug = definition.parentSlug; }
    if (convertingStandalone) parent.set({ title: seedParent.title, description: seedParent.description, category: seedParent.category, dashboardCategory: seedParent.dashboardCategory, icon: seedParent.icon, variantSelectionLabel: seedParent.variantSelectionLabel, keywords: seedParent.keywords });
    parent.migrationStatus = "parent"; parent.migrationSource ||= seedParent.migrationSource || "service-catalog-v2";
    const mergedParentSlugs = [...new Set([...(parent.legacySlugs || []), ...definition.legacyParentSlugs])];
    if (mergedParentSlugs.length !== (parent.legacySlugs || []).length) parent.legacySlugs = mergedParentSlugs;
    const variantsByKey = new Map((parent.variants || []).map((item) => [item.key, item]));
    for (const seeded of seedParent.variants) if (!variantsByKey.has(seeded.key)) parent.variants.push(seeded);
    if (force && parent.migrationSource === "service-catalog-v2") {
      const existingVariants = new Map(parent.variants.map((item) => [item.key, item]));
      parent.set({ ...seedParent, _id: parent._id, legacySlugs: [...new Set([...(parent.legacySlugs || []), ...definition.legacyParentSlugs])] });
      parent.variants = seedParent.variants.map((seeded) => existingVariants.get(seeded.key)?.updatedAt ? existingVariants.get(seeded.key) : seeded);
    }
    if (parent.isModified()) { await parent.save(); stats.updated += 1; } else stats.skipped += 1;
    parent.$locals.migrationVersionChanged = migrationVersionChanged;
  }

  const legacyParents = await Service.find({ slug: { $in: definition.legacyParentSlugs }, _id: { $ne: parent._id }, migrationStatus: { $ne: "migrated" } });
  for (const legacyParent of legacyParents) {
    for (const legacyVariant of legacyParent.variants || []) {
      const index = parent.variants.findIndex(({ slug }) => slug === legacyVariant.slug);
      if (index < 0) continue;
      const target = parent.variants[index];
      if (legacyVariant.pricing) target.pricing = legacyVariant.pricing;
      if (legacyVariant.processingTime) target.processingTime = legacyVariant.processingTime;
      target.requiredDocuments = [...new Set([...(target.requiredDocuments || []), ...(legacyVariant.requiredDocuments || [])])];
      if (legacyVariant.formConfiguration?.fields?.length) {
        const seededFields = target.formConfiguration?.fields || [];
        const seededNames = new Set(seededFields.map(({ name }) => name));
        target.formConfiguration = { ...legacyVariant.formConfiguration, ...target.formConfiguration, fields: [...seededFields, ...legacyVariant.formConfiguration.fields.filter(({ name }) => !seededNames.has(name))] };
      }
    }
    parent.legacyServiceIds.addToSet(legacyParent._id); parent.legacySlugs = [...new Set([...(parent.legacySlugs || []), legacyParent.slug])];
    const repointed = await Service.updateMany({ migratedTo: legacyParent._id }, { $set: { migratedTo: parent._id } });
    legacyParent.isActive = false; legacyParent.migrationStatus = "migrated"; legacyParent.migratedTo = parent._id; legacyParent.migrationSource = "service-catalog-v2";
    await legacyParent.save(); stats.migrated += 1 + (repointed.modifiedCount || 0);
  }

  const candidates = await Service.find({ slug: { $in: definition.variantSlugs }, _id: { $ne: parent._id }, migrationStatus: { $ne: "migrated" } });
  for (const legacy of candidates) {
    const seededVariant = seedParent.variants.find(({ slug }) => slug === legacy.slug);
    const index = parent.variants.findIndex(({ key, slug }) => key === seededVariant?.key || slug === legacy.slug);
    if (index >= 0 && parent.variants[index].pricing?.requiresAdminReview && legacy.pricing) {
      parent.variants[index].pricing = legacy.pricing;
      parent.variants[index].processingTime = legacy.estimatedProcessingTime;
      parent.variants[index].requiredDocuments = legacy.requiredDocuments || parent.variants[index].requiredDocuments;
      const legacyForm = await ServiceForm.findOne({ service: legacy._id }).lean();
      if (legacyForm) parent.variants[index].formConfiguration = { title: legacyForm.title, description: legacyForm.description, sections: legacyForm.sections, fields: legacyForm.fields, requireEmail: legacyForm.requireEmail, allowAdditionalDocuments: legacyForm.allowAdditionalDocuments, maxAdditionalDocuments: legacyForm.maxAdditionalDocuments, termsUrl: legacyForm.termsUrl, captchaRequired: legacyForm.captchaRequired };
    }
    parent.legacyServiceIds.addToSet(legacy._id); parent.legacySlugs = [...new Set([...(parent.legacySlugs || []), legacy.slug])];
    legacy.isActive = false; legacy.migrationStatus = "migrated"; legacy.migratedTo = parent._id; legacy.migrationSource = "service-catalog-v2";
    await legacy.save(); stats.migrated += 1;
  }
  if (parent.$locals.migrationVersionChanged) {
    parent.set({ title: seedParent.title, description: seedParent.description, category: seedParent.category, dashboardCategory: seedParent.dashboardCategory, icon: seedParent.icon, variantSelectionLabel: seedParent.variantSelectionLabel, keywords: seedParent.keywords, migrationSource: seedParent.migrationSource });
    for (const seededVariant of seedParent.variants || []) {
      const index = parent.variants.findIndex(({ slug }) => slug === seededVariant.slug);
      if (index < 0) continue;
      parent.variants[index].set({ key: seededVariant.key, title: seededVariant.title, description: seededVariant.description, keywords: seededVariant.keywords, requiredDocuments: seededVariant.requiredDocuments, formConfiguration: seededVariant.formConfiguration, displayOrder: seededVariant.displayOrder, isActive: seededVariant.isActive });
    }
  }
  if (parent.isModified()) await parent.save();
  if (!await ServiceForm.exists({ service: parent._id })) { await ServiceForm.create(defaultForm(parent._id, parent.title)); stats.formsCreated += 1; }
};

const seedServices = async () => {
  const stats = { created: 0, updated: 0, migrated: 0, skipped: 0, formsCreated: 0 };
  try {
    await connectDatabase();
    for (const group of serviceMigrationGroups) await migrateGroup(group, stats);
    const parentSlugs = new Set(serviceMigrationGroups.map(({ parentSlug }) => parentSlug));
    for (const seed of serviceCatalogSeedData.filter(({ slug }) => !parentSlugs.has(slug))) {
      const existing = await Service.findOne({ slug: seed.slug });
      if (existing) { if (force && existing.migrationSource === "service-catalog-v2") { existing.set(seed); await existing.save(); stats.updated += 1; } else stats.skipped += 1; }
      else { await Service.create(seed); stats.created += 1; }
    }
    console.log(`[services seed] Created parents/standalone: ${stats.created}; updated parents: ${stats.updated}; migrated legacy records: ${stats.migrated}; skipped Admin-owned: ${stats.skipped}; base forms created: ${stats.formsCreated}`);
  } catch (error) { console.error(`[services seed] Failed: ${error.stack || error.message}`); process.exitCode = 1; }
  finally { if (mongoose.connection.readyState !== 0) await mongoose.connection.close(); }
};

seedServices();
