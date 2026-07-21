const commonFields = (form) => [
  { name: "applicantName", label: "Applicant Name", labelHindi: "आवेदक का नाम", type: "text", required: true, minLength: 2, maxLength: 120, section: "basic", order: -30, helpText: "Enter your name as shown on your documents." },
  { name: "mobileNumber", label: "Mobile Number", labelHindi: "मोबाइल नंबर", type: "tel", required: true, minLength: 10, maxLength: 10, section: "basic", order: -20, helpText: "Enter a 10-digit Indian mobile number starting with 6, 7, 8, or 9." },
  { name: "email", label: "Email Address", labelHindi: "ईमेल पता", type: "email", required: Boolean(form.requireEmail), maxLength: 254, section: "basic", order: -10, helpText: form.requireEmail ? "Email is required for this service." : "Optional / वैकल्पिक" },
];

// Hide the original seed's generic profile fields. The stepper owns these values,
// while service-specific requirements (including identityDocument) remain intact.
const reserved = new Set([
  "applicantName", "fullName", "mobileNumber", "mobile", "email",
  "dateOfBirth", "preferredContact", "address", "documentType",
  "additionalDetails", "termsAccepted", "captchaToken",
  "mobileVerificationToken", "additionalDocumentLabels",
]);
export const getEffectiveFields = (form) => {
  const configured = (form.fields || []).filter(({ name }) => !reserved.has(name));
  return [...commonFields(form), ...configured].sort((left, right) => (left.order || 0) - (right.order || 0));
};

export const conditionalMatches = (conditional, values) => {
  if (!conditional?.field) return true;
  const actual = values[conditional.field]; const expected = conditional.value;
  if (conditional.operator === "not_equals") return String(actual ?? "") !== String(expected ?? "");
  if (conditional.operator === "in") return (Array.isArray(expected) ? expected : [expected]).map(String).includes(String(actual ?? ""));
  return String(actual ?? "") === String(expected ?? "");
};
