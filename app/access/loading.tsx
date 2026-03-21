export default function AccessLoading() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="skeleton h-8 w-40 bg-gray-700/80 rounded-lg mb-2" />
      <div className="skeleton h-4 w-64 bg-gray-800/60 rounded mb-6" />
      <div className="flex gap-2 mb-6">
        <div className="skeleton flex-1 h-10 bg-gray-900 border border-gray-700 rounded-lg" />
        <div className="skeleton h-10 w-16 bg-amber-600/40 rounded-lg" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
            <div className="skeleton h-4 w-48 bg-gray-800/60 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
