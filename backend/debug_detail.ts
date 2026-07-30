import prisma from './src/services/db';
import { AccurateService } from './src/services/accurateService';
import axios from 'axios';

// Script sekali-pakai untuk melihat bentuk asli response Accurate
// sales-invoice/detail.do — dijalankan di server produksi (bukan lokal)
// karena butuh koneksi ke DB produksi dan kredensial Accurate yang tersimpan.
// Jalankan: npx ts-node --transpile-only debug_detail.ts
// Hapus file ini setelah selesai debugging.

async function main() {
  const hostSetting = await prisma.setting.findUnique({ where: { key: 'ACCURATE_SESSION_HOST' } });
  const host = hostSetting?.value || '';
  const headers = await AccurateService.getApiTokenHeaders();

  // Ambil satu invoice dari list.do
  const listRes = await axios.get(`${host}/accurate/api/sales-invoice/list.do`, {
    params: { fields: 'id,number,transDate,customer', pageSize: '1' },
    headers,
    maxRedirects: 5,
  });
  console.log('=== LIST RESPONSE ===');
  console.log(JSON.stringify(listRes.data, null, 2));

  const inv = listRes.data?.d?.[0];
  if (!inv) {
    console.log('Tidak ada invoice ditemukan');
    return;
  }

  const detailRes = await axios.get(`${host}/accurate/api/sales-invoice/detail.do`, {
    params: { id: inv.id },
    headers,
    maxRedirects: 5,
  });
  console.log('=== DETAIL RESPONSE ===');
  console.log(JSON.stringify(detailRes.data, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
