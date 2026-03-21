export default function UnitLoading() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex gap-1.5 mb-6 flex-wrap">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className={`w-3 h-3 rounded-full ${i === 1 ? "skeleton bg-amber-400/40" : "bg-gray-700/50"}`} />
        ))}
      </div>
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6">
        <div className="flex gap-3 mb-4">
          <div className="skeleton h-4 w-12 bg-gray-700/80 rounded" />
          <div className="skeleton h-5 w-16 bg-amber-400/20 rounded-full" />
          <div className="skeleton h-5 w-24 bg-gray-700/70 rounded-full" />
        </div>
        <div className="skeleton h-6 w-full bg-gray-700/80 rounded mb-4" />
        <div className="h-[550px] bg-gray-900 rounded-lg border border-gray-700 mb-4 flex items-center justify-center">
          <div className="skeleton h-8 w-48 bg-gray-800/60 rounded" />
        </div>
        <div className="skeleton h-10 w-32 bg-amber-600/40 rounded-lg" />
      </div>
    </div>
  );
}
