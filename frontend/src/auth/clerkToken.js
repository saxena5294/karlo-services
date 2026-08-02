let tokenProvider = async () => window.Clerk?.session?.getToken?.() || null;

export const setTokenProvider = (provider) => {
  tokenProvider = typeof provider === "function" ? provider : async () => null;
};

export const getClerkToken = () => tokenProvider();
