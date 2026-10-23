'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ShoppingBag,
  MapPin,
  ExternalLink,
  Sparkles,
  User,
  ShieldCheck,
  Menu as MenuIcon,
  X,
} from 'lucide-react'
import { Branch } from '../types'

interface NavbarProps {
  branches: Branch[]
  selectedBranchId: string
  onSelectBranch: (id: string) => void
  cartCount: number
  cartSubtotal: number
}

export const Navbar: React.FC<NavbarProps> = ({
  branches,
  selectedBranchId,
  onSelectBranch,
  cartCount,
  cartSubtotal,
}) => {
  const currentBranch = branches.find((b) => b.id === selectedBranchId) || branches[0]
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [announcement, setAnnouncement] = useState<string>(
    '🥭 PROMO MEREM MELEK: Gratis Greeting Card & Bonus Poin Membership untuk Pemesanan Online!'
  )

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings?.announcement_bar?.text) {
          setAnnouncement(data.settings.announcement_bar.text)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm transition-colors">
      {/* Announcement Bar */}
      <div className="bg-gradient-to-r from-[#FFF8E8] via-[#F4FBEA] to-[#FFF8E8] text-[#183F2E] text-[11px] sm:text-xs py-1.5 px-4 text-center font-bold flex items-center justify-center gap-2 border-b border-[#8BC137]/20">
        <Sparkles className="w-3.5 h-3.5 text-[#8BC137] animate-pulse flex-shrink-0" />
        <span className="truncate">{announcement}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 cursor-pointer group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#FFF8E8] border border-[#8BC137]/30 flex items-center justify-center text-xl sm:text-2xl shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
              🥭
            </div>
            <div>
              <div className="font-display font-black text-lg sm:text-2xl tracking-tight text-[#183F2E] group-hover:text-[#8BC137] transition-colors leading-none">
                Asinan Merem Melek
              </div>
              <p className="text-[10px] sm:text-xs text-[#8BC137] font-extrabold tracking-wide mt-0.5">
                FRESH & NATURAL • EST 2018
              </p>
            </div>
          </Link>

          {/* Desktop Center Branch Selector */}
          <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-full text-xs text-slate-700 shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-[#8BC137] shrink-0" />
            <span className="text-slate-500 font-medium">Cabang:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => onSelectBranch(e.target.value)}
              className="bg-transparent text-[#183F2E] font-black focus:outline-none cursor-pointer border-none p-0 pr-1 text-xs"
            >
              {Array.isArray(branches) &&
                branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-white text-slate-800 font-medium">
                    {b.name}
                  </option>
                ))}
            </select>
            {currentBranch?.gmaps_url && (
              <a
                href={currentBranch.gmaps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8BC137] hover:text-[#7ab02d] transition ml-0.5"
                title="Lihat di Google Maps"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Desktop Navigation Links (Pill Style from Reference 1) */}
          <nav className="hidden lg:flex items-center gap-1.5 text-xs font-bold bg-slate-100/80 p-1 rounded-full border border-slate-200/50">
            <Link
              href="/"
              className={`px-4 py-2 rounded-full transition-all ${
                pathname === '/'
                  ? 'bg-white text-[#183F2E] shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-[#183F2E] hover:bg-white/50'
              }`}
            >
              Beranda
            </Link>
            <Link
              href="/menu"
              className={`px-4 py-2 rounded-full transition-all ${
                pathname === '/menu'
                  ? 'bg-white text-[#183F2E] shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-[#183F2E] hover:bg-white/50'
              }`}
            >
              Menu Rujak & Asinan
            </Link>
            <Link
              href="/account"
              className={`px-4 py-2 rounded-full transition-all flex items-center gap-1.5 ${
                pathname === '/account'
                  ? 'bg-white text-[#183F2E] shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-[#183F2E] hover:bg-white/50'
              }`}
            >
              <User className="w-3.5 h-3.5 text-[#8BC137]" /> Akun & Poin
            </Link>
            <Link
              href="/admin/login"
              className="px-3 py-2 rounded-full text-slate-400 hover:text-slate-700 transition flex items-center gap-1"
              title="Portal Staf Admin"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Staf
            </Link>
          </nav>

          {/* Right Controls: Cart Button & Mobile Menu Toggle */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/cart"
              className="relative flex items-center gap-2.5 bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] px-4 py-2 sm:px-5 sm:py-2.5 rounded-full shadow-md shadow-[#8BC137]/25 font-black transition-all transform active:scale-95"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-[#183F2E]" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#FF5954] text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {cartCount}
                  </span>
                )}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-[9px] uppercase font-bold tracking-wider leading-none text-[#183F2E]/70">
                  Keranjang
                </div>
                <div className="text-xs font-black text-[#183F2E] font-mono">
                  Rp {cartSubtotal.toLocaleString('id-ID')}
                </div>
              </div>
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
              aria-label="Toggle menu navigasi"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-slate-100 space-y-2 text-xs font-bold animate-in fade-in duration-150">
            <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between mb-3">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#8BC137]" /> Cabang:
              </span>
              <select
                value={selectedBranchId}
                onChange={(e) => onSelectBranch(e.target.value)}
                className="bg-transparent text-[#183F2E] font-black text-xs outline-none"
              >
                {Array.isArray(branches) &&
                  branches.map((b) => (
                    <option key={b.id} value={b.id} className="text-slate-800">
                      {b.name}
                    </option>
                  ))}
              </select>
            </div>

            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-2xl transition ${
                pathname === '/' ? 'bg-[#8BC137]/15 text-[#183F2E] font-black' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Beranda
            </Link>
            <Link
              href="/menu"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-2xl transition ${
                pathname === '/menu' ? 'bg-[#8BC137]/15 text-[#183F2E] font-black' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Menu Rujak & Asinan
            </Link>
            <Link
              href="/account"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-2xl transition ${
                pathname === '/account' ? 'bg-[#8BC137]/15 text-[#183F2E] font-black' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Akun & Poin Membership
            </Link>
            <Link
              href="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2.5 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            >
              Portal Staf Admin
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
