/**
 * Full-screen loading indicator
 */
export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {/* Animated logo */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 animate-pulse mb-4">
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="8" cy="8" r="3" opacity="0.9"/>
            <circle cx="16" cy="8" r="3" opacity="0.9"/>
            <circle cx="12" cy="16" r="4"/>
          </svg>
        </div>
        
        {/* Loading text */}
        <p className="text-gray-600 animate-pulse">Загрузка...</p>
      </div>
    </div>
  );
}
