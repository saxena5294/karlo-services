import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPublicHomepage } from "../../api/publicCmsApi";

const RefundPolicy = () => {
  const [text, setText] = useState("");
  useEffect(() => { let active = true; getPublicHomepage().then((result) => active && setText(result.data?.siteSettings?.legal?.refundDisclaimer || "")).catch(() => {}); return () => { active = false; }; }, []);
  return <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16"><Link to="/faq" className="font-bold text-blue-700">← Back to FAQs</Link><section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm sm:p-10"><h1 className="text-3xl font-bold">Refund Policy</h1>{text ? <p className="mt-5 whitespace-pre-line leading-8 text-slate-600">{text}</p> : <p className="mt-5 text-slate-600">The refund policy is being updated. Contact support for service-specific information.</p>}<p className="mt-6 text-sm text-slate-500">For a service-specific review, contact support with your application and transaction references. Never include a banking PIN, password, or OTP.</p></section></main>;
};
export default RefundPolicy;
