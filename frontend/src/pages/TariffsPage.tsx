import { useEffect } from 'react';
import { useTariffStore } from '@store/tariffStore';
import { CheckIcon } from '@heroicons/react/24/outline';
import Button from '@components/common/Button';
import clsx from 'clsx';
import toast from 'react-hot-toast';

/**
 * Tariffs page
 */
export default function TariffsPage() {
  const { status, plans, isLoading, loadStatus, loadPlans, upgradePlan } = useTariffStore();

  useEffect(() => {
    loadStatus();
    loadPlans();
  }, [loadStatus, loadPlans]);

  const handleUpgrade = async (planId: 'monthly' | 'yearly') => {
    try {
      await upgradePlan(planId);
      toast.success('Тариф успешно обновлён!');
    } catch (error) {
      // Error handled by interceptor
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Тарифные планы</h1>
        <p className="text-lg text-gray-600">
          Выберите план, который подходит для ваших задач
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = status?.plan === plan.id;
          const isPopular = plan.id === 'monthly';

          return (
            <div
              key={plan.id}
              className={clsx(
                'relative bg-white rounded-2xl border-2 p-6 transition-shadow',
                isPopular
                  ? 'border-primary-500 shadow-lg shadow-primary-100'
                  : 'border-gray-200 hover:shadow-md'
              )}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Популярный
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">
                    ${plan.price}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-500">
                      /{plan.id === 'yearly' ? 'год' : 'мес'}
                    </span>
                  )}
                </div>
                {plan.id === 'yearly' && (
                  <p className="text-sm text-success-600 mt-1">Экономия 17%</p>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckIcon className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={isCurrentPlan ? 'secondary' : isPopular ? 'primary' : 'outline'}
                disabled={isCurrentPlan || isLoading}
                onClick={() => plan.id !== 'free' && handleUpgrade(plan.id as 'monthly' | 'yearly')}
              >
                {isCurrentPlan ? 'Текущий план' : plan.id === 'free' ? 'Бесплатно' : 'Выбрать'}
              </Button>
            </div>
          );
        })}
      </div>

      {/* FAQ or additional info */}
      <div className="mt-12 text-center">
        <p className="text-gray-600">
          Все тарифы включают базовые функции.{' '}
          <br className="hidden sm:block" />
          Оплата демонстрационная — в реальном приложении здесь будет интеграция с платёжной системой.
        </p>
      </div>
    </div>
  );
}
