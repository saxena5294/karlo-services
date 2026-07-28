import { useEffect } from "react";
import { buildSeoMetadata } from "../../utils/seoMetadata";

const ensureSingleElement = (selector, create) => {
  const matches = [...document.head.querySelectorAll(selector)];
  const element = matches.shift() || create();
  matches.forEach((duplicate) => duplicate.remove());
  if (!element.parentNode) document.head.appendChild(element);
  return element;
};

const setMeta = (selector, identity, content, { removeWhenEmpty = false } = {}) => {
  const existing = [...document.head.querySelectorAll(selector)];
  if (removeWhenEmpty && !content) {
    existing.forEach((element) => element.remove());
    return;
  }
  const element = ensureSingleElement(selector, () => document.createElement("meta"));
  Object.entries(identity).forEach(([key, value]) => element.setAttribute(key, value));
  element.setAttribute("content", content);
};

const setCanonical = (href) => {
  const existing = [...document.head.querySelectorAll('link[rel="canonical"]')];
  if (!href) {
    existing.forEach((element) => element.remove());
    return;
  }
  const element = ensureSingleElement('link[rel="canonical"]', () => document.createElement("link"));
  element.setAttribute("rel", "canonical");
  element.setAttribute("href", href);
};

const SeoMeta = ({ seo, defaults }) => {
  useEffect(() => {
    const metadata = buildSeoMetadata(seo, defaults);
    document.title = metadata.title;
    setMeta('meta[name="description"]', { name: "description" }, metadata.description);
    setMeta('meta[name="keywords"]', { name: "keywords" }, metadata.keywords);
    setMeta('meta[name="robots"]', { name: "robots" }, metadata.robots);
    setMeta('meta[property="og:title"]', { property: "og:title" }, metadata.ogTitle);
    setMeta('meta[property="og:description"]', { property: "og:description" }, metadata.ogDescription);
    setMeta('meta[property="og:image"]', { property: "og:image" }, metadata.ogImage, { removeWhenEmpty: true });
    setMeta('meta[name="twitter:card"]', { name: "twitter:card" }, metadata.twitterCard);
    setMeta('meta[name="twitter:title"]', { name: "twitter:title" }, metadata.ogTitle);
    setMeta('meta[name="twitter:description"]', { name: "twitter:description" }, metadata.ogDescription);
    setMeta('meta[name="twitter:image"]', { name: "twitter:image" }, metadata.ogImage, { removeWhenEmpty: true });
    setCanonical(metadata.canonicalUrl);
  }, [defaults, seo]);

  return null;
};

export default SeoMeta;
