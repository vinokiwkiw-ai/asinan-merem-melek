"use client";

import React, { useState } from 'react'
import { Plus, Flame, Search, ShoppingBag, Sparkles, Check } from 'lucide-react'
import { Category, MenuItem } from '../types'

interface MenuGridProps {
  categories: Category[]
  menuItems: MenuItem[]
  onSelectItem: (item: MenuItem) => void
  cartCount: number
  cartSubtotal: number
  onOpenCart: () => void
}

export const MenuGrid: React.FC<MenuGridProps> = ({
  categories,
  menuItems,
  onSelectItem,
  cartCount,
  cartSubtotal,
  onOpenCart,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const categoryEmoji: Record<string, string> = {
    asinan: '🥭',
    'rujak-buah': '🌶️',
    'mangga-paket': '🎁',
    musiman: '⭐',
    bumbu: '🥣',
  }

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategoryId === 'all' || item.category_id === selectedCategoryId
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <section id="menu" className="my-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Section Header matching asinanmeremmelek.site */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-[#F5E6A3] text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#F5E6A3] animate-pulse" /> MENU RESMI ASINAN MEREM MELEK
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            Menu <span className="text-[#B7E4C7]">Segar & Otentik</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#B7E4C7]/80 mt-1 max-w-xl">
            Pasti Fresh! Bebas Pengawet dan Pemanis Buatan. Diolah murni dari perasan sari buah tropis alami.
          </p>
        </div>

        {/* Search Input Box */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari menu (Kiamboy, Bangkok...)"
            className="w-full bg-white/5 border border-white/15 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#A8D5A2] backdrop-blur-md"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
        <button
          onClick={() => setSelectedCategoryId('all')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
            selectedCategoryId === 'all'
              ? 'bg-[#A8D5A2] text-[#0b3826] shadow-lg scale-105'
              : 'bg-white/10 border border-white/15 text-white/80 hover:text-white hover:bg-white/15'
          }`}
        >
          Semua Menu (31) 🥭
        </button>

        {categories.map((cat) => {
          const isActive = cat.id === selectedCategoryId
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#A8D5A2] text-[#0b3826] shadow-lg scale-105'
                  : 'bg-white/10 border border-white/15 text-white/80 hover:text-white hover:bg-white/15'
              }`}
            >
              {cat.name}
            </button>
          )
        })}
      </div>

      {/* Menu Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-3xl p-8">
          <span className="text-4xl">🥭</span>
          <p className="text-white/60 text-sm mt-3">Tidak ada menu yang sesuai dengan pencarian Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          {filteredItems.map((item) => {
            const emoji = categoryEmoji[item.category_id] || '🥭'

            return (
              <div
                key={item.id}
                className="group relative bg-white/[0.08] backdrop-blur-md border border-white/15 rounded-3xl p-5 hover:bg-white/[0.14] hover:border-white/25 transition-all duration-300 flex flex-col justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
              >
                {/* Header Badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-2xl shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                    {emoji}
                  </div>

                  {item.is_signature && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-[#F5E6A3] text-[#0b3826] px-2.5 py-0.5 rounded-full shadow">
                      <Flame className="w-3 h-3 fill-[#0b3826]" /> BEST SELLER
                    </span>
                  )}
                </div>

                {/* Content Body */}
                <div className="space-y-1.5 flex-1 mb-4">
                  <h3 className="font-display font-bold text-base text-white group-hover:text-[#B7E4C7] transition-colors leading-snug">
                    {item.name}
                  </h3>
                  <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Footer Price & Add Button */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Harga Resmi</div>
                    <div className="font-display font-extrabold text-base text-[#B7E4C7] tabular-nums">
                      Rp {item.base_price.toLocaleString('id-ID')}
                    </div>
                  </div>

                  {item.is_available ? (
                    <button
                      onClick={() => onSelectItem(item)}
                      className="inline-flex items-center gap-1.5 bg-[#A8D5A2] hover:bg-[#bfe3ba] text-[#0b3826] font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-md transition-transform active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Pilih</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center gap-1.5 bg-white/10 text-white/40 font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-md cursor-not-allowed"
                    >
                      <span>Habis</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Floating Mobile Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden">
          <button
            onClick={onOpenCart}
            className="w-full bg-[#25D366] hover:bg-emerald-500 text-white p-4 rounded-2xl shadow-2xl border border-white/20 flex items-center justify-between transition-all transform active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 text-white font-black flex items-center justify-center text-sm shadow-md">
                {cartCount}
              </div>
              <div className="text-left">
                <div className="text-xs font-extrabold text-white">Lihat Pesanan Keranjang</div>
                <div className="text-[10px] text-white/80">Tekan untuk bayar via WhatsApp</div>
              </div>
            </div>
            <div className="font-display font-extrabold text-base text-white">
              Rp {cartSubtotal.toLocaleString('id-ID')} →
            </div>
          </button>
        </div>
      )}

    </section>
  )
}
