export default function TrainingLoading() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="skeleton h-9 w-64 bg-gray-700/80 rounded-lg mb-2" />
          <div className="skeleton h-4 w-80 max-w-full bg-gray-800/60 rounded" />
        </div>
        <div className="skeleton h-10 w-36 bg-amber-600/40 rounded-lg" />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-800/60 rounded-lg p-4 text-center border border-gray-700/50">
            <div className="skeleton h-8 w-12 bg-gray-700/80 rounded mx-auto mb-2" />
            <div className="skeleton h-4 w-16 bg-gray-800/60 rounded mx-auto" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border-2 border-gray-700 bg-gray-800/40 p-5">
            <div className="flex justify-between mb-3">
              <div className="skeleton h-6 w-32 bg-gray-700/80 rounded" />
              <div className="skeleton h-5 w-20 bg-amber-400/20 rounded-full" />
            </div>
            <div className="skeleton h-4 w-full bg-gray-800/60 rounded mb-2" />
            <div className="skeleton h-4 w-[75%] bg-gray-800/60 rounded mb-4" />
            <div className="flex justify-between text-xs mb-2">
              <div className="skeleton h-3 w-20 bg-gray-800/60 rounded" />
              <div className="skeleton h-3 w-16 bg-gray-800/60 rounded" />
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div className="skeleton h-full w-1/3 bg-amber-500/30 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
