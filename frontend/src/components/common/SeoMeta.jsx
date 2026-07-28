import { useEffect } from "react";

const upsertMeta = (selector, attributes) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
};

const SeoMeta = ({ seo = {}, defaults = {} }) => {
  useEffect(() => {
    const title = seo.title || defaults.defaultTitle || "Karlo Services";
    const description = seo.description || defaults.defaultDescription || "";
    document.title = title;
    upsertMeta('meta[name="description"]', { name: "description", content: description });
    upsertMeta('meta[name="keywords"]', { name: "keywords", content: (seo.keywords || defaults.defaultKeywords || []).join(", ") });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: seo.ogTitle || title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: seo.ogDescription || description });
    upsertMeta('meta[name="robots"]', { name: "robots", content: `${seo.noIndex ? "noindex" : "index"},${seo.noFollow ? "nofollow" : "follow"}` });
    const image = seo.ogImage?.url || defaults.defaultImage?.url;
    if (image) upsertMeta('meta[property="og:image"]', { property: "og:image", content: image });
    if (seo.canonicalUrl) {
      let canonical = document.head.querySelector('link[rel="canonical"]');
      if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
      canonical.href = seo.canonicalUrl;
    }
  }, [defaults, seo]);
  return null;
};

export default SeoMeta;
