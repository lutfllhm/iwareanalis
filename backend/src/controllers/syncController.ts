import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AccurateService } from '../services/accurateService';
import { startSyncScheduler } from '../services/syncScheduler';
import prisma from '../services/db';
import logger from '../services/logger';

/**
 * Trigger sync for a specific module manually
 */
export async function syncModule(req: AuthenticatedRequest, res: Response) {
  const { moduleName } = req.body;

  if (!moduleName) {
    return res.status(400).json({ message: 'Nama modul wajib diisi' });
  }

  try {
    logger.info(`Manual sync triggered by ${req.user?.email} for: ${moduleName}`);
    
    // Audit log sync request
    await prisma.auditLog.create({
      data: {
        user_id: req.user?.id,
        user_email: req.user?.email,
        aksi: 'SYNC_MODULE_TRIGGER',
        target: moduleName,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
      },
    });

    // Manual "Sync Now" always pulls full history, since the user may be
    // connecting for the first time or recovering from a gap in scheduled syncs.
    const result = await AccurateService.syncModule(moduleName, true);

    if (result.success) {
      return res.status(200).json({
        message: `Sinkronisasi modul ${moduleName} berhasil`,
        count: result.count,
      });
    } else {
      return res.status(500).json({
        message: `Sinkronisasi modul ${moduleName} gagal`,
        error: result.error,
      });
    }
  } catch (error: any) {
    logger.error(`Sync handler error for ${moduleName}:`, error);
    return res.status(500).json({ message: 'Terjadi kesalahan sistem saat sinkronisasi' });
  }
}

/**
 * Get sync logs
 */
export async function getSyncLogs(req: AuthenticatedRequest, res: Response) {
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '10', 10);
  const skip = (page - 1) * limit;

  try {
    const [logs, total] = await Promise.all([
      prisma.syncLog.findMany({
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.syncLog.count(),
    ]);

    return res.status(200).json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Failed to get sync logs:', error);
    return res.status(500).json({ message: 'Gagal mengambil log sinkronisasi' });
  }
}

/**
 * Get audit logs (Admin only)
 */
export async function getAuditLogs(req: AuthenticatedRequest, res: Response) {
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '20', 10);
  const skip = (page - 1) * limit;

  try {
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count(),
    ]);

    return res.status(200).json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Failed to get audit logs:', error);
    return res.status(500).json({ message: 'Gagal mengambil log audit' });
  }
}

/**
 * Retrieve current settings configuration
 */
export async function getSettings(_req: AuthenticatedRequest, res: Response) {
  try {
    const rawSettings = await prisma.setting.findMany();
    const settingsMap: { [key: string]: string } = {};
    
    for (const item of rawSettings) {
      // Return redacted sensitive variables
      if (item.key.includes('TOKEN') || item.key.includes('SECRET')) {
        settingsMap[item.key] = item.value ? '••••••••••••••••' : '';
      } else {
        settingsMap[item.key] = item.value;
      }
    }

    return res.status(200).json(settingsMap);
  } catch (error) {
    logger.error('Failed to retrieve settings:', error);
    return res.status(500).json({ message: 'Gagal mengambil pengaturan' });
  }
}

/**
 * Update system settings
 */
export async function updateSettings(req: AuthenticatedRequest, res: Response) {
  const settingsObj = req.body;

  try {
    for (const [key, value] of Object.entries(settingsObj)) {
      if (typeof value !== 'string') continue;
      
      // Do not overwrite sensitive details with redacted placeholders
      if ((key.includes('TOKEN') || key.includes('SECRET')) && value === '••••••••••••••••') {
        continue;
      }

      await AccurateService.saveSetting(key, value);
    }

    // Write audit log
    await prisma.auditLog.create({
      data: {
        user_id: req.user?.id,
        user_email: req.user?.email,
        aksi: 'UPDATE_SETTINGS',
        target: 'Settings',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
      },
    });

    // If sync scheduling pattern has changed, reload cron job
    if (settingsObj.SYNC_INTERVAL_CRON) {
      await startSyncScheduler();
    }

    return res.status(200).json({ message: 'Pengaturan berhasil diperbarui' });
  } catch (error) {
    logger.error('Failed to update settings:', error);
    return res.status(500).json({ message: 'Gagal memperbarui pengaturan' });
  }
}

/**
 * Save App Key + Signature Secret + API Token, then verify them against
 * Accurate Online (/api/api-token.do). On success this also discovers the
 * dynamic API host and Data Usaha info needed for subsequent report/sync calls.
 */
export async function connectAccurateApiToken(req: AuthenticatedRequest, res: Response) {
  const { appKey, signatureSecret, apiToken } = req.body;

  if (!appKey || !signatureSecret || !apiToken) {
    return res.status(400).json({ message: 'App Key, Signature Secret, dan API Token wajib diisi' });
  }

  try {
    await AccurateService.saveSetting('ACCURATE_APP_KEY', appKey);
    await AccurateService.saveSetting('ACCURATE_SIGNATURE_SECRET', signatureSecret);
    await AccurateService.saveSetting('ACCURATE_API_TOKEN', apiToken);

    const result = await AccurateService.verifyApiToken();

    await prisma.auditLog.create({
      data: {
        user_id: req.user?.id,
        user_email: req.user?.email,
        aksi: 'ACCURATE_CONNECT_API_TOKEN',
        target: result.dbAlias || 'Accurate Online',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
      },
    });

    return res.status(200).json({
      message: `Berhasil terhubung ke Accurate Online (${result.dbAlias})`,
      ...result,
    });
  } catch (err: any) {
    logger.error('Accurate API Token verification failed:', err);
    return res.status(500).json({
      message: err.message || 'Gagal memverifikasi API Token',
    });
  }
}

/**
 * Re-check currently stored Accurate credentials without requiring the
 * caller to resupply App Key / Signature Secret / API Token.
 */
export async function testAccurateConnection(_req: AuthenticatedRequest, res: Response) {
  try {
    const result = await AccurateService.testConnection();

    return res.status(200).json({
      message: `Koneksi ke Accurate Online berhasil (${result.dbAlias})`,
      ...result,
    });
  } catch (err: any) {
    logger.error('Accurate test connection failed:', err);
    return res.status(502).json({
      message: err.message || 'Gagal terhubung ke Accurate Online',
    });
  }
}

/**
 * All downloadable modules list
 */
const ALL_DOWNLOAD_MODULES = [
  'barang-jasa',
  'pelanggan',
  'faktur-penjualan',
  'rincian-penjualan',
  'retur-penjualan',
  'mutasi-serial-number',
  'serial-number-per-gudang',
  'ringkasan-mutasi-stok',
  'work-order',
];

/**
 * Get current download config (which modules can be downloaded)
 */
export async function getDownloadConfig(_req: AuthenticatedRequest, res: Response) {
  try {
    const setting = await prisma.setting.findFirst({ where: { key: 'DOWNLOAD_ENABLED_MODULES' } });
    let enabledModules: string[];
    if (!setting || !setting.value) {
      // Default: all modules enabled
      enabledModules = [...ALL_DOWNLOAD_MODULES];
    } else {
      try {
        enabledModules = JSON.parse(setting.value);
      } catch {
        enabledModules = [...ALL_DOWNLOAD_MODULES];
      }
    }
    return res.status(200).json({ enabledModules, allModules: ALL_DOWNLOAD_MODULES });
  } catch (error) {
    logger.error('Failed to get download config:', error);
    return res.status(500).json({ message: 'Gagal mengambil konfigurasi download' });
  }
}

/**
 * Update download config (which modules can be downloaded)
 */
export async function updateDownloadConfig(req: AuthenticatedRequest, res: Response) {
  const { enabledModules } = req.body;

  if (!Array.isArray(enabledModules)) {
    return res.status(400).json({ message: 'enabledModules harus berupa array' });
  }

  try {
    await AccurateService.saveSetting('DOWNLOAD_ENABLED_MODULES', JSON.stringify(enabledModules));

    await prisma.auditLog.create({
      data: {
        user_id: req.user?.id,
        user_email: req.user?.email,
        aksi: 'UPDATE_DOWNLOAD_CONFIG',
        target: 'DownloadSettings',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
      },
    });

    return res.status(200).json({ message: 'Konfigurasi download berhasil diperbarui', enabledModules });
  } catch (error) {
    logger.error('Failed to update download config:', error);
    return res.status(500).json({ message: 'Gagal memperbarui konfigurasi download' });
  }
}
