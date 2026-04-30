import nodemailer from 'nodemailer';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { query } from '../config/database';
import { HttpErrors } from '../middleware/errorHandler';
import * as digestService from './digest.service';

/**
 * Notification config interface
 */
export interface INotificationConfig {
  id: string;
  user_id: string;
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
  created_at: Date;
  updated_at: Date;
}

// Email transporter (lazy initialization)
let emailTransporter: nodemailer.Transporter | null = null;

function getEmailTransporter(): nodemailer.Transporter {
  if (!emailTransporter) {
    emailTransporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.password
      }
    });
  }
  return emailTransporter;
}

/**
 * Get notification config for user
 */
export async function getNotificationConfig(userId: string): Promise<INotificationConfig | null> {
  const result = await query<INotificationConfig>(
    'SELECT * FROM notification_configs WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Update notification config
 */
export async function updateNotificationConfig(
  userId: string,
  config: Partial<Omit<INotificationConfig, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<INotificationConfig> {
  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (config.telegram_chat_id !== undefined) {
    updates.push(`telegram_chat_id = $${paramIndex++}`);
    params.push(config.telegram_chat_id);
  }
  if (config.email !== undefined) {
    updates.push(`email = $${paramIndex++}`);
    params.push(config.email);
  }
  if (config.slack_webhook !== undefined) {
    updates.push(`slack_webhook = $${paramIndex++}`);
    params.push(config.slack_webhook);
  }
  if (config.schedule !== undefined) {
    updates.push(`schedule = $${paramIndex++}`);
    params.push(JSON.stringify(config.schedule));
  }
  if (config.triggers !== undefined) {
    updates.push(`triggers = $${paramIndex++}`);
    params.push(JSON.stringify(config.triggers));
  }

  params.push(userId);

  const result = await query<INotificationConfig>(`
    INSERT INTO notification_configs (user_id)
    VALUES ($${paramIndex})
    ON CONFLICT (user_id) DO UPDATE SET
      ${updates.length > 0 ? updates.join(', ') + ',' : ''}
      updated_at = NOW()
    RETURNING *
  `, params);

  return result.rows[0];
}

/**
 * Send notification to Telegram
 */
export async function sendToTelegram(
  chatId: string,
  message: string
): Promise<boolean> {
  if (!env.telegram.botToken) {
    logger.warn('Telegram bot token not configured');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.telegram.botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      }
    );

    const result = await response.json();
    
    if (!result.ok) {
      logger.error('Telegram API error', { error: result.description });
      return false;
    }

    logger.debug('Telegram message sent', { chatId });
    return true;
  } catch (error) {
    logger.error('Failed to send Telegram message', { error });
    return false;
  }
}

/**
 * Send notification via Email
 */
export async function sendToEmail(
  toEmail: string,
  subject: string,
  body: string
): Promise<boolean> {
  if (!env.smtp.user) {
    logger.warn('SMTP not configured');
    return false;
  }

  try {
    const transporter = getEmailTransporter();
    
    await transporter.sendMail({
      from: env.smtp.from,
      to: toEmail,
      subject: subject,
      text: body,
      html: body.replace(/\n/g, '<br>')
    });

    logger.debug('Email sent', { to: toEmail, subject });
    return true;
  } catch (error) {
    logger.error('Failed to send email', { error });
    return false;
  }
}

/**
 * Send notification to Slack
 */
export async function sendToSlack(
  webhookUrl: string,
  message: string
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message })
    });

    if (!response.ok) {
      logger.error('Slack webhook error', { status: response.status });
      return false;
    }

    logger.debug('Slack message sent');
    return true;
  } catch (error) {
    logger.error('Failed to send Slack message', { error });
    return false;
  }
}

/**
 * Send digest to all configured channels for a user
 */
export async function sendDigestToConfigured(
  userId: string,
  digest: digestService.IDigest
): Promise<string[]> {
  const config = await getNotificationConfig(userId);
  if (!config || !config.triggers.onDigest) {
    return [];
  }

  const sentChannels: string[] = [];
  const message = formatDigestMessage(digest);

  // Telegram
  if (config.telegram_chat_id && config.telegram_verified) {
    const sent = await sendToTelegram(config.telegram_chat_id, message);
    if (sent) sentChannels.push('telegram');
  }

  // Email
  if (config.email && config.email_verified) {
    const sent = await sendToEmail(
      config.email,
      'Ежедневный дайджест — Context Builder',
      message
    );
    if (sent) sentChannels.push('email');
  }

  // Slack
  if (config.slack_webhook && config.slack_verified) {
    const sent = await sendToSlack(config.slack_webhook, message);
    if (sent) sentChannels.push('slack');
  }

  // Update digest with sent channels
  if (sentChannels.length > 0) {
    await digestService.markDigestSent(digest.id, sentChannels);
  }

  return sentChannels;
}

/**
 * Send quota warning notification
 */
export async function sendQuotaWarning(
  userId: string,
  remaining: number
): Promise<void> {
  const config = await getNotificationConfig(userId);
  if (!config || !config.triggers.onQuotaLow) {
    return;
  }

  const message = `⚠️ *Предупреждение о лимите*\n\nОсталось запросов: ${remaining}\n\nПополните тариф, чтобы продолжить использование: contextbuilder.app/tariffs`;

  if (config.telegram_chat_id && config.telegram_verified) {
    await sendToTelegram(config.telegram_chat_id, message);
  }

  if (config.email && config.email_verified) {
    await sendToEmail(config.email, 'Предупреждение о лимите — Context Builder', message);
  }
}

/**
 * Send test notification
 */
export async function sendTestNotification(
  userId: string,
  channel: 'telegram' | 'email' | 'slack'
): Promise<boolean> {
  const config = await getNotificationConfig(userId);
  if (!config) {
    throw HttpErrors.NotFound('Настройки уведомлений не найдены');
  }

  const message = '✅ Тестовое уведомление от Context Builder\n\nЕсли вы видите это сообщение, уведомления настроены правильно!';

  switch (channel) {
    case 'telegram':
      if (!config.telegram_chat_id) {
        throw HttpErrors.BadRequest('Telegram не настроен');
      }
      return sendToTelegram(config.telegram_chat_id, message);
    
    case 'email':
      if (!config.email) {
        throw HttpErrors.BadRequest('Email не настроен');
      }
      return sendToEmail(config.email, 'Тестовое уведомление — Context Builder', message);
    
    case 'slack':
      if (!config.slack_webhook) {
        throw HttpErrors.BadRequest('Slack не настроен');
      }
      return sendToSlack(config.slack_webhook, message);
    
    default:
      throw HttpErrors.BadRequest('Неизвестный канал');
  }
}

/**
 * Format digest for messaging
 */
function formatDigestMessage(digest: digestService.IDigest): string {
  const date = new Date(digest.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return `📊 *Ежедневный дайджест*\n${date}\n\n${digest.content}\n\n_Сообщений за период: ${digest.message_count}_`;
}

/**
 * Get users with scheduled notifications for current time
 */
export async function getUsersForScheduledNotifications(
  currentHour: string
): Promise<Array<{ userId: string; email: string | null }>> {
  const result = await query<{ user_id: string; email: string | null }>(`
    SELECT user_id, email FROM notification_configs
    WHERE (schedule->>'enabled')::boolean = true
      AND schedule->>'time' = $1
      AND (
        SELECT COUNT(*) FROM jsonb_array_elements_text(schedule->'days') d
        WHERE d::integer = EXTRACT(DOW FROM CURRENT_DATE)
      ) > 0
  `, [currentHour]);

  return result.rows.map(r => ({ userId: r.user_id, email: r.email }));
}

export default {
  getNotificationConfig,
  updateNotificationConfig,
  sendToTelegram,
  sendToEmail,
  sendToSlack,
  sendDigestToConfigured,
  sendQuotaWarning,
  sendTestNotification,
  getUsersForScheduledNotifications
};
