import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { getPublicBlog } from "../../api/publicCmsApi";
import SeoMeta from "../../components/common/SeoMeta";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";

const BlogDetails = () => {
  const { slug } = useParams(); const { data } = useOutletContext(); const [post, setPost] = useState(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; getPublicBlog(slug).then((result) => active && setPost(result.data.item)).catch((requestError) => active && setError(requestError.response?.data?.message || "Article not found.")); return () => { active = false; }; }, [slug]);
  if (error) return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-3xl font-bold">{error}</h1><Link to="/blogs" className="mt-5 inline-block text-blue-700">Back to blogs</Link></main>;
  if (!post) return <main className="mx-auto max-w-3xl px-4 py-12"><LoadingSkeleton count={5}/></main>;
  return <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6"><SeoMeta seo={{ title: post.seoTitle || post.title, description: post.seoDescription || post.excerpt, keywords: post.seoKeywords }} defaults={data?.siteSettings?.seo}/><p className="font-bold text-blue-700">{post.category}</p><h1 className="mt-3 text-4xl font-bold leading-tight">{post.title}</h1><p className="mt-4 text-slate-500">By {post.author} · {new Date(post.publishedAt).toLocaleDateString()}</p>{post.coverImage?.url && <img src={post.coverImage.url} alt="" className="mt-8 max-h-[520px] w-full rounded-3xl object-cover"/>}<div className="mt-8 whitespace-pre-wrap text-lg leading-8 text-slate-700">{post.content}</div></article>;
};
export default BlogDetails;
