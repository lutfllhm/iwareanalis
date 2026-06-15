import cron from 'node-cron';
import { AccurateService } from './accurateService';
import logger from './logger';

let syncJob: cron.ScheduledTask | null = null;

/**
 * Execute sync for all Accurate modules sequentially
 */
export async function executeAllSyncs(): Promise<void> {
  logger.info('Background scheduled sync started.');
  const modules = ['Barang & Jasa', 'Pelanggan', 'Faktur Penjualan', 'Retur Penjualan'];
  
  for (const mod of modules) {
    try {
      const result = await AccurateService.syncModule(mod);
      if (result.success) {
        logger.info(`Scheduled sync successful for ${mod}. Synced: ${result.count}`);
      } else {
        logger.error(`Scheduled sync failed for ${mod}: ${result.error}`);
      }
    } catch (err) {
      logger.error(`Unhandled error during scheduled sync for ${mod}:`, err);
    }
  }
  logger.info('Background scheduled sync completed.');
}

/**
 * Start/Restart the cron scheduler based on configuration in settings
 */
export async function startSyncScheduler(): Promise<void> {
  // Stop existing job if active
  if (syncJob) {
    syncJob.stop();
    syncJob = null;
    logger.info('Existing background sync scheduler stopped.');
  }

  try {
    let cronExpression = await AccurateService.getSetting('SYNC_INTERVAL_CRON');
    if (!cronExpression) {
      cronExpression = '0 */4 * * *'; // default to every 4 hours
      await AccurateService.saveSetting('SYNC_INTERVAL_CRON', cronExpression);
    }

    // Verify validity of cron expression
    if (!cron.validate(cronExpression)) {
      logger.error(`Invalid cron expression detected: "${cronExpression}". Reverting to default '0 */4 * * *'.`);
      cronExpression = '0 */4 * * *';
    }

    syncJob = cron.schedule(cronExpression, async () => {
      logger.info('Triggering automated background synchronization...');
      await executeAllSyncs();
    });

    logger.info(`Automated sync scheduler successfully started with cron pattern: "${cronExpression}"`);
  } catch (error) {
    logger.error('Failed to initialize sync scheduler:', error);
  }
}
