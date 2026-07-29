import cron from 'node-cron';
import { AccurateService } from './accurateService';
import logger from './logger';

let syncJob: cron.ScheduledTask | null = null;
let syncInProgress = false;

/**
 * Shared lock between scheduled sync and manual "Sync Now" triggers. Both
 * paths call the same Accurate API under a shared rate limit, so they must
 * not run concurrently — overlapping runs previously caused a flood of
 * requests that tripped Accurate's HTTP 429 rate limiting mid-sync.
 */
export function isSyncInProgress(): boolean {
  return syncInProgress;
}

export function acquireSyncLock(): boolean {
  if (syncInProgress) return false;
  syncInProgress = true;
  return true;
}

export function releaseSyncLock(): void {
  syncInProgress = false;
}

/**
 * Execute sync for all Accurate modules sequentially
 */
export async function executeAllSyncs(): Promise<void> {
  // With very short intervals (e.g. every 30s), a sync cycle over a large
  // dataset can outlast the interval itself. Skip overlapping runs instead of
  // stacking parallel calls against the Accurate API.
  if (!acquireSyncLock()) {
    logger.warn('Skipping scheduled sync: previous cycle is still running.');
    return;
  }

  logger.info('Background scheduled sync started.');
  const modules = ['Barang & Jasa', 'Pelanggan', 'Faktur Penjualan', 'Retur Penjualan'];

  try {
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
  } finally {
    releaseSyncLock();
  }
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
      cronExpression = '0 */5 * * * *'; // default: every 5 minutes
      await AccurateService.saveSetting('SYNC_INTERVAL_CRON', cronExpression);
    }

    // Verify validity of cron expression (6-field form with leading seconds is allowed)
    if (!cron.validate(cronExpression)) {
      logger.error(`Invalid cron expression detected: "${cronExpression}". Reverting to default '0 */5 * * * *'.`);
      cronExpression = '0 */5 * * * *';
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
