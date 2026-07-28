import { useState } from "react";
import BannerManager from "./BannerManager";
import FaqManager from "./FaqManager";
import HomepageEditor from "./HomepageEditor";
import SiteSettingsEditor from "./SiteSettingsEditor";
import TestimonialManager from "./TestimonialManager";
import DashboardResourceManager from "./DashboardResourceManager";
import ExtendedCollectionManager from "./ExtendedCollectionManager";
import { blogApi, categoryApi, noticeApi, seoApi } from "../../../api/adminCmsApi";
import { Link } from "react-router-dom";

const ServicesCmsLink = () => <div className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Services and Popular Services</h2><p className="mt-2 text-slate-600">Create services, manage pricing and forms, upload images, change order, and mark popular services from the existing service workspace.</p><Link to="/admin/services" className="mt-5 inline-flex rounded-xl bg-blue-700 px-5 py-2.5 font-semibold text-white">Open Services</Link></div>;
const CategoryManager = () => <ExtendedCollectionManager type="category" api={categoryApi}/>;
const NoticeManager = () => <ExtendedCollectionManager type="notice" api={noticeApi}/>;
const BlogManager = () => <ExtendedCollectionManager type="blog" api={blogApi}/>;
const SeoManager = () => <ExtendedCollectionManager type="seo" api={seoApi}/>;

const tabs = [
  { key: "services", label: "Services", component: ServicesCmsLink },
  { key: "categories", label: "Categories", component: CategoryManager },
  { key: "homepage", label: "Homepage", component: HomepageEditor },
  { key: "banners", label: "Banners", component: BannerManager },
  { key: "testimonials", label: "Testimonials", component: TestimonialManager },
  { key: "faqs", label: "FAQs", component: FaqManager },
  { key: "notices", label: "Notices", component: NoticeManager },
  { key: "blogs", label: "Blogs", component: BlogManager },
  { key: "site-settings", label: "Contact, Footer & Settings", component: SiteSettingsEditor },
  { key: "seo", label: "SEO", component: SeoManager },
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
