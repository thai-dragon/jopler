export default function SummaryLoading() {
  return (
    <main className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="skeleton h-8 w-64 bg-gray-700/80 rounded-lg mb-2" />
          <div className="skeleton h-4 w-40 bg-gray-800/60 rounded" />
        </div>
        <div className="skeleton h-10 w-28 bg-amber-600/40 rounded-lg" />
      </div>
      <div className="px-12 space-y-10">
        <div className="mb-10 px-12 py-8 bg-gray-900/80 border border-amber-800/40 rounded-lg">
          <div className="skeleton h-4 w-40 bg-amber-400/20 rounded mb-2" />
          <div className="space-y-2 mt-4">
            <div className="skeleton h-4 w-full bg-gray-800/60 rounded" />
            <div className="skeleton h-4 w-[90%] bg-gray-800/60 rounded" />
            <div className="skeleton h-4 w-[80%] bg-gray-800/60 rounded" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <section key={i} className="px-12 py-8 bg-gray-900/80 border border-gray-800 rounded-lg">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="skeleton h-6 w-48 bg-gray-700/80 rounded mb-1" />
                <div className="skeleton h-4 w-32 bg-gray-800/60 rounded" />
              </div>
              <div className="skeleton h-5 w-24 bg-green-400/20 rounded" />
            </div>
            <div className="mb-6 pl-2">
              <div className="skeleton h-4 w-44 bg-gray-700/70 rounded mb-3" />
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="skeleton h-2 w-20 bg-gray-800/60 rounded flex-1" />
                    <div className="skeleton h-4 w-8 bg-gray-800/60 rounded" />
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-4 pl-2">
              <div className="skeleton h-4 w-36 bg-gray-700/70 rounded mb-2" />
              <div className="space-y-1.5 ml-5">
                <div className="skeleton h-4 w-full bg-gray-800/60 rounded" />
                <div className="skeleton h-4 w-[85%] bg-gray-800/60 rounded" />
                <div className="skeleton h-4 w-[75%] bg-gray-800/60 rounded" />
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
