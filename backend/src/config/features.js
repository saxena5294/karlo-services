export const isLeadMarketplaceEnabled = (env = process.env) =>
  String(env.LEAD_MARKETPLACE_ENABLED || "").trim().toLowerCase() === "true";
