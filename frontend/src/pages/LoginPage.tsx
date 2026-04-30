import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@store/authStore';
import Button from '@components/common/Button';
import Input from '@components/common/Input';
import toast from 'react-hot-toast';

/**
 * Login page
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Введите email';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Некорректный email';
    }

    if (!password) {
      newErrors.password = 'Введите пароль';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    try {
      await login(email, password);
      toast.success('Добро пожаловать!');
      navigate('/map');
    } catch (error) {
      // Error is handled by API interceptor
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
        Вход в аккаунт
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          leftIcon={<EnvelopeIcon className="w-5 h-5" />}
          placeholder="your@email.com"
          autoComplete="email"
        />

        <Input
          label="Пароль"
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          leftIcon={<LockClosedIcon className="w-5 h-5" />}
          placeholder="••••••••"
          autoComplete="current-password"
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isLoading}
        >
          Войти
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Нет аккаунта?{' '}
        <Link
          to="/register"
          className="font-medium text-primary-600 hover:text-primary-500"
        >
          Зарегистрироваться
        </Link>
      </p>
    </div>
  );
}
