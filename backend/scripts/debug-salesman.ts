/**
 * Read-only diagnostic: cetak raw JSON dari sales-invoice/detail.do untuk satu
 * invoice, supaya kita bisa lihat nama field asli untuk "Penjual" per baris
 * barang (terlihat di UI Accurate pada form Rincian Barang, field "Penjual").
 * Tidak menulis apapun ke database maupun ke Accurate.
 *
 * Jalankan: npx ts-node-dev --transpile-only scripts/debug-salesman.ts <nomor_invoice>
 */
import prisma from '../src/services/db';
import { AccurateService } from '../src/services/accurateService';
import { axiosGetWithRetry } from '../src/services/accurateService';

async function main() {
  const invoiceNumber = process.argv[2];
  if (!invoiceNumber) {
    console.error('Usage: ts-node scripts/debug-salesman.ts <nomor_invoice>');
    process.exit(1);
  }

  const headers = await AccurateService.getApiTokenHeaders();
  const host = await AccurateService.getSetting('ACCURATE_SESSION_HOST');

  // Cari id internal Accurate lewat list.do berdasar nomor invoice
  const listRes = await axiosGetWithRetry(`${host}/accurate/api/sales-invoice/list.do`, {
    params: {
      'filter.keywords.op': 'EQUAL',
      'filter.keywords.val[0]': invoiceNumber,
      'sp.pageSize': 5,
    },
    headers,
    maxRedirects: 5,
  });
  console.log('--- LIST RESPONSE ---');
  console.log(JSON.stringify(listRes.data, null, 2));

  const invId = (listRes.data as any)?.d?.[0]?.id;
  if (!invId) {
    console.error('Invoice tidak ditemukan lewat list.do, coba cek nomor invoice.');
    process.exit(1);
  }

  const detailRes = await axiosGetWithRetry(`${host}/accurate/api/sales-invoice/detail.do`, {
    params: { id: invId },
    headers,
    maxRedirects: 5,
  });
  console.log('--- DETAIL RESPONSE ---');
  console.log(JSON.stringify(detailRes.data, null, 2));
}

main()
  .catch((err) => {
    console.error('ERROR:', err.response?.data || err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
