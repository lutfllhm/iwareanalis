import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AccurateService } from '../services/accurateService';
import { startSyncScheduler } from '../services/syncScheduler';
import { config } from '../config';
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

    const result = await AccurateService.syncModule(moduleName);

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
 * Connect to Accurate Online (Generates Redirect url)
 */
export async function getAccurateAuthUrl(_req: AuthenticatedRequest, res: Response) {
  try {
    const authUrl = AccurateService.getAuthUrl();
    return res.status(200).json({ authUrl });
  } catch (error) {
    logger.error('Failed to generate auth url:', error);
    return res.status(500).json({ message: 'Gagal membuat URL autentikasi' });
  }
}

/**
 * Handle Accurate OAuth2 Callback
 */
export async function handleOauthCallback(req: AuthenticatedRequest, res: Response) {
  // Accurate redirects browser via GET with code in query string
  const code = req.query.code as string;
  const error = req.query.error as string;

  const frontendUrl = config.frontendUrl;

  if (error) {
    logger.error(`Accurate OAuth error: ${error} - ${req.query.error_description}`);
    return res.redirect(`${frontendUrl}/settings?accurate_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/settings?accurate_error=missing_code`);
  }

  try {
    logger.info(`Received OAuth code from Accurate, exchanging for tokens...`);
    await AccurateService.exchangeCodeForToken(code);

    // Redirect back to settings page with success flag so frontend can fetch DB list
    return res.redirect(`${frontendUrl}/settings?accurate_connected=true`);
  } catch (err: any) {
    logger.error('Accurate callback exchange failed:', err);
    return res.redirect(`${frontendUrl}/settings?accurate_error=${encodeURIComponent(err.message)}`);
  }
}

/**
 * Handle Manual OAuth Callback (POST with code in body)
 * For when automatic redirect fails and user copies code manually
 */
export async function handleManualOauthCallback(req: AuthenticatedRequest, res: Response) {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ message: 'Kode OAuth wajib diisi' });
  }

  try {
    logger.info(`Manual OAuth code submission from ${req.user?.email}, exchanging for tokens...`);
    await AccurateService.exchangeCodeForToken(code);

    // Fetch database list after successful token exchange
    const databases = await AccurateService.getDatabaseList();

    // Audit log
    await prisma.auditLog.create({
      data: {
        user_id: req.user?.id,
        user_email: req.user?.email,
        aksi: 'ACCURATE_MANUAL_OAUTH',
        target: 'OAuth Token Exchange',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
      },
    });

    return res.status(200).json({
      message: 'Berhasil terhubung dengan Accurate Online',
      databases,
    });
  } catch (err: any) {
    logger.error('Manual callback exchange failed:', err);
    return res.status(500).json({ 
      message: 'Gagal menukarkan kode OAuth',
      error: err.message 
    });
  }
}

/**
 * Fetch databases list directly (using active credentials)
 */
export async function getAccurateDatabases(_req: AuthenticatedRequest, res: Response) {
  try {
    const dbs = await AccurateService.getDatabaseList();
    return res.status(200).json(dbs);
  } catch (error: any) {
    logger.error('Failed to get Accurate databases:', error);
    return res.status(500).json({ message: error.message || 'Gagal mengambil database' });
  }
}

/**
 * Select company database and trigger session initialization
 */
export async function selectAccurateDatabase(req: AuthenticatedRequest, res: Response) {
  const { dbId, dbName } = req.body;

  if (!dbId || !dbName) {
    return res.status(400).json({ message: 'ID dan Nama Database wajib dipilih' });
  }

  try {
    logger.info(`Opening DB session for company DB ID: ${dbId} - ${dbName}`);
    const sessionResult = await AccurateService.openDbSession(dbId);

    // Save database metadata
    await AccurateService.saveSetting('ACCURATE_DB_ID', dbId);
    await AccurateService.saveSetting('ACCURATE_DB_NAME', dbName);

    // Audit log database selection
    await prisma.auditLog.create({
      data: {
        user_id: req.user?.id,
        user_email: req.user?.email,
        aksi: 'ACCURATE_SELECT_DB',
        target: dbName,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
      },
    });

    return res.status(200).json({
      message: `Berhasil membuka database ${dbName}`,
      session: sessionResult.session,
    });
  } catch (error: any) {
    logger.error(`Database session activation failed:`, error);
    return res.status(500).json({ 
      message: 'Gagal membuka database pilihan',
      error: error.message 
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
