export const FALLBACK_SEO = Object.freeze({
  title: "Karlo Services",
  description: "Digital Government and Online Services",
  keywords: "",
  canonicalUrl: "",
  robots: "index,follow",
  ogTitle: "Karlo Services",
  ogDescription: "Digital Government and Online Services",
  ogImage: "",
  twitterCard: "summary_large_image",
});

const text = (value) => typeof value === "string" ? value.trim() : "";

const keywords = (value) => {
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(", ");
  return text(value);
};

const imageUrl = (value) => text(typeof value === "string" ? value : value?.url);

export const buildSeoMetadata = (seo, siteDefaults) => {
  const page = seo && typeof seo === "object" ? seo : {};
  const defaults = siteDefaults && typeof siteDefaults === "object" ? siteDefaults : {};
  const title = text(page.title) || text(defaults.defaultTitle) || FALLBACK_SEO.title;
  const description = text(page.description) || text(defaults.defaultDescription) || FALLBACK_SEO.description;
  const keywordValue = keywords(page.keywords) || keywords(defaults.defaultKeywords);
  const robots = text(page.robots) || `${page.noIndex === true ? "noindex" : "index"},${page.noFollow === true ? "nofollow" : "follow"}`;

  return {
    title,
    description,
    keywords: keywordValue,
    canonicalUrl: text(page.canonicalUrl || page.canonical),
    robots: robots || FALLBACK_SEO.robots,
    ogTitle: text(page.ogTitle) || title,
    ogDescription: text(page.ogDescription) || description,
    ogImage: imageUrl(page.ogImage) || imageUrl(defaults.defaultImage),
    twitterCard: text(page.twitterCard || defaults.twitterCardType) || FALLBACK_SEO.twitterCard,
  };
};
