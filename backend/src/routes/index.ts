import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validation';
import { authenticateToken, requireRole, loginRateLimiter } from '../middlewares/auth';
import * as authController from '../controllers/authController';
import * as syncController from '../controllers/syncController';
import * as dataController from '../controllers/dataController';
import * as analyticsController from '../controllers/analyticsController';
import * as userController from '../controllers/userController';
import * as reportController from '../controllers/reportController';

const router = Router();

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================

router.post(
  '/auth/login',
  loginRateLimiter,
  [
    body('email').isEmail().withMessage('Email tidak valid'),
    body('password').notEmpty().withMessage('Password wajib diisi'),
  ],
  validateRequest,
  authController.login
);

router.post(
  '/auth/verify-2fa',
  [
    body('userId').notEmpty().withMessage('User ID wajib diisi'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('Kode OTP harus 6 digit angka'),
  ],
  validateRequest,
  authController.verify2FA
);

// Setup, Confirm and Disable 2FA (Requires authentication)
router.post('/auth/setup-2fa', authenticateToken as any, authController.setup2FA as any);

router.post(
  '/auth/confirm-2fa',
  authenticateToken as any,
  [body('code').isLength({ min: 6, max: 6 }).withMessage('Kode OTP harus 6 digit')],
  validateRequest,
  authController.confirm2FA as any
);

router.post(
  '/auth/disable-2fa',
  authenticateToken as any,
  authController.disable2FA as any
);

router.post('/auth/refresh', authController.refreshToken);
router.post('/auth/logout', authenticateToken as any, authController.logout as any);
router.get('/auth/me', authenticateToken as any, authController.me as any);


// ==========================================
// 2. SYNCHRONIZATION & CONFIGURATION ROUTES
// ==========================================

router.post(
  '/sync/trigger',
  authenticateToken as any,
  requireRole(['admin', 'analyst']) as any,
  syncController.syncModule as any
);

router.get('/sync/logs', authenticateToken as any, syncController.getSyncLogs as any);

router.get(
  '/sync/audit-logs',
  authenticateToken as any,
  requireRole(['admin']) as any,
  syncController.getAuditLogs as any
);

// Save & verify Accurate Online API Token credentials (App Key, Signature Secret, API Token)
router.post(
  '/sync/connect-api-token',
  authenticateToken as any,
  requireRole(['admin', 'analyst']) as any,
  syncController.connectAccurateApiToken as any
);

// Re-check currently stored Accurate credentials (no body required)
router.post(
  '/sync/test-connection',
  authenticateToken as any,
  requireRole(['admin', 'analyst']) as any,
  syncController.testAccurateConnection as any
);

// Settings
router.get('/settings', authenticateToken as any, syncController.getSettings as any);

router.post(
  '/settings/update',
  authenticateToken as any,
  requireRole(['admin']) as any,
  syncController.updateSettings as any
);

// Download configuration: which modules are allowed to be downloaded
router.get('/settings/download-config', authenticateToken as any, syncController.getDownloadConfig as any);
router.post(
  '/settings/download-config',
  authenticateToken as any,
  requireRole(['admin']) as any,
  syncController.updateDownloadConfig as any
);


// ==========================================
// 3. MASTER & TRANSACTION DATA ROUTES
// ==========================================

router.get('/data/barang-jasa', authenticateToken as any, dataController.getBarangJasa as any);
router.get('/data/pelanggan', authenticateToken as any, dataController.getPelanggan as any);
router.get('/data/faktur-penjualan', authenticateToken as any, dataController.getFakturPenjualan as any);
router.get('/data/rincian-penjualan', authenticateToken as any, dataController.getRincianPenjualan as any);
router.get('/data/retur-penjualan', authenticateToken as any, dataController.getReturPenjualan as any);

// Download (Full export as CSV) - Admin only
router.get('/data/barang-jasa/download', authenticateToken as any, requireRole(['admin', 'analyst']) as any, dataController.downloadBarangJasa as any);
router.get('/data/pelanggan/download', authenticateToken as any, requireRole(['admin', 'analyst']) as any, dataController.downloadPelanggan as any);
router.get('/data/faktur-penjualan/download', authenticateToken as any, requireRole(['admin', 'analyst']) as any, dataController.downloadFakturPenjualan as any);
router.get('/data/rincian-penjualan/download', authenticateToken as any, requireRole(['admin', 'analyst']) as any, dataController.downloadRincianPenjualan as any);
router.get('/data/retur-penjualan/download', authenticateToken as any, requireRole(['admin', 'analyst']) as any, dataController.downloadReturPenjualan as any);


// ==========================================
// 4. ANALYTICS & REPORTS ROUTES
// ==========================================

router.get('/analytics/kpis', authenticateToken as any, analyticsController.getKPIs as any);
router.get('/analytics/sales-trend', authenticateToken as any, analyticsController.getSalesTrend as any);
router.get('/analytics/top-products', authenticateToken as any, analyticsController.getTopProducts as any);
router.get('/analytics/category-ratios', authenticateToken as any, analyticsController.getCategoryRatios as any);
router.get('/analytics/sales-performance', authenticateToken as any, analyticsController.getSalespersonPerformance as any);
router.get('/analytics/geo-sales', authenticateToken as any, analyticsController.getGeoSales as any);
router.get('/analytics/rfm', authenticateToken as any, analyticsController.getRFMData as any);
router.get('/analytics/forecast', authenticateToken as any, analyticsController.getForecast as any);
router.get('/analytics/stock-mutation-summary', authenticateToken as any, analyticsController.getStockMutationSummary as any);
router.get('/analytics/serial-number-mutation', authenticateToken as any, analyticsController.getSerialNumberMutation as any);
router.get('/analytics/work-orders', authenticateToken as any, analyticsController.getWorkOrders as any);


// ==========================================
// 5. ACCURATE REPORT ROUTES (readonly, direct proxy)
// ==========================================

router.get(
  '/report/rincian-penjualan-per-barang',
  authenticateToken as any,
  reportController.getRincianPenjualanPerBarang as any
);

router.get(
  '/report/cabang',
  authenticateToken as any,
  reportController.getCabangList as any
);

router.get(
  '/report/daftar-faktur-penjualan',
  authenticateToken as any,
  reportController.getDaftarFakturPenjualan as any
);

router.get(
  '/report/daftar-retur-penjualan',
  authenticateToken as any,
  reportController.getDaftarReturPenjualan as any
);

router.get(
  '/report/daftar-barang-jasa',
  authenticateToken as any,
  reportController.getDaftarBarangJasa as any
);

router.get(
  '/report/daftar-pelanggan',
  authenticateToken as any,
  reportController.getDaftarPelanggan as any
);


// ==========================================
// 6. USER MANAGEMENT ROUTES (Admin only)
// ==========================================

router.get(
  '/users',
  authenticateToken as any,
  requireRole(['admin']) as any,
  userController.getUsers as any
);

router.post(
  '/users',
  authenticateToken as any,
  requireRole(['admin']) as any,
  userController.createUser as any
);

router.put(
  '/users/:id',
  authenticateToken as any,
  requireRole(['admin']) as any,
  userController.updateUser as any
);

router.post(
  '/users/:id/reset-password',
  authenticateToken as any,
  requireRole(['admin']) as any,
  userController.resetPassword as any
);

router.delete(
  '/users/:id',
  authenticateToken as any,
  requireRole(['admin']) as any,
  userController.deleteUser as any
);

export default router;
