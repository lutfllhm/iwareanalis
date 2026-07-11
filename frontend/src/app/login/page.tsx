'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck, Lock, Mail, Key, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login, verifyOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // OTP states
  const [twoFaRequired, setTwoFaRequired] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [userId, setUserId] = useState<number | null>(null);

  // General States
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  // Handle standard credential submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!captchaVerified) {
      setError('Silakan verifikasi CAPTCHA terlebih dahulu');
      return;
    }

    setLoading(true);

    try {
      const res = await login(email, password, 'mock_captcha_token');
      if (res.twoFaRequired && res.userId) {
        setUserId(res.userId);
        setTwoFaRequired(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login gagal, periksa koneksi internet Anda');
    } finally {
      setLoading(false);
    }
  };

  // Handle 2FA passcode submit
  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!userId || !otpCode) return;

    setLoading(true);

    try {
      await verifyOtp(userId, otpCode);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Kode OTP tidak valid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* LEFT: Brand panel (Sneat-style split layout, hidden on small screens) */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative overflow-hidden bg-linear-to-br from-primary/8 via-background to-fuchsia-500/8 items-center justify-center p-12">
        {/* Decorative curved shapes, Sneat signature look */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 w-96 h-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute top-0 right-0 w-2/3 h-full border-l border-primary/10 mask-[linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]">
          <div className="absolute inset-0 opacity-40" style={{
            backgroundImage: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }} />
        </div>

        <div className="relative z-10 max-w-md text-center">
          <div className="h-16 w-16 rounded-2xl overflow-hidden mx-auto mb-6 shadow-xl shadow-primary/25">
            <Image src="/logo.png" alt="IwAnalytics" width={64} height={64} className="h-full w-full object-cover" />
          </div>
          <h2 className="text-2xl font-black text-foreground tracking-tight mb-3">
            Dashboard Analitik Penjualan
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Pantau tren penjualan, performa marketing, dan segmentasi pelanggan
            secara real-time — terintegrasi langsung dengan Accurate Online.
          </p>
        </div>
      </div>

      {/* RIGHT: Login form panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo (mobile) */}
          <div className="text-center lg:text-left mb-8">
            <div className="h-11 w-11 rounded-xl overflow-hidden mx-auto lg:mx-0 mb-5 shadow-lg shadow-primary/20">
              <Image src="/logo.png" alt="IwAnalytics" width={44} height={44} className="h-full w-full object-cover" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              {twoFaRequired ? 'Verifikasi Dua Faktor! 🔐' : 'Selamat Datang! 👋'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {twoFaRequired
                ? 'Masukkan kode autentikasi 6-digit dari aplikasi Google Authenticator Anda'
                : 'Masuk ke IwAnalytics untuk mulai menganalisis data penjualan Anda'}
            </p>
          </div>

          {/* Global Error Banner */}
          {error && (
            <div className="mb-6 flex items-center space-x-2 p-3.5 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs font-semibold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!twoFaRequired ? (
            /* FORM 1: CREDENTIALS LOGIN */
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              {/* Email input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@dataanalis.com"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-sm text-foreground transition-colors"
                  />
                </div>
              </div>

              {/* Password input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-lg border border-input bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-sm text-foreground transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Simulated Cloudflare Turnstile CAPTCHA */}
              <div className="p-3.5 rounded-lg border border-border bg-muted/40 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="captcha"
                    checked={captchaVerified}
                    onChange={(e) => setCaptchaVerified(e.target.checked)}
                    className="h-4 w-4 accent-primary rounded cursor-pointer"
                  />
                  <label htmlFor="captcha" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                    Saya bukan robot (Turnstile CAPTCHA)
                  </label>
                </div>
                <ShieldCheck className={`w-5 h-5 ${captchaVerified ? 'text-success' : 'text-muted-foreground/40'}`} />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:opacity-90 disabled:opacity-50 transition-opacity text-sm mt-2"
              >
                {loading ? 'Menghubungkan...' : 'Masuk Aplikasi'}
              </button>
            </form>
          ) : (
            /* FORM 2: 2FA OTP ENTRY */
            <form onSubmit={handle2FASubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block text-center">Kode Otentikasi</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={16} />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center tracking-widest font-mono text-lg pl-10 pr-4 py-3 rounded-lg border border-input bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
              >
                {loading ? 'Memverifikasi...' : 'Verifikasi & Masuk'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTwoFaRequired(false);
                  setError('');
                  setOtpCode('');
                }}
                className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Kembali ke Login
              </button>
            </form>
          )}

          {/* Security Disclaimers */}
          <div className="mt-8 pt-5 border-t border-border text-[11px] text-center lg:text-left text-muted-foreground leading-normal">
            <p>Sistem dilindungi dengan pembatasan percobaan login (rate limiting) dan enkripsi access-tokens.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
