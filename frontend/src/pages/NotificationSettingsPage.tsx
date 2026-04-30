import { useEffect, useState } from 'react';
import { notificationsApi } from '@services/api';
import Button from '@components/common/Button';
import Input from '@components/common/Input';
import toast from 'react-hot-toast';

interface NotificationConfig {
  telegram_chat_id: string | null;
  telegram_verified: boolean;
  email: string | null;
  email_verified: boolean;
  slack_webhook: string | null;
  slack_verified: boolean;
  schedule: {
    enabled: boolean;
    time: string;
    days: number[];
    timezone: string;
  };
  triggers: {
    onNewLink: boolean;
    onDigest: boolean;
    onQuotaLow: boolean;
  };
}

/**
 * Notification settings page
 */
export default function NotificationSettingsPage() {
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);

  // Form state
  const [telegramChatId, setTelegramChatId] = useState('');
  const [email, setEmail] = useState('');
  const [slackWebhook, setSlackWebhook] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('09:00');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await notificationsApi.getConfig();
      const cfg = response.data.config;
      setConfig(cfg);
      setTelegramChatId(cfg.telegram_chat_id || '');
      setEmail(cfg.email || '');
      setSlackWebhook(cfg.slack_webhook || '');
      setScheduleEnabled(cfg.schedule?.enabled || false);
      setScheduleTime(cfg.schedule?.time || '09:00');
    } catch (error) {
      toast.error('Не удалось загрузить настройки');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await notificationsApi.updateConfig({
        telegramChatId: telegramChatId || undefined,
        email: email || undefined,
        slackWebhook: slackWebhook || undefined,
        schedule: {
          enabled: scheduleEnabled,
          time: scheduleTime,
          days: [1, 2, 3, 4, 5],
          timezone: 'Europe/Moscow',
        },
        triggers: config?.triggers,
      });
      toast.success('Настройки сохранены');
      loadConfig();
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async (channel: 'telegram' | 'email' | 'slack') => {
    setTestingChannel(channel);
    try {
      const response = await notificationsApi.test(channel);
      if (response.data.success) {
        toast.success('Тестовое уведомление отправлено');
      } else {
        toast.error('Не удалось отправить уведомление');
      }
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setTestingChannel(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Настройки уведомлений</h1>

      <div className="space-y-6">
        {/* Telegram */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Telegram</h3>
          <p className="text-sm text-gray-600 mb-4">
            Для получения уведомлений в Telegram:
            <br />1. Найдите бота @ContextBuilderBot
            <br />2. Отправьте команду /start
            <br />3. Скопируйте полученный Chat ID сюда
          </p>
          <div className="flex gap-2">
            <Input
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="Chat ID"
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={() => handleTest('telegram')}
              disabled={!telegramChatId || testingChannel === 'telegram'}
              isLoading={testingChannel === 'telegram'}
            >
              Тест
            </Button>
          </div>
        </div>

        {/* Email */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Email</h3>
          <div className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={() => handleTest('email')}
              disabled={!email || testingChannel === 'email'}
              isLoading={testingChannel === 'email'}
            >
              Тест
            </Button>
          </div>
        </div>

        {/* Slack */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Slack</h3>
          <p className="text-sm text-gray-600 mb-4">
            Введите Webhook URL из настроек Slack Incoming Webhooks
          </p>
          <div className="flex gap-2">
            <Input
              value={slackWebhook}
              onChange={(e) => setSlackWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={() => handleTest('slack')}
              disabled={!slackWebhook || testingChannel === 'slack'}
              isLoading={testingChannel === 'slack'}
            >
              Тест
            </Button>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Расписание</h3>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-gray-700">Включить ежедневные дайджесты</span>
            </label>
            
            {scheduleEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Время отправки (по Москве)
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            )}
          </div>
        </div>

        {/* Save button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleSave}
          isLoading={isSaving}
        >
          Сохранить настройки
        </Button>
      </div>
    </div>
  );
}
