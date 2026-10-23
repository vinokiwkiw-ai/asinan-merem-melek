import React from 'react'
import { Sparkles, ArrowRight, Flame, MapPin } from 'lucide-react'
import { MangoMascot } from '@/components/mascot/MangoMascot'

interface HeroSectionProps {
  onSeeMenu: () => void
  onNgerujakNow: () => void
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSeeMenu,
  onNgerujakNow,
}) => {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 pt-16 pb-12">
      
      {/* Central Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#8BC137]/15 via-[#FFD83D]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Main Hero Card Container */}
      <div className="relative z-10 max-w-5xl mx-auto text-center space-y-6 animate-fade-in">
        
        {/* Mascot Greeting */}
        <div className="flex flex-col items-center justify-center -mb-2">
          <MangoMascot state="idle" size="md" />
        </div>

        {/* Top Tagline Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFF8E8] border border-amber-200/80 text-amber-900 text-xs sm:text-sm font-extrabold uppercase tracking-widest shadow-sm animate-float">
          <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
          <span>PASTI FRESH! BEBAS PENGAWET & PEMANIS BUATAN</span>
        </div>

        {/* Hero Title & Subheadline */}
        <div className="space-y-3">
          <div className="text-5xl sm:text-7xl lg:text-8xl font-black font-display tracking-tight text-[#183F2E]">
            ASINAN <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8BC137] to-[#183F2E]">MEREM MELEK</span>
          </div>

          <p className="text-base sm:text-xl text-[#3A5C4B] font-medium max-w-2xl mx-auto leading-relaxed">
            Sensasi Ngerujak Buah Tropis Segar di Tengah Alam Indonesia. 100% Sari Buah Alami Tanpa Cuka Sintetis!
          </p>
        </div>

        {/* Floating Fruit Highlights */}
        <div className="flex justify-center items-center gap-3 sm:gap-6 py-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200/80 text-xs text-[#183F2E] font-bold shadow-sm">
            <span className="text-lg">🥭</span> Mangga Krispi
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200/80 text-xs text-[#183F2E] font-bold shadow-sm">
            <span className="text-lg">🌶️</span> Bumbu Bangkok
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200/80 text-xs text-[#183F2E] font-bold shadow-sm">
            <span className="text-lg">🥣</span> Kiamboy Alami
          </div>
        </div>

        {/* Dual CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3">
          <button
            onClick={onSeeMenu}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black px-8 py-3.5 rounded-full shadow-md hover:scale-105 active:scale-95 transition-all text-base cursor-pointer"
          >
            <span>LIHAT MENU</span>
            <ArrowRight className="w-5 h-5 stroke-[3]" />
          </button>

          <button
            onClick={onNgerujakNow}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-[#183F2E] hover:bg-[#122e22] text-white font-black px-8 py-3.5 rounded-full shadow-md hover:scale-105 active:scale-95 transition-all text-base cursor-pointer"
          >
            <Flame className="w-5 h-5 fill-amber-400 text-amber-400" />
            <span>NGERUJAK SEKARANG</span>
          </button>
        </div>

        {/* Outlet Branch Quick Indicator */}
        <div className="pt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#8BC137]" />
            <span>Cabang Greenlake City & Kelapa Gading</span>
          </div>
        </div>

      </div>
    </section>
  )
}
