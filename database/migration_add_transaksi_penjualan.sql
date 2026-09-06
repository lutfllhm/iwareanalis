-- Migration: Drop Transaksi Penjualan Tables (Not Needed)
-- Date: 2024
-- Description: Menghapus tabel transaksi_penjualan yang tidak diperlukan karena salah API

-- Drop tables yang tidak diperlukan (jika ada)
DROP TABLE IF EXISTS `transaksi_penjualan_return`;
DROP TABLE IF EXISTS `transaksi_penjualan_payment`;
DROP TABLE IF EXISTS `transaksi_penjualan_detail`;
DROP TABLE IF EXISTS `transaksi_penjualan`;

-- Selesai
SELECT 'Tables dropped successfully!' AS status;
