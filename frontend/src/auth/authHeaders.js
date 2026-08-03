export const clerkSessionHeaders = (token) => {
  const sessionToken = typeof token === "string" ? token.trim() : "";
  return sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {};
};

export const normalizeCurrentUserResponse = (data) => ({
  ...data,
  profile: data?.user || data?.profile || null,
});
