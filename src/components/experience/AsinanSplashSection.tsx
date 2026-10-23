import React from 'react'
import { Sparkles, ShieldCheck, Droplets } from 'lucide-react'

export const AsinanSplashSection: React.FC = () => {
  return (
    <section className="my-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      
      <div className="relative rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-[#0b3826] via-[#10462f] to-[#072a1d] border border-white/15 shadow-2xl overflow-hidden text-center space-y-6">
        
        {/* Ambient Liquid Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#A8D5A2]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-[#F5E6A3] text-xs font-extrabold uppercase tracking-widest">
          <Droplets className="w-4 h-4 text-[#A8D5A2]" /> RASA ASLI KIAMBOY MURNI
        </div>

        <h2 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight leading-tight max-w-3xl mx-auto">
          Kuah Asinan Alami <span className="text-[#A8D5A2]">Tanpa Cuka Sintetis</span>
        </h2>

        <p className="text-sm sm:text-lg text-[#B7E4C7]/90 font-medium max-w-2xl mx-auto leading-relaxed">
          Kombinasi rasa asam manis segar yang melek alami dari perasan buah kiamboy murni. 100% tanpa cuka buatan, tanpa pengawet, dan tanpa pemanis buatan.
        </p>

        {/* Feature Pill Grid */}
        <div className="flex flex-wrap justify-center items-center gap-4 pt-2">
          <div className="flex items-center gap-2 bg-white/10 border border-white/15 px-4 py-2 rounded-2xl text-xs text-white font-bold backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-[#A8D5A2]" /> Bebas Cuka Sintetis
          </div>
          <div className="flex items-center gap-2 bg-white/10 border border-white/15 px-4 py-2 rounded-2xl text-xs text-white font-bold backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-[#A8D5A2]" /> Bebas Pengawet
          </div>
          <div className="flex items-center gap-2 bg-white/10 border border-white/15 px-4 py-2 rounded-2xl text-xs text-white font-bold backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-[#A8D5A2]" /> Bebas Pemanis Buatan
          </div>
        </div>

      </div>

    </section>
  )
}
