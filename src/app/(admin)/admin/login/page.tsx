'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, ShieldCheck, RefreshCw } from 'lucide-react'
import { MangoMascot } from '@/components/mascot/MangoMascot'

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Kredensial tidak valid. Periksa kembali ID dan kata sandi Anda.')
      }

      sessionStorage.setItem('amm_admin_user', JSON.stringify(data.user))
      router.push('/admin')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Kredensial tidak valid. Periksa kembali ID dan kata sandi Anda.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAF6] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="relative w-full max-w-md">
        <div className="bg-white border border-slate-100 p-8 rounded-3xl shadow-sm space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <MangoMascot state="idle" size="md" />
            </div>
            <h1 className="text-2xl font-black text-[#183F2E] tracking-tight">Portal Staf & Kasir</h1>
            <p className="text-xs text-slate-500 mt-1">Asinan Merem Melek — Control Panel RBAC</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-2xl text-center font-medium">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                ID Staf / Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#183F2E] focus:ring-2 focus:ring-[#8BC137]/20 transition text-sm"
                placeholder="Masukkan ID / username staf"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#183F2E] focus:ring-2 focus:ring-[#8BC137]/20 transition text-sm pr-11"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Memeriksa Kredensial...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> Masuk ke Dashboard
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="pt-2 text-center">
            <span className="text-[11px] text-slate-400 block flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#8BC137]" />
              Akses khusus staf dan kasir terdaftar Asinan Merem Melek.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
