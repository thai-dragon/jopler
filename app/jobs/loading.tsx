export default function JobsLoading() {
  return (
    <main className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="skeleton h-8 w-24 bg-gray-700/80 rounded-lg" />
        <div className="flex gap-3">
          <div className="skeleton h-9 w-28 bg-gray-800/70 rounded-lg" />
          <div className="skeleton h-9 w-24 bg-gray-800/70 rounded-lg" />
          <div className="skeleton h-9 w-24 bg-gray-800/70 rounded-lg" />
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/50">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <th key={i} className="py-3 px-3 text-left">
                  <div className="skeleton h-4 w-14 bg-gray-700/70 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <tr key={i} className="border-b border-gray-800/50">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((j) => (
                  <td key={j} className="py-2.5 px-3">
                    <div className={`skeleton h-4 bg-gray-800/60 rounded ${j === 2 ? "w-40" : j === 9 ? "w-24" : "w-20"}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
