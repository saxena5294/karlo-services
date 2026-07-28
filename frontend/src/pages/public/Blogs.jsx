import { useEffect, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { getPublicBlogs, getPublicSeo } from "../../api/publicCmsApi";
import SeoMeta from "../../components/common/SeoMeta";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";

const Blogs = () => {
  const { data } = useOutletContext(); const [params, setParams] = useSearchParams(); const [result, setResult] = useState(null); const [seo, setSeo] = useState({}); const search = params.get("search") || "";
  useEffect(() => { let active = true; Promise.all([getPublicBlogs({ search }), getPublicSeo("blogs").catch(() => ({ data: {} }))]).then(([blogs, meta]) => { if (active) { setResult(blogs.data); setSeo(meta.data.item || {}); } }); return () => { active = false; }; }, [search]);
  return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><SeoMeta seo={seo} defaults={data?.siteSettings?.seo}/><header className="max-w-3xl"><p className="font-bold text-blue-700">Karlo resources</p><h1 className="mt-2 text-4xl font-bold">Guides and updates</h1><p className="mt-3 text-slate-600">Practical information about government, financial, and digital services.</p></header><input type="search" value={search} onChange={(event) => setParams(event.target.value ? { search: event.target.value } : {})} placeholder="Search articles" className="mt-8 w-full max-w-md rounded-xl border px-4 py-3"/>{!result ? <div className="mt-8"><LoadingSkeleton count={6}/></div> : !result.items.length ? <EmptyState title="No articles found" description="Try a different search."/> : <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{result.items.map((item) => <article key={item._id} className="overflow-hidden rounded-2xl border bg-white shadow-sm">{item.coverImage?.url && <img src={item.coverImage.url} alt="" className="h-48 w-full object-cover"/>}<div className="p-5"><p className="text-xs font-bold uppercase text-blue-700">{item.category}</p><h2 className="mt-2 text-xl font-bold">{item.title}</h2><p className="mt-2 line-clamp-3 text-sm text-slate-600">{item.excerpt}</p><Link to={`/blogs/${item.slug}`} className="mt-4 inline-flex font-semibold text-blue-700">Read article →</Link></div></article>)}</div>}</main>;
};
export default Blogs;
