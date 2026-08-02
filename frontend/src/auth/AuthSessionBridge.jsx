import { useAuth } from "@clerk/react";
import { useLayoutEffect } from "react";
import { setTokenProvider } from "./clerkToken";

const AuthSessionBridge = ({ children }) => {
  const { getToken } = useAuth();

  useLayoutEffect(() => {
    setTokenProvider(getToken);
    return () => setTokenProvider(null);
  }, [getToken]);

  return children;
};

export default AuthSessionBridge;
