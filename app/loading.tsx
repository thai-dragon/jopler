export default function Loading() {
  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="skeleton h-9 w-48 bg-gray-700/80 rounded-lg mb-2" />
      <div className="skeleton h-5 w-96 max-w-full bg-gray-800/60 rounded mb-8" />
      <div className="flex gap-4 mb-8">
        <div className="skeleton h-12 w-32 bg-gray-700/80 rounded-lg" />
        <div className="skeleton h-12 w-40 bg-gray-700/80 rounded-lg" />
      </div>
    </main>
  );
}
