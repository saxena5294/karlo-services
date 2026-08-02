import { useAuth } from "@clerk/react";
import { useEffect } from "react";
import { setTokenProvider } from "./clerkToken";

const AuthSessionBridge = ({ children }) => {
  const { getToken } = useAuth();

  useEffect(() => {
    setTokenProvider(getToken);
    return () => setTokenProvider(null);
  }, [getToken]);

  return children;
};

export default AuthSessionBridge;
