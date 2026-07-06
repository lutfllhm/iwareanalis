'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';
import { Settings, Shield, User, RefreshCw, CheckCircle, XCircle, Key, QrCode, Download, ToggleLeft, ToggleRight, Database } from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'accurate' | 'security' | 'download'>('accurate');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Accurate Form Settings
  const [appKey, setAppKey] = useState('');
  const [signatureSecret, setSignatureSecret] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [cronInterval, setCronInterval] = useState('0 */4 * * *');
  const [connectedDbName, setConnectedDbName] = useState('');

  // Password Form Settings
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Download config states
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [allModules] = useState([
    { key: 'barang-jasa', label: 'Daftar Barang & Jasa' },
    { key: 'pelanggan', label: 'Daftar Pelanggan' },
    { key: 'faktur-penjualan', label: 'Daftar Faktur Penjualan' },
    { key: 'rincian-penjualan', label: 'Rincian Penjualan per Barang' },
    { key: 'retur-penjualan', label: 'Daftar Retur Penjualan' },
    { key: 'mutasi-serial-number', label: 'Mutasi Serial Number' },
    { key: 'serial-number-per-gudang', label: 'Serial Number per Gudang' },
    { key: 'ringkasan-mutasi-stok', label: 'Ringkasan Mutasi Stok' },
    { key: 'work-order', label: 'Work Order Detail' },
  ]);

  // 2FA TOTP setup states
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [show2FaSetup, setShow2FaSetup] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [otpVerifyCode, setOtpVerifyCode] = useState('');

  // Fetch active settings config
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data;
    },
  });

  // Fetch active profile details
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    },
  });

  // Fetch download configuration
  const { data: downloadConfigData, refetch: refetchDownloadConfig } = useQuery({
    queryKey: ['downloadConfig'],
    queryFn: async () => {
      const res = await api.get('/settings/download-config');
      return res.data;
    },
  });

  // Load fetched settings values into react state variables
  useEffect(() => {
    if (settingsData) {
      setAppKey(settingsData.ACCURATE_APP_KEY || '');
      setSignatureSecret(settingsData.ACCURATE_SIGNATURE_SECRET || '');
      setApiToken(settingsData.ACCURATE_API_TOKEN || '');
      setCronInterval(settingsData.SYNC_INTERVAL_CRON || '0 */4 * * *');
      setConnectedDbName(settingsData.ACCURATE_DB_NAME || '');
    }
    if (userProfile) {
      setTwoFaEnabled(userProfile.two_fa_enabled || false);
    }
    if (downloadConfigData) {
      setEnabledModules(downloadConfigData.enabledModules || []);
    }
  }, [settingsData, userProfile, downloadConfigData]);

  // Mutation to update general settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/settings/update', payload);
      return res.data;
    },
    onSuccess: (resData) => {
      setToast({ type: 'success', msg: resData.message || 'Pengaturan berhasil diperbarui' });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err: any) => {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Gagal memperbarui pengaturan' });
      setTimeout(() => setToast(null), 3000);
    },
  });

  // Mutation to save & verify Accurate API Token credentials
  const connectApiTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/sync/connect-api-token', {
        appKey,
        signatureSecret,
        apiToken,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setToast({ type: 'success', msg: data.message || 'Berhasil terhubung ke Accurate!' });
      setConnectedDbName(data.dbAlias || '');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err: any) => {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Gagal menghubungkan ke Accurate' });
      setTimeout(() => setToast(null), 3000);
    },
  });

  // Mutation to re-check the currently stored Accurate credentials
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/sync/test-connection');
      return res.data;
    },
    onSuccess: (data) => {
      setToast({ type: 'success', msg: data.message || 'Koneksi ke Accurate berhasil' });
      setConnectedDbName(data.dbAlias || '');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setTimeout(() => setToast(null), 4000);
    },
    onError: (err: any) => {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Gagal terhubung ke Accurate' });
      setTimeout(() => setToast(null), 6000);
    },
  });

  // User password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error('Password konfirmasi tidak cocok');
      }
      if (newPassword.length < 10) {
        throw new Error('Password baru minimal harus 10 karakter');
      }
      // Target profile password update route
      const me = await api.get('/auth/me');
      const res = await api.post(`/users/${me.data.id}/reset-password`, { newPassword });
      return res.data;
    },
    onSuccess: (data) => {
      setToast({ type: 'success', msg: data.message || 'Password berhasil diperbarui' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err: any) => {
      setToast({ type: 'error', msg: err.message || 'Gagal memperbarui password' });
      setTimeout(() => setToast(null), 3000);
    },
  });

  // 2FA setup mutation
  const setup2FaMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/auth/setup-2fa');
      return res.data;
    },
    onSuccess: (data) => {
      setQrCodeUrl(data.qrCodeUrl);
      setShow2FaSetup(true);
    },
    onError: (err: any) => {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Gagal memicu setup 2FA' });
      setTimeout(() => setToast(null), 3000);
    },
  });

  // Confirm 2FA OTP passcode mutation
  const confirm2FaMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/auth/confirm-2fa', { code: otpVerifyCode });
      return res.data;
    },
    onSuccess: () => {
      setToast({ type: 'success', msg: '2FA berhasil diaktifkan!' });
      setTwoFaEnabled(true);
      setShow2FaSetup(false);
      setQrCodeUrl('');
      setOtpVerifyCode('');
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err: any) => {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Verifikasi kode OTP gagal' });
      setTimeout(() => setToast(null), 3000);
    },
  });

  // Disable 2FA mutation
  const disable2FaMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/auth/disable-2fa');
      return res.data;
    },
    onSuccess: () => {
      setToast({ type: 'success', msg: '2FA berhasil dinonaktifkan' });
      setTwoFaEnabled(false);
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err: any) => {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Gagal menonaktifkan 2FA' });
      setTimeout(() => setToast(null), 3000);
    },
  });

  // Mutation to save download config
  const updateDownloadConfigMutation = useMutation({
    mutationFn: async (modules: string[]) => {
      const res = await api.post('/settings/download-config', { enabledModules: modules });
      return res.data;
    },
    onSuccess: (resData) => {
      setToast({ type: 'success', msg: resData.message || 'Konfigurasi download berhasil disimpan' });
      refetchDownloadConfig();
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err: any) => {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Gagal menyimpan konfigurasi download' });
      setTimeout(() => setToast(null), 3000);
    },
  });

  const toggleModule = (moduleKey: string) => {
    setEnabledModules((prev) =>
      prev.includes(moduleKey) ? prev.filter((m) => m !== moduleKey) : [...prev, moduleKey]
    );
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">Pengaturan</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Konfigurasi sambungan API Accurate Online, jadwal otomatis, preferensi, dan keamanan akun
          </p>
        </div>
      </div>

      {toast && (
        <div className={`p-4 rounded-xl border flex items-center space-x-3 shadow-md ${
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* Tabs configuration header */}
      <div className="flex space-x-1.5 border-b border-border">
        <button
          onClick={() => setActiveTab('accurate')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all duration-150 ${
            activeTab === 'accurate'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Settings size={16} />
            <span>Koneksi Accurate Online</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all duration-150 ${
            activeTab === 'security'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Shield size={16} />
            <span>Keamanan Akun</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('download')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all duration-150 ${
            activeTab === 'download'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Download size={16} />
            <span>Download Database</span>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'accurate' ? (
          /* TAB 1: ACCURATE ONLINE INTEGRATION PARAMETERS */
          <div className="space-y-6">
            
            {/* Credentials Card */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Kredensial API Token</h3>
                {connectedDbName && (
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold rounded-full">
                    Terhubung: {connectedDbName}
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Dapatkan App Key dari Area Developer Accurate, lalu minta pengguna Accurate Online meng-install
                aplikasi tersebut dan membuat API Token dari menu Accurate Store - API Token.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">App Key</label>
                  <input
                    type="text"
                    value={appKey}
                    onChange={(e) => setAppKey(e.target.value)}
                    placeholder="App Key dari Area Developer"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Signature Secret</label>
                  <input
                    type="password"
                    value={signatureSecret}
                    onChange={(e) => setSignatureSecret(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-muted-foreground">API Token</label>
                  <input
                    type="password"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder="API Token yang dibuat pengguna Accurate Online"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/50">
                <button
                  onClick={() => testConnectionMutation.mutate()}
                  disabled={testConnectionMutation.isPending || !connectedDbName}
                  title={!connectedDbName ? 'Simpan & hubungkan kredensial terlebih dahulu' : 'Cek ulang kredensial yang sudah tersimpan ke Accurate'}
                  className="px-4 py-2.5 rounded-xl border border-input bg-background/50 text-foreground font-semibold hover:bg-accent transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw size={14} className={testConnectionMutation.isPending ? 'animate-spin' : ''} />
                  {testConnectionMutation.isPending ? 'Menguji...' : 'Test Koneksi'}
                </button>
                <button
                  onClick={() => connectApiTokenMutation.mutate()}
                  disabled={connectApiTokenMutation.isPending || !appKey || !signatureSecret || !apiToken}
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
                >
                  {connectApiTokenMutation.isPending ? 'Menghubungkan...' : 'Simpan & Hubungkan dengan Accurate'}
                </button>
              </div>
            </div>

            {/* Cron schedule Card */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Penjadwalan Sinkronisasi Otomatis (Cron)</h3>
              
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Ekspresi Cron</label>
                  <input
                    type="text"
                    value={cronInterval}
                    onChange={(e) => setCronInterval(e.target.value)}
                    placeholder="0 */4 * * *"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 text-sm font-mono text-foreground focus:outline-none"
                  />
                </div>

                {/* Preconfigured selector boxes */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCronInterval('0 */1 * * *')}
                    className="px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-muted text-xs text-foreground font-semibold"
                  >
                    Setiap 1 Jam
                  </button>
                  <button
                    onClick={() => setCronInterval('0 */4 * * *')}
                    className="px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-muted text-xs text-foreground font-semibold"
                  >
                    Setiap 4 Jam (Default)
                  </button>
                  <button
                    onClick={() => setCronInterval('0 0 * * *')}
                    className="px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-muted text-xs text-foreground font-semibold"
                  >
                    Setiap Tengah Malam
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-border/50">
                <button
                  onClick={() => updateSettingsMutation.mutate({ SYNC_INTERVAL_CRON: cronInterval })}
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md"
                >
                  Perbarui Jadwal Sync
                </button>
              </div>
            </div>

          </div>
        ) : activeTab === 'download' ? (
          /* TAB 3: DOWNLOAD DATABASE SETTINGS */
          <div className="space-y-6">
            <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Database size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Izin Download Per Menu</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Aktifkan atau nonaktifkan kemampuan download database penuh untuk setiap menu data. Hanya admin yang dapat mengubah pengaturan ini.</p>
                </div>
              </div>

              <div className="divide-y divide-border/50">
                {allModules.map((mod) => {
                  const isEnabled = enabledModules.includes(mod.key);
                  const isAdmin = userProfile?.role === 'admin';
                  return (
                    <div
                      key={mod.key}
                      className="flex items-center justify-between py-4"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          isEnabled ? 'bg-emerald-500/10' : 'bg-muted'
                        }`}>
                          <Download size={16} className={isEnabled ? 'text-emerald-500' : 'text-muted-foreground'} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{mod.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {isEnabled ? 'Download diperbolehkan' : 'Download dinonaktifkan'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => isAdmin && toggleModule(mod.key)}
                        disabled={!isAdmin}
                        title={!isAdmin ? 'Hanya admin yang dapat mengubah ini' : undefined}
                        className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${
                          isEnabled ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                        }`}
                        style={{ width: '52px' }}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                            isEnabled ? 'translate-x-[28px]' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              {userProfile?.role === 'admin' && (
                <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{enabledModules.length}</span> dari {allModules.length} menu diaktifkan
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEnabledModules(allModules.map(m => m.key))}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                    >
                      Aktifkan Semua
                    </button>
                    <button
                      onClick={() => setEnabledModules([])}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 transition-colors"
                    >
                      Nonaktifkan Semua
                    </button>
                    <button
                      onClick={() => updateDownloadConfigMutation.mutate(enabledModules)}
                      disabled={updateDownloadConfigMutation.isPending}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {updateDownloadConfigMutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </button>
                  </div>
                </div>
              )}

              {userProfile?.role !== 'admin' && (
                <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                    ⚠️ Hanya administrator yang dapat mengubah pengaturan download database.
                  </p>
                </div>
              )}
            </div>

            {/* Info card */}
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Informasi Download</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Download mengekspor <strong>seluruh data</strong> dari database lokal (bukan hanya halaman yang ditampilkan).</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>File diunduh dalam format <strong>CSV dengan encoding UTF-8 BOM</strong> sehingga langsung kompatibel dengan Microsoft Excel.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Tombol download tersedia di setiap halaman menu data (Barang & Jasa, Pelanggan, Faktur, dll).</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Hanya pengguna dengan role <strong>Admin atau Analyst</strong> yang dapat mendownload database.</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          /* TAB 2: ACCOUNT SECURITY, PASSWORDS & 2FA */
          <div className="space-y-6">
            
            {/* Password resetting card */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Perbarui Password Akun</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Password Baru</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 10 karakter"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 text-sm text-foreground focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Konfirmasi Password Baru</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Konfirmasi password baru"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 text-sm text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border/50">
                <button
                  onClick={() => changePasswordMutation.mutate()}
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md"
                >
                  Ubah Password
                </button>
              </div>
            </div>

            {/* TOTP 2FA Authentication Setup */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Autentikasi Dua Faktor (2FA - TOTP)</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Amankan login Anda menggunakan verifikasi kode OTP Google Authenticator</p>
                </div>
                
                {twoFaEnabled ? (
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold rounded-full">
                    Aktif
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-bold rounded-full">
                    Nonaktif
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-border/50">
                {twoFaEnabled ? (
                  <button
                    onClick={() => disable2FaMutation.mutate()}
                    className="px-4 py-2.5 rounded-xl border border-destructive/20 hover:bg-destructive/10 text-destructive text-sm font-semibold transition-colors"
                  >
                    Nonaktifkan 2FA
                  </button>
                ) : (
                  !show2FaSetup && (
                    <button
                      onClick={() => setup2FaMutation.mutate()}
                      className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md"
                    >
                      Aktifkan 2FA
                    </button>
                  )
                )}
              </div>

              {/* Renders QR code scanner on active setup */}
              {show2FaSetup && qrCodeUrl && (
                <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col md:flex-row items-center md:items-start gap-6 animate-fade-in">
                  <div className="bg-white p-3 rounded-xl border border-border flex-shrink-0">
                    <img src={qrCodeUrl} alt="2FA QR Code" className="w-40 h-40" />
                  </div>
                  <div className="space-y-4 flex-1">
                    <h4 className="text-sm font-bold text-foreground">Langkah Aktivasi 2FA:</h4>
                    <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                      <li>Buka aplikasi authenticator Anda (Google Authenticator, Microsoft Authenticator, dll).</li>
                      <li>Scan QR Code di samping menggunakan kamera smartphone Anda.</li>
                      <li>Masukkan 6-digit kode verifikasi yang muncul di aplikasi ke input di bawah ini.</li>
                    </ol>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground">Kode OTP</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={otpVerifyCode}
                          onChange={(e) => setOtpVerifyCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="123456"
                          className="px-4 py-2 rounded-xl border border-input bg-card text-sm text-foreground focus:outline-none w-32"
                        />
                        <button
                          onClick={() => confirm2FaMutation.mutate()}
                          disabled={otpVerifyCode.length !== 6 || confirm2FaMutation.isPending}
                          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
                        >
                          Verifikasi
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
