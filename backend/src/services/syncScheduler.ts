import cron from 'node-cron';
import { AccurateService } from './accurateService';
import logger from './logger';

let syncJob: cron.ScheduledTask | null = null;
let backfillJob: cron.ScheduledTask | null = null;
let syncInProgress = false;

/**
 * Shared lock between scheduled sync, historical backfill, and manual
 * "Sync Now" triggers. All three paths call the same Accurate API under a
 * shared rate limit, so they must not run concurrently — overlapping runs
 * previously caused a flood of requests that tripped Accurate's HTTP 429
 * rate limiting mid-sync.
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
    logger.warn('Skipping scheduled sync: previous cycle (sync or backfill) is still running.');
    return;
  }

  logger.info('Background scheduled sync started.');
  // Rincian Penjualan Barang harus disinkron setelah Faktur Penjualan: setiap
  // barisnya punya foreign key wajib ke nomor invoice di faktur_penjualan
  // (lihat relasi `faktur` di schema.prisma), jadi invoice-nya harus sudah ada
  // duluan atau create() akan gagal foreign key constraint.
  const modules = ['Barang & Jasa', 'Pelanggan', 'Faktur Penjualan', 'Rincian Penjualan Barang', 'Retur Penjualan'];

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
 * Mencicil backfill histori penuh (faktur_penjualan, retur_penjualan, lalu
 * rincian barang/sales) lewat cron TERPISAH dari sync 5-modul reguler di
 * atas. Sebelumnya backfill dipanggil di ekor executeAllSyncs() — tapi 1
 * siklus 5-modul reguler bisa makan waktu belasan menit (jauh lebih lama
 * dari interval cron 5 menit), jadi backfill tidak pernah kebagian giliran:
 * cron sync berikutnya selalu di-skip (masih locked) sebelum sempat sampai
 * ke bagian backfill. Cron backfill ini pakai lock yang SAMA (syncInProgress)
 * supaya tidak jalan bersamaan dengan sync reguler/manual — kalau sync
 * sedang jalan, siklus backfill ini di-skip dan dicoba lagi di trigger
 * berikutnya, bukan menunggu.
 */
export async function executeBackfill(): Promise<void> {
  if (!acquireSyncLock()) {
    logger.warn('Skipping scheduled backfill: previous cycle (sync or backfill) is still running.');
    return;
  }

  logger.info('Background historical backfill cycle started.');
  // 3 tahap BERURUTAN, tiap tahap hanya mulai setelah tahap sebelumnya
  // selesai (done=true) — supaya data ringkas (tahap 1) tersedia dulu untuk
  // analitik sebelum detail yang jauh lebih lambat (tahap 3) menyusul.
  try {
    const invoiceBackfill = await AccurateService.backfillHistoricalInvoices();
    if (!invoiceBackfill.done) {
      logger.info(`Backfill historis faktur: ${invoiceBackfill.pagesProcessed} halaman, ${invoiceBackfill.upserted} invoice di-upsert siklus ini.`);
    } else if (invoiceBackfill.pagesProcessed > 0) {
      logger.info('Backfill historis faktur_penjualan telah selesai sepenuhnya. Lanjut ke backfill retur.');
    } else {
      // Tahap 1 sudah DONE dari siklus sebelumnya — lanjut ke tahap 2.
      const returBackfill = await AccurateService.backfillReturPenjualan();
      if (!returBackfill.done) {
        logger.info(`Backfill historis retur: ${returBackfill.pagesProcessed} halaman, ${returBackfill.upserted} retur di-upsert siklus ini.`);
      } else if (returBackfill.pagesProcessed > 0) {
        logger.info('Backfill historis retur_penjualan telah selesai sepenuhnya. Lanjut ke backfill rincian invoice.');
      } else {
        // Tahap 1 & 2 sudah DONE — lanjut ke tahap 3 (paling lambat).
        const detailBackfill = await AccurateService.backfillInvoiceDetails();
        if (detailBackfill.processed > 0) {
          logger.info(`Backfill rincian invoice: ${detailBackfill.processed} invoice dilengkapi siklus ini.`);
        } else if (detailBackfill.done) {
          logger.info('Semua tahap backfill historis telah SELESAI.');
        }
      }
    }
  } catch (err) {
    logger.error('Unhandled error during historical backfill:', err);
  } finally {
    releaseSyncLock();
  }
}

/**
 * Start/Restart the cron scheduler based on configuration in settings
 */
export async function startSyncScheduler(): Promise<void> {
  // Stop existing jobs if active
  if (syncJob) {
    syncJob.stop();
    syncJob = null;
    logger.info('Existing background sync scheduler stopped.');
  }
  if (backfillJob) {
    backfillJob.stop();
    backfillJob = null;
    logger.info('Existing background backfill scheduler stopped.');
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

    // Backfill historis pakai cron TETAP tiap 2 menit, terlepas dari
    // SYNC_INTERVAL_CRON — sengaja lebih sering daripada sync reguler supaya
    // dapat banyak kesempatan "slot kosong" untuk jalan (lihat lock bersama
    // di executeBackfill), bukan menunggu giliran panjang di ekor sync 5-modul.
    backfillJob = cron.schedule('0 */2 * * * *', async () => {
      await executeBackfill();
    });

    logger.info(`Automated sync scheduler successfully started with cron pattern: "${cronExpression}"`);
    logger.info('Automated historical backfill scheduler successfully started with cron pattern: "0 */2 * * * *"');
  } catch (error) {
    logger.error('Failed to initialize sync scheduler:', error);
  }
}
