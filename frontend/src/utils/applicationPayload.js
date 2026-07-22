export const appendSelectedVariant = (payload, variant) => {
  const key = typeof variant?.key === "string" ? variant.key.trim() : "";
  if (key) payload.append("variantKey", key);
  return payload;
};
