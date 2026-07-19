import { ChevronDown, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const FaqAccordion = ({ items = [] }) => {
  const [openId, setOpenId] = useState(null);
  return <div className="space-y-3">{items.map((item) => {
    const open = openId === item._id;
    const related = items.filter((candidate) => candidate._id !== item._id && candidate.category === item.category).slice(0, 3);
    return <article key={item._id} id={`faq-${item._id}`} className={`overflow-hidden rounded-2xl border bg-white transition ${open ? "border-blue-300 shadow-sm" : "border-slate-200"}`}><h3><button type="button" aria-expanded={open} aria-controls={`faq-answer-${item._id}`} onClick={() => setOpenId(open ? null : item._id)} className="flex min-h-16 w-full items-center justify-between gap-4 p-4 text-left font-bold text-slate-900 sm:p-5"><span className="flex items-start gap-2">{item.isFeatured && <Star size={18} className="mt-0.5 shrink-0 fill-amber-400 text-amber-500" aria-label="Featured question" />}{item.question}</span><ChevronDown className={`shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} /></button></h3><div id={`faq-answer-${item._id}`} className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}><div className="overflow-hidden"><div className="border-t border-slate-100 px-4 pb-5 pt-4 sm:px-5"><p className="whitespace-pre-line text-sm leading-7 text-slate-600 sm:text-base">{item.answer}</p>{item.category === "Refund" && <Link to="/refund-policy" className="mt-4 inline-flex font-bold text-blue-700 underline">Read Full Refund Policy</Link>}{related.length > 0 && <div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Related questions</p><div className="mt-2 space-y-2">{related.map((question) => <button key={question._id} type="button" onClick={() => { setOpenId(question._id); requestAnimationFrame(() => document.getElementById(`faq-${question._id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })); }} className="block text-left text-sm font-semibold text-blue-700 hover:underline">{question.question}</button>)}</div></div>}</div></div></div></article>;
  })}</div>;
};

export default FaqAccordion;
