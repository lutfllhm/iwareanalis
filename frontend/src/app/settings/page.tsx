'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';
import { Settings, Shield, User, RefreshCw, CheckCircle, XCircle, Key, QrCode, Download, ToggleLeft, ToggleRight, Database } from 'lucide-react';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

function SettingsContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'accurate' | 'security' | 'download'>('accurate');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Accurate Form Settings
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [cronInterval, setCronInterval] = useState('0 */4 * * *');
  const [selectedDb, setSelectedDb] = useState('');
  const [selectedDbName, setSelectedDbName] = useState('');
  const [databasesList, setDatabasesList] = useState<any[]>([]);

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

  // Handle redirect back from Accurate OAuth callback
  useEffect(() => {
    const connected = searchParams.get('accurate_connected');
    const error = searchParams.get('accurate_error');

    if (connected === 'true') {
      setToast({ type: 'success', msg: 'Berhasil terhubung ke Accurate! Memuat daftar database...' });
      // Auto-load database list
      api.get('/sync/databases').then((res) => {
        setDatabasesList(res.data || []);
      }).catch(() => {
        setToast({ type: 'error', msg: 'Terhubung ke Accurate, tapi gagal memuat daftar database.' });
      });
      // Clean URL
      window.history.replaceState({}, '', '/settings');
    } else if (error) {
      setToast({ type: 'error', msg: `Gagal terhubung ke Accurate: ${decodeURIComponent(error)}` });
      window.history.replaceState({}, '', '/settings');
    }
  }, [searchParams]);

  // Load fetched settings values into react state variables
  useEffect(() => {
    if (settingsData) {
      setClientId(settingsData.ACCURATE_CLIENT_ID || '');
      setClientSecret(settingsData.ACCURATE_CLIENT_SECRET || '');
      setCronInterval(settingsData.SYNC_INTERVAL_CRON || '0 */4 * * *');
      setSelectedDb(settingsData.ACCURATE_DB_ID || '');
      setSelectedDbName(settingsData.ACCURATE_DB_NAME || '');
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

  // Mutation to connect / authorize Accurate
  const connectAccurateMutation = useMutation({
    mutationFn: async () => {
      // Step 1: Save keys to database first
      await api.post('/settings/update', {
        ACCURATE_CLIENT_ID: clientId,
        ACCURATE_CLIENT_SECRET: clientSecret,
      });

      // Step 2: Request auth connection url
      const res = await api.get('/sync/connect');
      return res.data;
    },
    onSuccess: (data) => {
      // Redirect to authorization URL in same window
      if (data.authUrl) {
        // Use same window instead of opening new tab for proper OAuth flow
        window.location.href = data.authUrl;
      }
    },
    onError: (err: any) => {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Koneksi gagal' });
      setTimeout(() => setToast(null), 3000);
    },
  });

  // Manual callback verification input code
  const [oauthCallbackCode, setOauthCallbackCode] = useState('');
  const callbackMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/sync/callback', { code: oauthCallbackCode });
      return res.data;
    },
    onSuccess: (data) => {
      setToast({ type: 'success', msg: 'Berhasil terhubung ke Accurate!' });
      setDatabasesList(data.databases || []);
      setOauthCallbackCode('');
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err: any) => {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Gagal menukarkan kode OAuth' });
      setTimeout(() => setToast(null), 3000);
    },
  });

  // Select database company mutation
  const selectDbMutation = useMutation({
    mutationFn: async (payload: { dbId: string; dbName: string }) => {
      const res = await api.post('/sync/select-db', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setToast({ type: 'success', msg: data.message || 'Database berhasil dipilih' });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err: any) => {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Gagal memilih database' });
      setTimeout(() => setToast(null), 3000);
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
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Kredensial API (OAuth2)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Client ID</label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Masukkan Accurate Client ID"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Client Secret</label>
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  />
                </div>
              </div>

              <div className="bg-muted/30 p-3 rounded-xl text-xs text-muted-foreground">
                <strong>Redirect URI resmi aplikasi:</strong> <code>{`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5010'}/api/sync/callback`}</code>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <button
                  onClick={() => updateSettingsMutation.mutate({
                    ACCURATE_CLIENT_ID: clientId,
                    ACCURATE_CLIENT_SECRET: clientSecret,
                  })}
                  className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground text-sm font-semibold transition-colors"
                >
                  Simpan Kredensial
                </button>

                <button
                  onClick={() => connectAccurateMutation.mutate()}
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity text-sm"
                >
                  Hubungkan dengan Accurate
                </button>
              </div>
            </div>

            {/* Oauth callback validation box */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Verifikasi Callback Otorisasi</h3>
              <p className="text-xs text-muted-foreground">Setelah menyetujui akses di tab Accurate, Anda akan diarahkan ke halaman setting ini kembali dengan parameter <code>?code=xxxx</code> di URL bar browser Anda. Salin parameter code tersebut dan verifikasi di bawah.</p>
              
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={oauthCallbackCode}
                  onChange={(e) => setOauthCallbackCode(e.target.value)}
                  placeholder="Contoh: a818b2c8-5bd5-4277-bf30-..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-input bg-background/50 text-sm text-foreground focus:outline-none"
                />
                <button
                  onClick={() => callbackMutation.mutate()}
                  disabled={callbackMutation.isPending || !oauthCallbackCode}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-md hover:bg-indigo-700 disabled:opacity-50 text-sm"
                >
                  Proses Token
                </button>
              </div>

              {/* Mapped company lists */}
              {databasesList.length > 0 && (
                <div className="pt-4 border-t border-border space-y-3">
                  <h4 className="text-xs font-bold text-foreground">Pilih Database Perusahaan Anda:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {databasesList.map((db: any) => (
                      <button
                        key={db.id}
                        onClick={() => selectDbMutation.mutate({ dbId: db.id, dbName: db.name })}
                        className="p-3 text-left border border-border hover:border-primary/50 hover:bg-primary/5 rounded-xl transition-all"
                      >
                        <p className="text-sm font-bold text-foreground">{db.name}</p>
                        <span className="text-[10px] text-muted-foreground">ID DB: {db.id}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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


export default function SettingsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Memuat pengaturan...</div>
        </div>
      </DashboardLayout>
    }>
      <SettingsContent />
    </Suspense>
  );
}
