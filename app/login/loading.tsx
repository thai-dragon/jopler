export default function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="skeleton h-10 w-32 bg-gray-700/80 rounded-lg mx-auto mb-2" />
          <div className="skeleton h-4 w-64 bg-gray-800/60 rounded mx-auto" />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
          <div className="skeleton h-12 w-full bg-gray-800/60 rounded-lg mb-3" />
          <div className="skeleton h-10 w-full bg-gray-800/50 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
