import React, { useState } from 'react'
import { Flame, Sparkles, Plus, Check } from 'lucide-react'
import { OFFICIAL_PRODUCTS } from '../../data/officialData'
import { MenuItem, MoodType } from '../../types'

interface NgerujakMoodProps {
  onSelectItem: (item: MenuItem) => void
}

export const NgerujakMood: React.FC<NgerujakMoodProps> = ({ onSelectItem }) => {
  const [selectedMood, setSelectedMood] = useState<MoodType>('PEDAS')

  const moodOptions: { type: MoodType; label: string; emoji: string; desc: string }[] = [
    { type: 'PEDAS', label: 'PEDAS', emoji: '🌶️', desc: 'Pedas Bangkok & Bebeg' },
    { type: 'SEGAR', label: 'SEGAR', emoji: '🥭', desc: 'Asinan Fruit Mix Kiamboy' },
    { type: 'MANIS', label: 'MANIS', emoji: '🍯', desc: 'Asinan Lengkeng & Rambutan' },
    { type: 'ASAM', label: 'ASAM', emoji: '🍋', desc: 'Mangga Kipas & Mangga Kampung' },
    { type: 'GURIH', label: 'GURIH', emoji: '🥣', desc: 'Bumbu Kacang & Cabe Garam Terasi' },
  ]

  const recommendedItems = OFFICIAL_PRODUCTS.filter(
    (item) => item.mood === selectedMood
  )

  return (
    <section className="my-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      
      {/* Section Title Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-[#F5E6A3] text-xs font-bold uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5 text-[#F5E6A3]" /> SIGNATURE RECOMMENDATION ENGINE
        </div>

        <h2 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight">
          Ngerujak Sesuai <span className="text-[#A8D5A2]">Mood Kamu</span>
        </h2>

        <p className="text-xs sm:text-base text-[#B7E4C7]/80 max-w-xl mx-auto">
          Pilih rasa yang kamu inginkan hari ini dan temukan racikan produk otentik Asinan Merem Melek!
        </p>
      </div>

      {/* Mood Selector Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-4xl mx-auto mb-10">
        {moodOptions.map((mood) => {
          const isActive = mood.type === selectedMood
          return (
            <button
              key={mood.type}
              onClick={() => setSelectedMood(mood.type)}
              className={`p-4 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between ${
                isActive
                  ? 'bg-[#A8D5A2] border-transparent text-[#0b3826] shadow-xl scale-105 ring-2 ring-white/40'
                  : 'bg-white/[0.08] border-white/15 text-white hover:bg-white/15'
              }`}
            >
              <div className="text-3xl mb-1">{mood.emoji}</div>
              <div className="font-display font-black text-sm uppercase">{mood.label}</div>
              <div className={`text-[10px] mt-1 line-clamp-1 ${isActive ? 'text-[#0b3826]/80' : 'text-white/50'}`}>
                {mood.desc}
              </div>
            </button>
          )
        })}
      </div>

      {/* Recommended Products Showcase Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendedItems.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="group bg-white/[0.08] backdrop-blur-md border border-white/15 rounded-3xl p-6 hover:bg-white/[0.14] hover:border-white/25 transition-all duration-300 flex flex-col justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-3xl shadow-inner">
                  {selectedMood === 'PEDAS' ? '🌶️' : selectedMood === 'SEGAR' ? '🥭' : selectedMood === 'MANIS' ? '🍯' : selectedMood === 'ASAM' ? '🍋' : '🥣'}
                </div>

                {item.is_signature && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-[#F5E6A3] text-[#0b3826] px-2.5 py-0.5 rounded-full shadow">
                    <Flame className="w-3 h-3 fill-[#0b3826]" /> BEST SELLER
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-display font-extrabold text-lg text-white group-hover:text-[#B7E4C7] transition-colors">
                  {item.name}
                </h3>
                <p className="text-xs text-white/60 mt-1 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-white/40 uppercase">Harga Resmi</div>
                <div className="font-display font-extrabold text-base text-[#B7E4C7] tabular-nums">
                  Rp {item.base_price.toLocaleString('id-ID')}
                </div>
              </div>

              <button
                onClick={() => onSelectItem(item)}
                className="inline-flex items-center gap-1.5 bg-[#A8D5A2] hover:bg-[#bfe3ba] text-[#0b3826] font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Pilih Menu</span>
              </button>
            </div>
          </div>
        ))}
      </div>

    </section>
  )
}
