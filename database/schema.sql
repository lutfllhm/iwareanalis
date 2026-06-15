-- Database Schema Setup Script
-- Database: dataanalis

CREATE DATABASE IF NOT EXISTS `dataanalis` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `dataanalis`;

-- 1. barang_jasa
CREATE TABLE IF NOT EXISTS `barang_jasa` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kode_barang` VARCHAR(191) NOT NULL UNIQUE,
  `nama_barang` VARCHAR(255) NOT NULL,
  `kategori_barang` VARCHAR(100) NOT NULL,
  `nama_merek_barang` VARCHAR(100) NULL,
  `non_aktif` BOOLEAN DEFAULT FALSE,
  `tgl_jam_pembuatan` DATETIME NOT NULL,
  `kts_gdng_pengguna` DECIMAL(18, 4) NOT NULL,
  `kts_semua_gdng` DECIMAL(18, 4) NOT NULL,
  `synced_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. pelanggan
CREATE TABLE IF NOT EXISTS `pelanggan` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `id_pelanggan` VARCHAR(191) NOT NULL UNIQUE,
  `id_karyawan_default_penjual` VARCHAR(100) NULL,
  `id_karyawan_tenaga_penjual_kedua` VARCHAR(100) NULL,
  `nama` VARCHAR(255) NOT NULL,
  `kategori_pelanggan` VARCHAR(100) NULL,
  `non_aktif` BOOLEAN DEFAULT FALSE,
  `kota_pengiriman` VARCHAR(100) NULL,
  `provinsi_pengiriman` VARCHAR(100) NULL,
  `tgl_jam_pembuatan` DATETIME NULL,
  `nama_default_penjual` VARCHAR(255) NULL,
  `alamat_lengkap_pengiriman` TEXT NULL,
  `synced_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. faktur_penjualan
CREATE TABLE IF NOT EXISTS `faktur_penjualan` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nomor` VARCHAR(191) NOT NULL UNIQUE,
  `id_pelanggan` VARCHAR(191) NOT NULL,
  `id_karyawan_penjual_utama` VARCHAR(100) NULL,
  `tanggal` DATE NOT NULL,
  `total` DECIMAL(18, 4) NOT NULL,
  `pembayaran` DECIMAL(18, 4) NOT NULL,
  `synced_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. rincian_penjualan_barang
CREATE TABLE IF NOT EXISTS `rincian_penjualan_barang` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nomor` VARCHAR(191) NOT NULL,
  `kode` VARCHAR(191) NOT NULL,
  `nama_barang` VARCHAR(255) NOT NULL,
  `kuantitas` DECIMAL(18, 4) NOT NULL,
  `harga` DECIMAL(18, 4) NOT NULL,
  `total_harga` DECIMAL(18, 4) NOT NULL,
  `penjualan` DECIMAL(18, 4) NOT NULL,
  `tanggal` DATE NOT NULL,
  `nama_pelanggan` VARCHAR(255) NULL,
  `nama_tenaga_penjual` VARCHAR(255) NULL,
  `id_karyawan_tenaga_penjual` VARCHAR(100) NULL,
  `id_karyawan_tenaga_penjual_kedua` VARCHAR(100) NULL,
  `synced_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`nomor`) REFERENCES `faktur_penjualan` (`nomor`) ON DELETE CASCADE,
  FOREIGN KEY (`kode`) REFERENCES `barang_jasa` (`kode_barang`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. retur_penjualan
CREATE TABLE IF NOT EXISTS `retur_penjualan` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nomor` VARCHAR(191) NOT NULL UNIQUE,
  `id_pelanggan` VARCHAR(191) NOT NULL,
  `id_karyawan_penjual_utama` VARCHAR(100) NULL,
  `tanggal` DATE NOT NULL,
  `total` DECIMAL(18, 4) NOT NULL,
  `pembayaran_faktur_penjualan` DECIMAL(18, 4) NOT NULL,
  `nilai_retur_faktur` DECIMAL(18, 4) NOT NULL,
  `synced_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. users
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama` VARCHAR(100) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'analyst', 'viewer') DEFAULT 'viewer',
  `is_active` BOOLEAN DEFAULT TRUE,
  `two_fa_enabled` BOOLEAN DEFAULT FALSE,
  `two_fa_secret` VARCHAR(255) NULL,
  `failed_login_attempts` INT DEFAULT 0,
  `lockout_until` DATETIME NULL,
  `last_login` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 7. sync_logs
CREATE TABLE IF NOT EXISTS `sync_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `modul` VARCHAR(100) NOT NULL,
  `status` ENUM('SUCCESS', 'FAILED') NOT NULL,
  `jumlah_baris` INT DEFAULT 0,
  `pesan_error` TEXT NULL,
  `durasi_ms` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 8. audit_logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `user_email` VARCHAR(191) NULL,
  `aksi` VARCHAR(100) NOT NULL,
  `target` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 9. settings
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(191) NOT NULL UNIQUE,
  `value` LONGTEXT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Indexes for search speed optimization
CREATE INDEX idx_faktur_tanggal ON faktur_penjualan(tanggal);
CREATE INDEX idx_rincian_tanggal ON rincian_penjualan_barang(tanggal);
CREATE INDEX idx_retur_tanggal ON retur_penjualan(tanggal);

-- 10. Seed Initial System Settings
INSERT INTO `settings` (`key`, `value`, `created_at`, `updated_at`) VALUES
('ACCURATE_CLIENT_ID', 'your_client_id', NOW(), NOW()),
('ACCURATE_CLIENT_SECRET', 'your_client_secret', NOW(), NOW()),
('ACCURATE_REDIRECT_URI', 'http://localhost:3000/settings', NOW(), NOW()),
('ACCURATE_DB_ID', '12345', NOW(), NOW()),
('ACCURATE_DB_NAME', 'PT. Maju Bersama', NOW(), NOW()),
('SYNC_INTERVAL_CRON', '0 */4 * * *', NOW(), NOW()),
('ACCURATE_ACCESS_TOKEN', '', NOW(), NOW()),
('ACCURATE_REFRESH_TOKEN', '', NOW(), NOW()),
('ACCURATE_SESSION_ID', '', NOW(), NOW()),
('ACCURATE_SESSION_HOST', '', NOW(), NOW())
ON DUPLICATE KEY UPDATE `value`=VALUES(`value`), `updated_at`=NOW();

-- 11. Seed Initial Superadmin Account
-- Password: jasad666
INSERT INTO `users` (`nama`, `email`, `password_hash`, `role`, `is_active`, `two_fa_enabled`, `created_at`, `updated_at`) VALUES
('Superadmin', 'admin@iware.id', '$2b$12$dyaUqrFVQeXkbtNz5DKGFeQwYuvw0erbtDyoRq1s37tj8GIktlQs.', 'admin', 1, 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE `password_hash`=VALUES(`password_hash`), `updated_at`=NOW();

