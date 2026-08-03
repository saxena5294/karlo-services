import { SignIn, SignUp } from "@clerk/react";
import { useSearchParams } from "react-router-dom";
import { safeInternalRedirect } from "../../auth/roleRouting";

const AuthPage = ({ mode }) => {
  const [searchParams] = useSearchParams();
  const isSignUp = mode === "register";
  const requestedRedirect = safeInternalRedirect(searchParams.get("redirect"));
  return <section className="mx-auto flex max-w-5xl flex-col items-center gap-7 px-4 py-12">
    <div className="w-full max-w-md text-center"><h1 className="text-2xl font-bold">{isSignUp ? "Create your Karlo account" : "Sign in to Karlo Services"}</h1><p className="mt-2 text-sm text-slate-500">{isSignUp ? "After verification, choose Customer, Partner, or Expert through secure onboarding." : "Your MongoDB role determines which dashboard opens."}</p></div>
    {isSignUp
      ? <SignUp routing="path" path="/register" signInUrl="/login" forceRedirectUrl="/auth/onboarding" fallbackRedirectUrl="/auth/onboarding" />
      : <SignIn routing="path" path="/login" signUpUrl="/register" forceRedirectUrl={requestedRedirect || "/auth/redirect"} fallbackRedirectUrl="/auth/redirect" />}
  </section>;
};

export default AuthPage;
