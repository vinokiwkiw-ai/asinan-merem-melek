import React from 'react'
import { Sparkles } from 'lucide-react'

export const KebunKeRujak: React.FC = () => {
  const fruits = [
    { name: 'Mangga Muda Krispi', emoji: '🥭', desc: 'Diiris segar, krispi renyah alami', origin: 'Kebun Pilihan' },
    { name: 'Jambu Mutiara Tanpa Biji', emoji: '🍈', desc: 'Super crunchy tanpa biji', origin: 'Lokal Premium' },
    { name: 'Buah Lengkeng Manis', emoji: '🍈', desc: 'Manis legit murni buah segar', origin: 'Pilihan Petani' },
    { name: 'Salak Bali & Nanas', emoji: '🍍', desc: 'Kombinasi asam manis tropis', origin: 'Fresh Harvest' },
  ]

  return (
    <section className="my-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      
      {/* Section Header */}
      <div className="text-center space-y-3 mb-12">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-[#F5E6A3] text-xs font-bold uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5 text-[#F5E6A3]" /> PROCESS & QUALITY
        </div>

        <h2 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight">
          Dari Kebun <span className="text-[#B7E4C7]">Ke Rujak Segar</span>
        </h2>

        <p className="text-base sm:text-xl text-[#B7E4C7]/90 font-medium max-w-2xl mx-auto">
          "Yang segar, nggak perlu banyak gaya." 100% sari buah alami tanpa cuka sintetis.
        </p>
      </div>

      {/* Floating Fruit Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {fruits.map((item, idx) => (
          <div
            key={idx}
            className="group relative bg-white/[0.08] backdrop-blur-md border border-white/15 rounded-3xl p-6 hover:bg-white/[0.14] hover:border-white/25 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform">
                {item.emoji}
              </div>

              <div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#F5E6A3] text-[#0b3826]">
                  {item.origin}
                </span>
                <h3 className="font-display font-bold text-lg text-white mt-2 group-hover:text-[#B7E4C7] transition-colors">
                  {item.name}
                </h3>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

    </section>
  )
}
