export const CUSTOMER_DOCUMENT_TYPES = Object.freeze([
  ["aadhaar-card", "Aadhaar Card"],
  ["pan-card", "PAN Card"],
  ["passport", "Passport"],
  ["voter-id", "Voter ID"],
  ["driving-licence", "Driving Licence"],
  ["ration-card", "Ration Card"],
  ["birth-certificate", "Birth Certificate"],
  ["income-certificate", "Income Certificate"],
  ["caste-certificate", "Caste Certificate"],
  ["domicile-certificate", "Domicile Certificate"],
  ["bank-passbook", "Bank Passbook"],
  ["bank-statement", "Bank Statement"],
  ["salary-slip", "Salary Slip"],
  ["photograph", "Photograph"],
  ["signature", "Signature"],
  ["educational-certificate", "Educational Certificate"],
  ["address-proof", "Address Proof"],
  ["identity-proof", "Identity Proof"],
  ["application-receipt", "Application Receipt"],
  ["other", "Other"],
].map(([value, label]) => Object.freeze({ value, label })));

export const CUSTOMER_DOCUMENT_TYPE_VALUES = Object.freeze(
  CUSTOMER_DOCUMENT_TYPES.map(({ value }) => value)
);

export const DOCUMENT_VERIFICATION_STATUSES = Object.freeze([
  "pending",
  "under_review",
  "verified",
  "rejected",
  "reupload_required",
]);

export const DOCUMENT_EXPIRY_STATUSES = Object.freeze([
  "valid",
  "expiring_soon",
  "expired",
  "no_expiry",
]);
