export default function TeamLoading() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="skeleton h-8 w-48 bg-gray-700/80 rounded-lg mb-2" />
        <div className="skeleton h-4 w-72 max-w-full bg-gray-800/60 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-gray-700 bg-gray-800/60 p-6">
            <div className="flex items-center gap-5">
              <div className="skeleton w-20 h-20 rounded-full bg-gray-700/80" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="skeleton w-8 h-8 rounded-full bg-gray-700/80" />
                  <div className="skeleton h-5 w-24 bg-gray-700/80 rounded" />
                </div>
                <div className="space-y-2 mt-3">
                  <div className="flex justify-between">
                    <div className="skeleton h-3 w-16 bg-gray-800/60 rounded" />
                    <div className="skeleton h-3 w-20 bg-gray-800/60 rounded" />
                  </div>
                  <div className="flex justify-between">
                    <div className="skeleton h-3 w-24 bg-gray-800/60 rounded" />
                    <div className="skeleton h-3 w-8 bg-gray-800/60 rounded" />
                  </div>
                </div>
                <div className="mt-3 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="skeleton h-full w-1/4 bg-amber-500/30 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
