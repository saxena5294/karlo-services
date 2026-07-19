import { useState } from "react";
import BannerManager from "./BannerManager";
import FaqManager from "./FaqManager";
import HomepageEditor from "./HomepageEditor";
import SiteSettingsEditor from "./SiteSettingsEditor";
import TestimonialManager from "./TestimonialManager";
import DashboardResourceManager from "./DashboardResourceManager";

const tabs = [
  { key: "homepage", label: "Homepage", component: HomepageEditor },
  { key: "site-settings", label: "Site Settings", component: SiteSettingsEditor },
  { key: "banners", label: "Banners", component: BannerManager },
  { key: "faqs", label: "FAQs", component: FaqManager },
  { key: "testimonials", label: "Testimonials", component: TestimonialManager },
  { key: "dashboard-resources", label: "Dashboard Resources", component: DashboardResourceManager },
];

const ContentManagementPage = () => {
  const [activeTab, setActiveTab] = useState("homepage");
  const active = tabs.find(({ key }) => key === activeTab) || tabs[0];
  const ActiveEditor = active.component;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Content management</h1>
        <p className="mt-1 text-slate-500">Draft, schedule, preview, and publish public website content.</p>
      </header>
      <div className="overflow-x-auto border-b" role="tablist" aria-label="CMS sections">
        <div className="flex min-w-max gap-2">
          {tabs.map(({ key, label }) => (
            <button key={key} type="button" role="tab" aria-selected={activeTab === key} aria-controls={`cms-panel-${key}`} onClick={() => setActiveTab(key)} className={`rounded-t-xl px-4 py-3 text-sm font-semibold ${activeTab === key ? "bg-blue-700 text-white" : "bg-white text-slate-600"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div id={`cms-panel-${active.key}`} role="tabpanel">
        <ActiveEditor />
      </div>
    </div>
  );
};

export default ContentManagementPage;
