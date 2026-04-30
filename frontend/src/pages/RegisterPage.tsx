import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EnvelopeIcon, LockClosedIcon, UserIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@store/authStore';
import Button from '@components/common/Button';
import Input from '@components/common/Input';
import toast from 'react-hot-toast';

/**
 * Register page
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    nickname?: string;
  }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = 'Введите email';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Некорректный email';
    }

    if (!password) {
      newErrors.password = 'Введите пароль';
    } else if (password.length < 8) {
      newErrors.password = 'Пароль должен содержать минимум 8 символов';
    } else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Пароль должен содержать буквы и цифры';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    try {
      await register(email, password, nickname || undefined);
      toast.success('Регистрация успешна!');
      navigate('/map');
    } catch (error) {
      // Error is handled by API interceptor
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
        Создать аккаунт
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Никнейм"
          type="text"
          name="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          error={errors.nickname}
          leftIcon={<UserIcon className="w-5 h-5" />}
          placeholder="Ваше имя"
          autoComplete="name"
        />

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
          placeholder="Минимум 8 символов"
          autoComplete="new-password"
        />

        <p className="text-xs text-gray-500">
          Пароль должен содержать минимум 8 символов, включая буквы и цифры
        </p>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isLoading}
        >
          Зарегистрироваться
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Уже есть аккаунт?{' '}
        <Link
          to="/login"
          className="font-medium text-primary-600 hover:text-primary-500"
        >
          Войти
        </Link>
      </p>
    </div>
  );
}
