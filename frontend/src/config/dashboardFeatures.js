const leadMarketplaceEnabled = String(import.meta.env.VITE_LEAD_MARKETPLACE_ENABLED || "").toLowerCase() === "true";

export const dashboardFeatures = Object.freeze({
  softwareDownloads: true,
  declarationForms: true,
  partnerHelpDesk: true,
  supportTickets: true,
  customerSupport: true,
  paymentHistory: true,
  renewal: true,
  referAndEarn: true,
  rewards: true,
  whatsappSupport: true,
  ratings: false,
  leadMarketplace: leadMarketplaceEnabled,
  availableLeads: leadMarketplaceEnabled,
  acceptedLeads: leadMarketplaceEnabled,
  acceptedWork: leadMarketplaceEnabled,
});

export const isDashboardFeatureEnabled = (feature) => dashboardFeatures[feature] === true;
