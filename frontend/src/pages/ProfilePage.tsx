import { useAuthStore } from '@store/authStore';
import { useTariffStore } from '@store/tariffStore';
import { useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { UserCircleIcon, EnvelopeIcon, CalendarIcon } from '@heroicons/react/24/outline';

/**
 * User profile page
 */
export default function ProfilePage() {
  const { user } = useAuthStore();
  const { status, loadStatus } = useTariffStore();

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Профиль</h1>

      {/* User info card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.nickname || 'Avatar'}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <UserCircleIcon className="w-10 h-10 text-primary-600" />
            )}
          </div>
          
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">
              {user.nickname || 'Пользователь'}
            </h2>
            
            <div className="mt-2 space-y-1">
              <div className="flex items-center text-gray-600">
                <EnvelopeIcon className="w-4 h-4 mr-2" />
                {user.email}
              </div>
              <div className="flex items-center text-gray-600">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Регистрация: {format(new Date(user.created_at), 'd MMMM yyyy', { locale: ru })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription info */}
      {status && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Подписка</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Тариф</p>
              <p className="text-lg font-semibold text-gray-900">{status.planName}</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Запросов осталось</p>
              <p className="text-lg font-semibold text-gray-900">
                {status.plan === 'yearly' ? '∞' : status.queriesRemaining}
              </p>
            </div>
            
            {status.dailyBonus > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Ежедневный бонус</p>
                <p className="text-lg font-semibold text-gray-900">+{status.dailyBonus}</p>
              </div>
            )}
            
            {status.expiresAt && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Действует до</p>
                <p className="text-lg font-semibold text-gray-900">
                  {format(new Date(status.expiresAt), 'd MMM yyyy', { locale: ru })}
                </p>
              </div>
            )}
          </div>

          {/* Features */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Возможности тарифа:</h4>
            <ul className="space-y-1">
              {status.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
