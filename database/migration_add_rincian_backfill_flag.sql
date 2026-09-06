-- Migrasi: penanda kegagalan backfill rincian invoice
--
-- Tanpa penanda ini, backfillInvoiceDetails() mengambil invoice yang sama
-- setiap siklus selama invoice itu belum punya rincian. Invoice yang tidak
-- mungkin berhasil (nomornya sudah tidak ada di Accurate, atau tidak punya
-- detailItem) membuat batch terdepan terulang terus dan backfill macet.
--
-- MySQL 8.0 tidak punya "ADD COLUMN IF NOT EXISTS", jadi dipakai prosedur
-- yang memeriksa information_schema dulu. Aman dijalankan berulang kali.

DROP PROCEDURE IF EXISTS add_rincian_backfill_flag;

DELIMITER $$
CREATE PROCEDURE add_rincian_backfill_flag()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'faktur_penjualan'
      AND COLUMN_NAME = 'rincian_backfill_gagal'
  ) THEN
    ALTER TABLE `faktur_penjualan`
      ADD COLUMN `rincian_backfill_gagal` BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN `rincian_backfill_error` VARCHAR(255) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'faktur_penjualan'
      AND INDEX_NAME = 'idx_faktur_backfill_gagal'
  ) THEN
    CREATE INDEX `idx_faktur_backfill_gagal`
      ON `faktur_penjualan` (`rincian_backfill_gagal`, `tanggal`);
  END IF;
END$$
DELIMITER ;

CALL add_rincian_backfill_flag();
DROP PROCEDURE add_rincian_backfill_flag;
