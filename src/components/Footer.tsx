"use client";

import React from 'react'
import { Flame, ShieldCheck, Heart, Instagram, ExternalLink, MapPin, ShoppingCart } from 'lucide-react'
import { Branch } from '../types'

interface FooterProps {
  branches: Branch[]
}

export const Footer: React.FC<FooterProps> = ({ branches }) => {
  return (
    <footer className="mt-20 border-t border-slate-200/70 bg-white text-slate-600 text-xs shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FFF8E8] p-1 border border-[#8BC137]/30 flex items-center justify-center text-xl shadow-sm">
                🥭
              </div>
              <div>
                <h3 className="font-display font-extrabold text-lg text-[#183F2E] tracking-tight">
                  Asinan Merem Melek
                </h3>
                <p className="text-[10px] text-[#8BC137] font-extrabold uppercase tracking-wider">
                  Pasti Fresh! Bebas Pengawet dan Pemanis!
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
              Pelopor Asinan & Rujak Buah Segar Khas Indonesia Sejak 2018. Menggunakan 100% perasan sari buah asli, tanpa cuka sintetis, dan tanpa bahan pengawet.
            </p>

            {/* Social & E-commerce links */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href="https://instagram.com/asinanmerem_melek"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-3.5 py-1.5 rounded-full text-xs shadow-sm hover:opacity-95 transition"
              >
                <Instagram className="w-3.5 h-3.5" /> @asinanmerem_melek
              </a>
              <a
                href="https://s.shopee.co.id/5L3OuLgG5H"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-[#EE4D2D] text-white font-bold px-3.5 py-1.5 rounded-full text-xs shadow-sm hover:opacity-95 transition"
              >
                <ShoppingCart className="w-3.5 h-3.5" /> Shopee Store
              </a>
            </div>
          </div>

          {/* Outlets List */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="font-display font-extrabold text-sm text-[#183F2E] uppercase tracking-wider">
              Lokasi Cabang Resmi
            </h4>

            <div className="space-y-2.5">
              {Array.isArray(branches) && branches.map((b) => (
                <div key={b.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="font-bold text-[#183F2E] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#8BC137]" /> {b.name}
                  </div>
                  <div className="text-[11px] text-slate-500 pl-5 leading-snug">{b.address}</div>
                  {b.gmaps_url && (
                    <a
                      href={b.gmaps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#8BC137] font-bold hover:underline pl-5 inline-flex items-center gap-0.5"
                    >
                      Google Maps Location <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Key Guarantees */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-display font-extrabold text-sm text-[#183F2E] uppercase tracking-wider">
              Jaminan Kualitas
            </h4>

            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span>100% Buah Potong Fresh</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span>Kuah Aslinya tanpa Cuka</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span>Gula Aren & Cabai Pilihan</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Flame className="w-3.5 h-3.5" />
                </div>
                <span>Varian Bumbu Bangkok Viral</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Copyright Bar */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} <strong className="text-[#183F2E]">Asinan Merem Melek</strong>. All Rights Reserved.
          </div>
          <div className="flex items-center gap-1">
            Dibuat dengan <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" /> untuk pecinta kuliner segar Indonesia.
          </div>
        </div>

      </div>
    </footer>
  )
}
