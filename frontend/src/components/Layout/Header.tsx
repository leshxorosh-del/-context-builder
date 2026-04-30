import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
  MapIcon,
  UserCircleIcon,
  CreditCardIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@store/authStore';
import { useTariffStore } from '@store/tariffStore';
import { useEffect } from 'react';
import clsx from 'clsx';

/**
 * Application header with navigation
 */
export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { status, loadStatus } = useTariffStore();

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Карта проекта', href: '/map', icon: MapIcon },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Navigation */}
          <div className="flex items-center space-x-8">
            <Link to="/map" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="8" cy="8" r="2.5"/>
                  <circle cx="16" cy="8" r="2.5"/>
                  <circle cx="12" cy="15" r="3"/>
                </svg>
              </div>
              <span className="font-semibold text-gray-900">Context Builder</span>
            </Link>

            <nav className="hidden md:flex space-x-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <item.icon className="w-5 h-5 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-4">
            {/* Quota indicator */}
            {status && (
              <Link
                to="/tariffs"
                className={clsx(
                  'hidden sm:flex items-center px-3 py-1.5 rounded-full text-sm font-medium',
                  status.queriesRemaining > 20
                    ? 'bg-success-50 text-success-600'
                    : status.queriesRemaining > 5
                    ? 'bg-warning-50 text-warning-600'
                    : 'bg-error-50 text-error-600'
                )}
              >
                <span className="mr-1">Запросов:</span>
                <span className="font-bold">
                  {status.plan === 'yearly' ? '∞' : status.queriesRemaining}
                </span>
                {status.dailyBonus > 0 && (
                  <span className="ml-1 text-xs opacity-75">+{status.dailyBonus}/день</span>
                )}
              </Link>
            )}

            {/* User menu */}
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-700">
                    {user?.nickname?.[0] || user?.email?.[0] || 'U'}
                  </span>
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700">
                  {user?.nickname || user?.email?.split('@')[0]}
                </span>
                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
              </Menu.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 focus:outline-none">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.nickname || 'Пользователь'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                  </div>

                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to="/profile"
                          className={clsx(
                            'flex items-center px-4 py-2 text-sm',
                            active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                          )}
                        >
                          <UserCircleIcon className="w-5 h-5 mr-3 text-gray-400" />
                          Профиль
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to="/tariffs"
                          className={clsx(
                            'flex items-center px-4 py-2 text-sm',
                            active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                          )}
                        >
                          <CreditCardIcon className="w-5 h-5 mr-3 text-gray-400" />
                          Тарифы
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to="/settings/notifications"
                          className={clsx(
                            'flex items-center px-4 py-2 text-sm',
                            active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                          )}
                        >
                          <BellIcon className="w-5 h-5 mr-3 text-gray-400" />
                          Уведомления
                        </Link>
                      )}
                    </Menu.Item>
                  </div>

                  <div className="border-t border-gray-100 py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={clsx(
                            'flex items-center w-full px-4 py-2 text-sm',
                            active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                          )}
                        >
                          <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3 text-gray-400" />
                          Выйти
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </header>
  );
}
