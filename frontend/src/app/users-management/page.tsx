'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';
import { UserPlus, Edit3, Trash2, Key, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { AxiosError } from 'axios';

type ApiError = AxiosError<{ message?: string }>;

interface UserRow {
  id: number;
  nama: string;
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
  is_active: boolean;
  two_fa_enabled: boolean;
  last_login: string | null;
}

interface AuditLogRow {
  id: number;
  user_email: string | null;
  aksi: string;
  target: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function UsersManagementPage() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Modal Control States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  // Form Fields States
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'analyst' | 'viewer'>('viewer');
  const [isActive, setIsActive] = useState(true);
  const [resetPassValue, setResetPassValue] = useState('');

  // Fetch Users data
  const { data: usersList, isLoading: isUsersLoading } = useQuery({
    queryKey: ['usersList'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
  });

  // Fetch Audit Logs data
  const { data: auditLogs } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const res = await api.get('/sync/audit-logs', { params: { limit: 15 } });
      return res.data;
    },
  });

  // Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/users', { nama, email, password, role });
      return res.data;
    },
    onSuccess: (data) => {
      setToast({ type: 'success', msg: data.message || 'User berhasil ditambahkan' });
      setShowAddModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['usersList'] });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err: ApiError) => {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Gagal menambahkan user' });
      setTimeout(() => setToast(null), 3000);
    },
  });

  // Edit User Mutation
  const editUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      const res = await api.put(`/users/${selectedUser.id}`, { nama, email, role, is_active: isActive });
      return res.data;
    },
    onSuccess: (data) => {
      setToast({ type: 'success', msg: data.message || 'User berhasil diperbarui' });
      setShowEditModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['usersList'] });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err: ApiError) => {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Gagal memperbarui user' });
      setTimeout(() => setToast(null), 3000);
    },
  });

  // Reset Password Mutation
  const resetPassMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      const res = await api.post(`/users/${selectedUser.id}/reset-password`, { newPassword: resetPassValue });
      return res.data;
    },
    onSuccess: (data) => {
      setToast({ type: 'success', msg: data.message || 'Password berhasil direset' });
      setShowResetModal(false);
      setResetPassValue('');
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err: ApiError) => {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Gagal mereset password' });
      setTimeout(() => setToast(null), 3000);
    },
  });

  // Delete User Mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/users/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      setToast({ type: 'success', msg: data.message || 'User berhasil dihapus' });
      queryClient.invalidateQueries({ queryKey: ['usersList'] });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err: ApiError) => {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Gagal menghapus user' });
      setTimeout(() => setToast(null), 3000);
    },
  });

  const resetForm = () => {
    setNama('');
    setEmail('');
    setPassword('');
    setRole('viewer');
    setIsActive(true);
    setSelectedUser(null);
  };

  const triggerEdit = (user: UserRow) => {
    setSelectedUser(user);
    setNama(user.nama);
    setEmail(user.email);
    setRole(user.role);
    setIsActive(user.is_active);
    setShowEditModal(true);
  };

  const triggerReset = (user: UserRow) => {
    setSelectedUser(user);
    setShowResetModal(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
      case 'analyst':
        return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border border-gray-500/20';
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">Manajemen User & Hak Akses</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Daftar administrator dan staf analis data dashboard, kontrol role (RBAC), dan log audit
          </p>
        </div>

        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity text-sm self-start sm:self-auto"
        >
          <UserPlus size={16} />
          <span>Tambah User</span>
        </button>
      </div>

      {toast && (
        <div className={`p-4 rounded-xl border flex items-center space-x-3 shadow-md ${
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* Main accounts grid and audit monitor */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* SECTION 1: USERS LIST (Left & Center Columns) */}
        <div className="xl:col-span-2 space-y-6">
          <div className="card-elevated bg-card border border-border/60 rounded-xl p-6 overflow-hidden">
            <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider mb-5">Daftar Akun Pengguna</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="p-3 font-bold text-muted-foreground text-xs uppercase">Nama / Email</th>
                    <th className="p-3 font-bold text-muted-foreground text-xs uppercase text-center">Akses Role</th>
                    <th className="p-3 font-bold text-muted-foreground text-xs uppercase text-center">Status</th>
                    <th className="p-3 font-bold text-muted-foreground text-xs uppercase text-center">2FA</th>
                    <th className="p-3 font-bold text-muted-foreground text-xs uppercase text-center">Login Terakhir</th>
                    <th className="p-3 font-bold text-muted-foreground text-xs uppercase text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isUsersLoading ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-xs text-muted-foreground">Memuat data pengguna...</td>
                    </tr>
                  ) : (
                    (usersList || []).map((row: UserRow) => (
                      <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-3">
                          <p className="font-bold text-foreground">{row.nama}</p>
                          <span className="text-xs text-muted-foreground">{row.email}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 text-[9px] font-bold rounded-full uppercase ${getRoleBadge(row.role)}`}>
                            {row.role}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-full ${
                            row.is_active 
                              ? 'bg-emerald-500/10 text-emerald-500' 
                              : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {row.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="p-3 text-center text-xs font-semibold">
                          {row.two_fa_enabled ? 'Aktif' : 'Tidak'}
                        </td>
                        <td className="p-3 text-center text-xs text-muted-foreground">
                          {row.last_login 
                            ? new Date(row.last_login).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) 
                            : '-'}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => triggerEdit(row)}
                              className="p-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-muted"
                              title="Edit User"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => triggerReset(row)}
                              className="p-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-muted"
                              title="Reset Password"
                            >
                              <Key size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Apakah Anda yakin ingin menghapus user ${row.nama}?`)) {
                                  deleteUserMutation.mutate(row.id);
                                }
                              }}
                              className="p-1.5 rounded-lg border border-border bg-card text-destructive hover:bg-destructive/10"
                              title="Hapus User"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SECTION 2: AUDIT LOGS MONITOR (Right Column) */}
        <div className="card-elevated bg-card border border-border/60 rounded-xl p-6 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Log Audit Sistem</h3>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-500 font-bold px-2 py-0.5 rounded-full">15 Terakhir</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {auditLogs?.data && auditLogs.data.length > 0 ? (
              auditLogs.data.map((log: AuditLogRow) => (
                <div key={log.id} className="p-3 rounded-xl border border-border bg-muted/10 space-y-1.5 text-xs text-foreground">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-indigo-500 truncate max-w-[120px]" title={log.user_email || 'System'}>
                      {log.user_email || 'System'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="font-semibold text-foreground">{log.aksi.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{log.target}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-center text-muted-foreground pt-10">Belum ada aktivitas audit log.</p>
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD USER MODAL */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-up">
            <h3 className="text-lg font-black text-foreground">Tambah Pengguna Baru</h3>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Nama Lengkap</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Andi Wijaya"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="andi@company.com"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Password Default</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 10 karakter"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Role Hak Akses</label>
                <select
                  value={role}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRole(e.target.value as 'admin' | 'analyst' | 'viewer')}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none"
                >
                  <option value="viewer">Viewer (Hanya Lihat)</option>
                  <option value="analyst">Analyst (Lihat + Sync + Download)</option>
                  <option value="admin">Admin (Akses Penuh)</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-2 justify-end pt-2">
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted"
              >
                Batal
              </button>
              <button
                onClick={() => createUserMutation.mutate()}
                disabled={!nama || !email || !password || createUserMutation.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs disabled:opacity-50"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT USER MODAL */}
      {/* ========================================================================= */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-up">
            <h3 className="text-lg font-black text-foreground">Edit Data Pengguna</h3>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Nama Lengkap</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Role Hak Akses</label>
                <select
                  value={role}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRole(e.target.value as 'admin' | 'analyst' | 'viewer')}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none"
                >
                  <option value="viewer">Viewer (Hanya Lihat)</option>
                  <option value="analyst">Analyst (Lihat + Sync + Download)</option>
                  <option value="admin">Admin (Akses Penuh)</option>
                </select>
              </div>
              <div className="flex items-center space-x-3 p-2 border border-border rounded-lg">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4.5 w-4.5 text-primary border-border focus:ring-primary rounded"
                />
                <label htmlFor="isActive" className="text-xs font-bold text-foreground cursor-pointer">
                  Akun Aktif (Dapat Login)
                </label>
              </div>
            </div>

            <div className="flex space-x-2 justify-end pt-2">
              <button
                onClick={() => { setShowEditModal(false); resetForm(); }}
                className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted"
              >
                Batal
              </button>
              <button
                onClick={() => editUserMutation.mutate()}
                disabled={!nama || !email || editUserMutation.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs disabled:opacity-50"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RESET PASSWORD MODAL */}
      {/* ========================================================================= */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center space-x-2 text-amber-500">
              <AlertTriangle size={20} />
              <h3 className="text-lg font-black text-foreground">Reset Password</h3>
            </div>
            
            <p className="text-xs text-muted-foreground leading-normal">
              Anda sedang mereset password untuk akun: <strong>{selectedUser.nama}</strong> ({selectedUser.email}).
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Password Baru</label>
              <input
                type="password"
                value={resetPassValue}
                onChange={(e) => setResetPassValue(e.target.value)}
                placeholder="Minimal 10 karakter"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none"
              />
            </div>

            <div className="flex space-x-2 justify-end pt-2">
              <button
                onClick={() => { setShowResetModal(false); setResetPassValue(''); }}
                className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted"
              >
                Batal
              </button>
              <button
                onClick={() => resetPassMutation.mutate()}
                disabled={resetPassValue.length < 10 || resetPassMutation.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs disabled:opacity-50"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
