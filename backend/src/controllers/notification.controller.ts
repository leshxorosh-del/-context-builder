import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as notificationService from '../services/notification.service';

/**
 * Get notification config
 * GET /api/notifications/config
 */
export const getConfig = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  const config = await notificationService.getNotificationConfig(userId);

  res.json({
    config: config || {
      telegram_chat_id: null,
      telegram_verified: false,
      email: null,
      email_verified: false,
      slack_webhook: null,
      slack_verified: false,
      schedule: {
        enabled: false,
        time: '09:00',
        days: [1, 2, 3, 4, 5],
        timezone: 'Europe/Moscow'
      },
      triggers: {
        onNewLink: false,
        onDigest: true,
        onQuotaLow: true
      }
    }
  });
});

/**
 * Update notification config
 * PUT /api/notifications/config
 */
export const updateConfig = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { telegramChatId, email, slackWebhook, schedule, triggers } = req.body as {
    telegramChatId?: string;
    email?: string;
    slackWebhook?: string;
    schedule?: {
      enabled: boolean;
      time: string;
      days: number[];
      timezone: string;
    };
    triggers?: {
      onNewLink: boolean;
      onDigest: boolean;
      onQuotaLow: boolean;
    };
  };

  const config = await notificationService.updateNotificationConfig(userId, {
    telegram_chat_id: telegramChatId,
    email,
    slack_webhook: slackWebhook,
    schedule,
    triggers
  });

  res.json({
    message: 'Настройки обновлены',
    config
  });
});

/**
 * Send test notification
 * POST /api/notifications/test
 */
export const testNotification = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { channel } = req.body as { channel: 'telegram' | 'email' | 'slack' };

  const success = await notificationService.sendTestNotification(userId, channel);

  res.json({
    success,
    message: success 
      ? 'Тестовое уведомление отправлено'
      : 'Не удалось отправить уведомление'
  });
});

export default {
  getConfig,
  updateConfig,
  testNotification
};
