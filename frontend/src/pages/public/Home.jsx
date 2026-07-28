import { useOutletContext } from "react-router-dom";
import SeoMeta from "../../components/common/SeoMeta";
import BannerSection from "../../components/home/BannerSection";
import BlogHighlights from "../../components/home/BlogHighlights";
import CategorySection from "../../components/home/CategorySection";
import FaqSection from "../../components/home/FaqSection";
import HeroSection from "../../components/home/HeroSection";
import HowItWorks from "../../components/home/HowItWorks";
import NoticeBar from "../../components/home/NoticeBar";
import PopularServices from "../../components/home/PopularServices";
import Testimonials from "../../components/home/Testimonials";

const Home = () => {
  const { data, loading, error } = useOutletContext();
  const visibility = data?.sectionVisibility || {};
  const sections = {
    hero: <HeroSection hero={data?.hero} />,
    banners: <BannerSection banners={data?.banners} />,
    featuredServices: <PopularServices services={data ? data.featuredServices : undefined} />,
    howItWorks: <HowItWorks />,
    testimonials: <Testimonials items={data?.testimonials} />,
    faqs: <FaqSection items={data?.faqs} />,
  };
  const order = data?.sectionOrder?.length
    ? data.sectionOrder
    : ["hero", "featuredServices", "howItWorks", "testimonials", "faqs"];

  return (
    <>
      <SeoMeta defaults={data?.siteSettings?.seo} seo={data?.seo} />
      <NoticeBar notices={data?.notices} />
      {loading && <div className="mx-auto max-w-7xl px-4 py-3 text-sm text-slate-500">Loading the latest content…</div>}
      {error && <div className="mx-auto max-w-7xl px-4 py-3 text-sm text-amber-700">{error} Showing the standard homepage.</div>}
      {order.map((key) => (
        data && visibility[key] === false ? null : <div key={key}>{sections[key]}</div>
      ))}
      <CategorySection items={data?.categories} />
      <BlogHighlights items={data?.featuredBlogs} />
    </>
  );
};

export default Home;
