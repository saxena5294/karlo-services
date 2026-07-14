import { Link } from "react-router-dom";

const AuthPlaceholder = ({ mode }) => <section className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6"><div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"><h1 className="text-3xl font-bold">{mode === "login" ? "Login" : "Registration"} coming soon</h1><p className="mt-4 leading-7 text-slate-600">Account access will be enabled later with Clerk. You can browse, apply, and track an application without an account.</p><Link to="/services" className="mt-7 inline-block rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white">Browse services</Link></div></section>;

export default AuthPlaceholder;
