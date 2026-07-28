import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { getPublicHomepage } from "../../api/publicCmsApi";
import Footer from "./Footer";
import Navbar from "./Navbar";

const PublicLayout = () => {
  const [cms, setCms] = useState({ data: null, loading: true, error: "" });
  useEffect(() => { let active = true; getPublicHomepage().then((response) => active && setCms({ data: response.data, loading: false, error: "" })).catch(() => active && setCms({ data: null, loading: false, error: "CMS content is temporarily unavailable." })); return () => { active = false; }; }, []);
  return (
  <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
    <Navbar />
    {cms.data?.siteSettings?.general?.announcementBar?.isActive && cms.data.siteSettings.general.announcementBar.text && (
      <div className="bg-blue-700 px-4 py-2 text-center text-sm font-semibold text-white">
        {cms.data.siteSettings.general.announcementBar.link
          ? <a href={cms.data.siteSettings.general.announcementBar.link} className="underline">{cms.data.siteSettings.general.announcementBar.text}</a>
          : cms.data.siteSettings.general.announcementBar.text}
      </div>
    )}
    <main className="flex-1">
    <Outlet context={cms} />
    </main>
    <Footer settings={cms.data?.siteSettings} />
  </div>
  );
};

export default PublicLayout;
