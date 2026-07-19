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
  availableLeads: false,
  acceptedLeads: false,
  acceptedWork: false,
});

export const isDashboardFeatureEnabled = (feature) => dashboardFeatures[feature] === true;
