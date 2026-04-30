import { Outlet } from 'react-router-dom';

/**
 * Layout for authentication pages
 */
export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 mb-4">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="8" cy="8" r="3" opacity="0.9"/>
              <circle cx="16" cy="8" r="3" opacity="0.9"/>
              <circle cx="12" cy="16" r="4"/>
              <line x1="8" y1="11" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="16" y1="11" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Context Builder</h1>
          <p className="text-gray-600 mt-1">Конструктор контекста</p>
        </div>

        {/* Auth form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Outlet />
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Визуальная надстройка над LLM с кросс-чатовым объединением памяти
        </p>
      </div>
    </div>
  );
}
