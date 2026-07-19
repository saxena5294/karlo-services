import { useEffect, useState } from "react";
import { getDashboardContent } from "../../api/publicCmsApi";

const isSafeLink = (value = "") => value.startsWith("/") || /^https:\/\//i.test(value);

const AdvertisementBanner = ({ onContent }) => {
  const [banners, setBanners] = useState([]);
  useEffect(() => { let active = true; getDashboardContent().then(({ data }) => { if (active) { setBanners(data?.banners || []); onContent?.(data); } }).catch(() => {}); return () => { active = false; }; }, [onContent]);
  if (!banners.length) return null;
  return <section aria-label="Advertisements" className="grid gap-4 lg:grid-cols-2">{banners.map((banner) => {
    const content = <><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Featured</p><h2 className="mt-2 text-xl font-bold">{banner.title}</h2>{banner.description && <p className="mt-2 text-sm leading-6 text-slate-600">{banner.description}</p>}{banner.buttonText && <span className="mt-4 inline-block text-sm font-semibold text-blue-700">{banner.buttonText} →</span>}</div>{banner.image?.url && <img src={banner.image.url} alt="" className="h-28 w-full rounded-xl object-cover sm:w-48" loading="lazy" />}</>;
    const className = "flex flex-col-reverse gap-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center";
    return banner.buttonLink && isSafeLink(banner.buttonLink) ? <a key={banner._id} href={banner.buttonLink} target={banner.buttonLink.startsWith("http") ? "_blank" : undefined} rel={banner.buttonLink.startsWith("http") ? "noopener noreferrer" : undefined} className={className}>{content}</a> : <article key={banner._id} className={className}>{content}</article>;
  })}</section>;
};

export default AdvertisementBanner;
