import cron from 'node-cron';
import { logger } from '../config/logger';
import { processDailyBonuses, processExpiredSubscriptions } from '../services/tariff.service';
import * as digestService from '../services/digest.service';
import * as notificationService from '../services/notification.service';
import { isLLMAvailable } from '../config/llm';

// Store scheduled tasks for cleanup
const scheduledTasks: cron.ScheduledTask[] = [];

/**
 * Initialize all cron jobs
 */
export function initializeCronJobs(): void {
  logger.info('Initializing cron jobs...');

  // ==========================================
  // Daily Bonus Processing
  // Every day at 00:01 UTC
  // ==========================================
  const dailyBonusJob = cron.schedule('1 0 * * *', async () => {
    logger.info('Running daily bonus job');
    try {
      const processed = await processDailyBonuses();
      logger.info('Daily bonus job completed', { processed });
    } catch (error) {
      logger.error('Daily bonus job failed', { error });
    }
  }, {
    timezone: 'UTC'
  });
  scheduledTasks.push(dailyBonusJob);

  // ==========================================
  // Expired Subscriptions Processing
  // Every day at 00:30 UTC
  // ==========================================
  const expiredSubsJob = cron.schedule('30 0 * * *', async () => {
    logger.info('Running expired subscriptions job');
    try {
      const processed = await processExpiredSubscriptions();
      logger.info('Expired subscriptions job completed', { processed });
    } catch (error) {
      logger.error('Expired subscriptions job failed', { error });
    }
  }, {
    timezone: 'UTC'
  });
  scheduledTasks.push(expiredSubsJob);

  // ==========================================
  // Daily Digest Generation
  // Every day at 06:00 UTC (09:00 Moscow time)
  // ==========================================
  const dailyDigestJob = cron.schedule('0 6 * * *', async () => {
    logger.info('Running daily digest generation job');
    
    if (!isLLMAvailable()) {
      logger.warn('Skipping digest generation: LLM not available');
      return;
    }

    try {
      const superChats = await digestService.getSuperChatsNeedingDigests();
      logger.info(`Found ${superChats.length} super-chats needing digests`);

      let generated = 0;
      for (const sc of superChats) {
        try {
          const digest = await digestService.generateAndStoreDigest(
            sc.superChatId,
            sc.userId
          );
          await notificationService.sendDigestToConfigured(sc.userId, digest);
          generated++;
        } catch (error) {
          logger.error('Failed to generate digest for super-chat', { 
            superChatId: sc.superChatId, 
            error 
          });
        }
      }

      logger.info('Daily digest job completed', { generated });
    } catch (error) {
      logger.error('Daily digest job failed', { error });
    }
  }, {
    timezone: 'UTC'
  });
  scheduledTasks.push(dailyDigestJob);

  // ==========================================
  // Scheduled Notifications
  // Every hour at minute 0
  // ==========================================
  const scheduledNotificationsJob = cron.schedule('0 * * * *', async () => {
    const currentHour = new Date().toISOString().substring(11, 16); // HH:MM
    logger.debug('Running scheduled notifications check', { currentHour });

    try {
      const users = await notificationService.getUsersForScheduledNotifications(currentHour);
      
      if (users.length === 0) {
        return;
      }

      logger.info(`Found ${users.length} users with scheduled notifications`);

      for (const user of users) {
        try {
          // Get user's super-chats and send digests
          const superChats = await digestService.getSuperChatsNeedingDigests();
          const userSuperChats = superChats.filter(sc => sc.userId === user.userId);

          for (const sc of userSuperChats) {
            const digest = await digestService.generateAndStoreDigest(
              sc.superChatId,
              user.userId
            );
            await notificationService.sendDigestToConfigured(user.userId, digest);
          }
        } catch (error) {
          logger.error('Failed to send scheduled notification', { 
            userId: user.userId, 
            error 
          });
        }
      }
    } catch (error) {
      logger.error('Scheduled notifications job failed', { error });
    }
  }, {
    timezone: 'UTC'
  });
  scheduledTasks.push(scheduledNotificationsJob);

  // ==========================================
  // Health Check Ping (every 5 minutes)
  // For monitoring
  // ==========================================
  const healthPingJob = cron.schedule('*/5 * * * *', () => {
    logger.debug('Cron health ping', { 
      uptime: process.uptime(),
      memory: process.memoryUsage().heapUsed / 1024 / 1024
    });
  });
  scheduledTasks.push(healthPingJob);

  logger.info(`Initialized ${scheduledTasks.length} cron jobs`);
}

/**
 * Stop all cron jobs
 */
export function stopCronJobs(): void {
  for (const task of scheduledTasks) {
    task.stop();
  }
  scheduledTasks.length = 0;
  logger.info('All cron jobs stopped');
}

export default {
  initializeCronJobs,
  stopCronJobs
};
