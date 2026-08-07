import { createContext, useContext } from "react";

export const AuthProfileContext = createContext(null);

export const useAuthProfile = () => {
  const context = useContext(AuthProfileContext);
  if (!context) throw new Error("useAuthProfile must be used inside AuthProfileProvider");
  return context;
};

