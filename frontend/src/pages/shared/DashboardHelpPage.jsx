import FaqBrowser from "../../components/faq/FaqBrowser";
import HelpSupport from "./HelpSupport";

const DashboardHelpPage = ({ portal }) => <div className="space-y-7"><section><h1 className="text-2xl font-bold">Help Centre</h1><p className="mt-1 text-slate-500">Search managed FAQs before contacting support or raising a ticket.</p></section><FaqBrowser audience={portal === "partner" ? "partner" : "customer"} compact /><HelpSupport portal={portal} /></div>;
export default DashboardHelpPage;
