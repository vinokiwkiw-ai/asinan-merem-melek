import React, { useState } from 'react'
import { Plus, Flame, Search, Sparkles } from 'lucide-react'
import { Category, MenuItem } from '../../types'
import { getProductPhotoUrl } from '../../data/officialData'

interface ProductCollectionProps {
  categories: Category[]
  menuItems: MenuItem[]
  onSelectItem: (item: MenuItem) => void
  cartCount: number
  cartSubtotal: number
  onOpenCart: () => void
}

export const ProductCollection: React.FC<ProductCollectionProps> = ({
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
    bumbu: '🥣',
  }

  const filteredItems = menuItems.filter((item: any) => {
    if (item.availability_status === 'HIDDEN') return false
    const matchesCategory =
      selectedCategoryId === 'all' || item.category_id === selectedCategoryId
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <section id="menu" className="my-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FFF8E8] border border-amber-200 text-amber-900 text-xs font-bold uppercase tracking-widest mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" /> KATALOG RESMI SINGLE SOURCE OF TRUTH
          </div>
          <h2 className="font-display font-black text-3xl sm:text-5xl text-[#183F2E] tracking-tight">
            Katalog Produk <span className="text-emerald-700">Lengkap</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            Seluruh produk, varian, dan harga 100% mengikuti data resmi asinanmeremmelek.site.
          </p>
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari menu (Lengkeng, Bangkok...)"
            className="w-full bg-white border border-slate-200 rounded-full pl-11 pr-4 py-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8BC137]/30 focus:border-[#8BC137] shadow-sm transition"
          />
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
        <button
          onClick={() => setSelectedCategoryId('all')}
          className={`px-4 py-2.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all ${
            selectedCategoryId === 'all'
              ? 'bg-[#8BC137] text-[#183F2E] shadow-sm font-black'
              : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Semua Menu (34) 🥭
        </button>

        {Array.isArray(categories) && categories.map((cat) => {
          const isActive = cat.id === selectedCategoryId
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-4 py-2.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#8BC137] text-[#183F2E] shadow-sm font-black'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {cat.name}
            </button>
          )
        })}
      </div>

      {/* Products Showcase Grid */}
      {(!Array.isArray(filteredItems) || filteredItems.length === 0) ? (
        <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
          <span className="text-4xl">🥭</span>
          <p className="text-slate-500 text-sm mt-3">Tidak ada produk yang sesuai dengan pencarian Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          {filteredItems.map((item) => {
            const photoUrl = getProductPhotoUrl(item.photoKey)
            const emoji = categoryEmoji[item.category_id] || '🥭'

            return (
              <div
                key={item.id}
                className="group relative bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-md hover:border-slate-200 transition-all duration-300 flex flex-col justify-between shadow-sm"
              >
                {/* Photo / Icon Container */}
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-3 bg-slate-50 border border-slate-100 flex items-center justify-center">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        ;(e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <span className="text-4xl">{emoji}</span>
                  )}

                  {item.is_signature && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-[#FFD83D] text-[#183F2E] font-black text-[10px] uppercase px-2.5 py-0.5 rounded-full shadow-sm">
                      <Flame className="w-3 h-3 fill-[#183F2E]" /> BEST SELLER
                    </div>
                  )}
                </div>

                {/* Content Body */}
                <div className="space-y-1.5 flex-1 mb-4">
                  <h3 className="font-display font-bold text-base text-[#183F2E] group-hover:text-emerald-700 transition-colors leading-snug">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Price & Action Button */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Harga Resmi</div>
                    <div className="font-display font-black text-base text-[#183F2E] tabular-nums">
                      Rp {item.base_price.toLocaleString('id-ID')}
                    </div>
                  </div>

                  {(() => {
                    const isAvail = (item.availability_status === 'AVAILABLE' || (!item.availability_status && item.is_available))
                    const isTemp = item.availability_status === 'TEMP_UNAVAILABLE'
                    if (isAvail) {
                      return (
                        <button
                          onClick={() => onSelectItem(item)}
                          className="inline-flex items-center gap-1.5 bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black text-xs px-4 py-2 rounded-full shadow-sm transition-transform active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>Pilih</span>
                        </button>
                      )
                    }
                    return (
                      <button
                        disabled
                        className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-400 font-bold text-xs px-4 py-2 rounded-full cursor-not-allowed"
                      >
                        <span>{isTemp ? 'Tidak Tersedia' : 'Habis'}</span>
                      </button>
                    )
                  })()}
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
            className="w-full bg-[#183F2E] hover:bg-[#122e22] text-white p-4 rounded-full shadow-2xl border border-white/20 flex items-center justify-between transition-all transform active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#8BC137] text-[#183F2E] font-black flex items-center justify-center text-sm shadow-sm">
                {cartCount}
              </div>
              <div className="text-left">
                <div className="text-xs font-black text-white">Lihat Pesanan Keranjang</div>
                <div className="text-[10px] text-white/70">Tekan untuk lanjut checkout</div>
              </div>
            </div>
            <div className="font-display font-black text-base text-[#8BC137]">
              Rp {cartSubtotal.toLocaleString('id-ID')} →
            </div>
          </button>
        </div>
      )}

    </section>
  )
}
