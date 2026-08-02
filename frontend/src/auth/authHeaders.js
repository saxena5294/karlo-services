export const clerkSessionHeaders = (token) => {
  const sessionToken = typeof token === "string" ? token.trim() : "";
  return sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {};
};
