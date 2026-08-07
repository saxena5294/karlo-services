import { useAuth } from "@clerk/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentProfile } from "../api/authApi";
import { AuthProfileContext } from "./authProfileContext";

const emptyProfileState = Object.freeze({
  userId: null,
  loading: false,
  profile: null,
  error: "",
  status: null,
});

const errorMessage = (error) => error.response?.data?.message
  || error.message
  || "Unable to synchronize your account profile.";

export const AuthProfileProvider = ({ children }) => {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const requestSequence = useRef(0);
  const [state, setState] = useState(emptyProfileState);

  const refreshProfile = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !userId) return null;

    const requestId = ++requestSequence.current;

    try {
      const token = await getToken();
      if (!token) throw new Error("Clerk session token is unavailable");
      if (requestSequence.current === requestId) {
        setState((current) => ({
          ...current,
          userId,
          loading: true,
          error: "",
          status: null,
        }));
      }
      const { profile } = await getCurrentProfile(token);
      if (!profile) throw new Error("MongoDB account profile is unavailable");

      if (requestSequence.current === requestId) {
        setState({ userId, loading: false, profile, error: "", status: 200 });
      }
      return profile;
    } catch (error) {
      if (requestSequence.current === requestId) {
        setState({
          userId,
          loading: false,
          profile: null,
          error: errorMessage(error),
          status: error.response?.status || null,
        });
      }
      throw error;
    }
  }, [getToken, isLoaded, isSignedIn, userId]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !userId) {
      requestSequence.current += 1;
      const timeoutId = window.setTimeout(() => setState(emptyProfileState), 0);
      return () => window.clearTimeout(timeoutId);
    }
    const timeoutId = window.setTimeout(() => refreshProfile().catch(() => {}), 0);
    return () => window.clearTimeout(timeoutId);
  }, [isLoaded, isSignedIn, refreshProfile, userId]);

  const value = useMemo(() => ({
    ...(isSignedIn ? state : emptyProfileState),
    loading: !isLoaded || (Boolean(isSignedIn) && (state.loading || state.userId !== userId)),
    refreshProfile,
  }), [isLoaded, isSignedIn, refreshProfile, state, userId]);

  return <AuthProfileContext.Provider value={value}>{children}</AuthProfileContext.Provider>;
};
