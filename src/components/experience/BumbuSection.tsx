import React from 'react'
import { Sparkles, Check, Flame } from 'lucide-react'
import { OFFICIAL_BUMBU_VARIANTS } from '../../data/officialData'

export const BumbuSection: React.FC = () => {
  return (
    <section className="my-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      
      {/* Section Header */}
      <div className="text-center space-y-2 mb-10">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FFF8E8] border border-amber-200 text-amber-900 text-xs font-bold uppercase tracking-widest">
          <Flame className="w-3.5 h-3.5 text-amber-600" /> HOMEMADE SEASONING CRAFT
        </div>

        <h2 className="font-display font-black text-3xl sm:text-5xl text-[#183F2E] tracking-tight">
          Varian Bumbu Rujak <span className="text-emerald-700">Otentik Viral</span>
        </h2>

        <p className="text-xs sm:text-base text-slate-600 max-w-xl mx-auto">
          Setiap porsi dibuat dengan racikan bumbu khas Merem Melek. Dari taburan Bumbu Bangkok hingga Uleg Gula Aren!
        </p>
      </div>

      {/* Bumbu Cards Presentation */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {OFFICIAL_BUMBU_VARIANTS.map((bumbu, idx) => (
          <div
            key={bumbu.id}
            className="group relative bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-md transition-all duration-300 flex flex-col justify-between shadow-sm text-center"
          >
            <div className="space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#F8FAF6] border border-slate-200/60 flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform">
                {idx === 0 ? '🌶️' : idx === 1 ? '🥣' : idx === 2 ? '🔨' : idx === 3 ? '🥜' : '🧂'}
              </div>

              <div>
                <h3 className="font-display font-bold text-base text-[#183F2E] group-hover:text-emerald-700 transition-colors leading-snug">
                  {bumbu.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {bumbu.description}
                </p>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100">
              <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                {bumbu.extra_price > 0 ? `+Rp ${bumbu.extra_price.toLocaleString('id-ID')}` : 'Varian Gratis'}
              </span>
            </div>
          </div>
        ))}
      </div>

    </section>
  )
}
