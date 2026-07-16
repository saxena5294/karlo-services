const LoadingSkeleton = ({ count = 3 }) => (
  <div className="space-y-4" aria-label="Loading content" role="status">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
        <div className="h-4 w-1/3 rounded bg-slate-200" />
        <div className="mt-4 h-3 w-2/3 rounded bg-slate-100" />
        <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
      </div>
    ))}
    <span className="sr-only">Loading...</span>
  </div>
);

export default LoadingSkeleton;
