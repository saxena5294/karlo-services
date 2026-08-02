import { SignIn, SignUp } from "@clerk/react";
import { useState } from "react";

const roles = [
  { value: "customer", label: "Customer", note: "Immediate access" },
  { value: "partner", label: "Partner", note: "Admin approval required" },
  { value: "expert", label: "Expert", note: "Admin approval required" },
];

const AuthPage = ({ mode }) => {
  const [role, setRole] = useState("customer");
  const isSignUp = mode === "register";
  return <section className="mx-auto flex max-w-5xl flex-col items-center gap-7 px-4 py-12">
    {isSignUp && <div className="w-full max-w-md"><h1 className="text-center text-2xl font-bold">Create your Karlo account</h1><p className="mt-2 text-center text-sm text-slate-500">Choose how you plan to use Karlo Services.</p><div className="mt-5 grid grid-cols-3 gap-2">{roles.map((item) => <button key={item.value} type="button" onClick={() => setRole(item.value)} className={`rounded-xl border p-3 text-left text-sm ${role === item.value ? "border-blue-700 bg-blue-50 text-blue-800" : "border-slate-200 bg-white"}`}><span className="block font-semibold">{item.label}</span><span className="mt-1 block text-xs opacity-75">{item.note}</span></button>)}</div></div>}
    {isSignUp
      ? <SignUp routing="path" path="/register" signInUrl="/login" fallbackRedirectUrl={`/auth/complete?role=${role}`} />
      : <SignIn routing="path" path="/login" signUpUrl="/register" fallbackRedirectUrl="/auth/complete" />}
  </section>;
};

export default AuthPage;
