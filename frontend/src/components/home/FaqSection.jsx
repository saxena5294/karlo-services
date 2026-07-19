import { Link } from "react-router-dom";
import FaqAccordion from "../faq/FaqAccordion";
const FaqSection = ({ items = [] }) => items.length ? <section className="py-16"><div className="mx-auto max-w-4xl px-4 sm:px-6"><div className="text-center"><p className="font-semibold text-blue-700">Help Centre</p><h2 className="mt-2 text-3xl font-bold">Frequently Asked Questions</h2></div><div className="mt-10"><FaqAccordion items={items} /></div><div className="mt-7 text-center"><Link to="/faq" className="inline-flex min-h-12 items-center rounded-xl border-2 border-blue-700 px-6 py-3 font-bold text-blue-700">View all FAQs</Link></div></div></section> : null;
export default FaqSection;
