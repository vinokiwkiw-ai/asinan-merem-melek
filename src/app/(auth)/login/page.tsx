"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Phone, ShieldCheck, User, Loader2, ArrowRight, Sparkles, CheckCircle2, RotateCw } from 'lucide-react';
import { MangoMascot } from '@/components/mascot/MangoMascot';

function CustomerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const redirectUrl = redirectParam && redirectParam.startsWith('/') ? redirectParam : '/account';

  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Step 1: Request OTP
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phone || phone.replace(/\D/g, '').length < 9) {
      setError('Harap masukkan nomor WhatsApp / HP yang valid (minimal 10 digit).');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REQUEST_OTP',
          phone,
          name: name.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirimkan kode OTP.');
      }

      setMaskedPhone(data.maskedPhone || phone);
      setCooldown(data.cooldownSeconds || 60);
      setStep('OTP');
      setSuccessMsg(data.message || `Kode OTP telah dikirimkan ke nomor ${data.maskedPhone}.`);

      // Display simulation OTP hint if returned by server (e.g. gateway token unconfigured)
      if (data.devOtp) {
        setDevOtpHint(data.devOtp);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mengirimkan kode OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setError('Harap masukkan 6 digit kode OTP yang diterima.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VERIFY_OTP',
          phone,
          otp: otp.trim(),
          name: name.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verifikasi kode OTP gagal.');
      }

      if (data.customer) {
        localStorage.setItem('amm_customer_session', JSON.stringify(data.customer));
        if (data.sessionToken) {
          localStorage.setItem('amm_customer_token', data.sessionToken);
        }
        setSuccessMsg('Verifikasi berhasil! Mengalihkan...');
        setTimeout(() => {
          router.push(redirectUrl);
          router.refresh();
        }, 600);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memverifikasi OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-slate-100 p-8 rounded-3xl shadow-sm space-y-6">
      {/* Mascot & Header */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <MangoMascot state="idle" size="sm" />
        </div>
        <h1 className="text-2xl font-black text-[#183F2E] tracking-tight">
          {step === 'PHONE' ? 'Masuk / Daftar Member' : 'Verifikasi Kode OTP'}
        </h1>
        <p className="text-xs text-slate-500">
          {step === 'PHONE'
            ? 'Verifikasi instan via WhatsApp / SMS tanpa perlu mengingat kata sandi.'
            : `Masukkan 6 digit kode OTP yang kami kirimkan ke ${maskedPhone}`}
        </p>
      </div>

      {/* Feedback message */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-2xl text-center font-medium leading-relaxed">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-2xl text-center flex items-center justify-center gap-2 font-bold leading-relaxed">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Dev / Gateway Simulation OTP Hint */}
      {devOtpHint && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 text-center space-y-1.5">
          <p className="font-bold text-amber-900 flex items-center justify-center gap-1.5">
            <span>⚠️ Mode Simulasi (Gateway WhatsApp Belum Diaktifkan)</span>
          </p>
          <p className="text-[11px] text-amber-700">
            Gunakan kode OTP berikut untuk masuk langsung:
          </p>
          <div className="pt-0.5">
            <span className="inline-block font-mono font-black text-base text-amber-950 tracking-widest bg-amber-200/80 px-4 py-1 rounded-xl border border-amber-300">
              {devOtpHint}
            </span>
          </div>
        </div>
      )}

      {/* STEP 1: PHONE & NAME INPUT */}
      {step === 'PHONE' && (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
              Nama Lengkap (Opsional jika sudah pernah daftar)
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 pl-10 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#183F2E] focus:ring-2 focus:ring-[#8BC137]/20 transition"
                placeholder="Contoh: Budi Santoso"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
              Nomor WhatsApp / HP Aktif <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 pl-10 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#183F2E] focus:ring-2 focus:ring-[#8BC137]/20 transition font-mono"
                placeholder="081234567890"
                required
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Kode verifikasi OTP 6 digit akan dikirimkan ke nomor ini.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black py-3.5 rounded-full shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer text-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Kirim Kode OTP</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* STEP 2: OTP VERIFICATION */}
      {step === 'OTP' && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 text-center uppercase tracking-wider">
              Masukkan 6 Digit Kode OTP
            </label>
            <div className="relative max-w-xs mx-auto">
              <input
                type="text"
                maxLength={6}
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center bg-slate-50 border border-slate-200 rounded-2xl py-3 text-2xl font-mono font-black text-[#183F2E] tracking-widest focus:outline-none focus:bg-white focus:border-[#183F2E] focus:ring-2 focus:ring-[#8BC137]/20 transition"
                placeholder="••••••"
                required
              />
            </div>
            <span className="text-[10px] text-slate-400 text-center block mt-1">
              Kode berlaku selama 5 menit.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black py-3.5 rounded-full shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer text-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Verifikasi & Masuk</span>
              </>
            )}
          </button>

          {/* Resend Cooldown & Change Phone */}
          <div className="pt-2 flex flex-col items-center gap-2 text-xs">
            {cooldown > 0 ? (
              <span className="text-slate-400 font-medium">
                Kirim ulang kode dalam <strong className="text-slate-700 font-mono">{cooldown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleRequestOtp()}
                disabled={loading}
                className="text-[#183F2E] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" /> Kirim Ulang Kode OTP
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setStep('PHONE');
                setOtp('');
                setError('');
                setDevOtpHint(null);
              }}
              className="text-slate-400 hover:text-slate-600 transition"
            >
              Ganti Nomor Telepon
            </button>
          </div>
        </form>
      )}

      {/* Member registration assurance */}
      <div className="pt-4 border-t border-slate-100 text-center space-y-1">
        <p className="text-[11px] text-slate-500 font-medium">
          Nomor baru otomatis terdaftar sebagai Member AMM untuk mengumpulkan poin reward & diskon loyalty.
        </p>
      </div>

    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <div className="min-h-screen bg-[#F8FAF6] flex flex-col justify-center items-center p-4">
      <Suspense fallback={<div className="text-xs text-slate-400">Memuat halaman masuk...</div>}>
        <CustomerLoginForm />
      </Suspense>
    </div>
  );
}
