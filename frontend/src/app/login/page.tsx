'use client';

import React, { useState } from 'react';
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
    } catch (err: any) {
      setError(err.message || 'Login gagal, periksa koneksi internet Anda');
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
    } catch (err: any) {
      setError(err.message || 'Kode OTP tidak valid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#070b19] px-4 overflow-hidden">
      
      {/* Decorative dynamic ambient glow circles */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-primary/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-indigo-500/20 rounded-full blur-[100px] animate-pulse delay-700" />

      {/* Main card */}
      <div className="w-full max-w-md bg-card/65 backdrop-blur-xl border border-border/40 rounded-3xl p-8 shadow-2xl relative z-10">
        
        {/* Logo and Headings */}
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <ShieldCheck className="text-white" size={26} />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            {twoFaRequired ? 'Verifikasi Dua Faktor' : 'Akses Dashboard'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            {twoFaRequired
              ? 'Masukkan kode autentikasi 6-digit dari aplikasi Google Authenticator Anda'
              : 'Dashboard Analisis Accurate Online (AIware)'}
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 flex items-center space-x-2 p-3.5 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs font-semibold animate-shake">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!twoFaRequired ? (
          /* FORM 1: CREDENTIALS LOGIN */
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            
            {/* Email input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@dataanalis.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border/80 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-foreground"
                />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-border/80 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-foreground"
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
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="captcha"
                  checked={captchaVerified}
                  onChange={(e) => setCaptchaVerified(e.target.checked)}
                  className="h-5 w-5 text-primary border-border focus:ring-primary rounded cursor-pointer"
                />
                <label htmlFor="captcha" className="text-xs font-bold text-foreground cursor-pointer select-none">
                  Saya bukan robot (Turnstile CAPTCHA)
                </label>
              </div>
              <ShieldCheck className={`w-5 h-5 ${captchaVerified ? 'text-emerald-500 animate-bounce' : 'text-muted-foreground/45'}`} />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-opacity text-sm mt-2"
            >
              {loading ? 'Menghubungkan...' : 'Masuk Aplikasi'}
            </button>
          </form>
        ) : (
          /* FORM 2: 2FA OTP ENTRY */
          <form onSubmit={handle2FASubmit} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block text-center">Kode Otentikasi</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={16} />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center tracking-widest font-mono text-lg pl-10 pr-4 py-3 rounded-xl border border-border/80 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
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
        <div className="mt-8 pt-5 border-t border-border/30 text-[10px] text-center text-muted-foreground leading-normal">
          <p>Sistem dilindungi dengan pembatasan percobaan login (rate limiting) dan enkripsi access-tokens.</p>
        </div>

      </div>
    </div>
  );
}
