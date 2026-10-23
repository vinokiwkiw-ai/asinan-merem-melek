"use client";

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, MessageSquare } from 'lucide-react'
import { PromoBanner } from '../types'

interface HeroCarouselProps {
  banners: PromoBanner[]
  onCtaClick: (link: string) => void
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ banners, onCtaClick }) => {
  const activeBanners = banners.filter((b) => b.is_active)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (activeBanners.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [activeBanners.length])

  if (activeBanners.length === 0) return null

  const currentBanner = activeBanners[currentIndex]

  return (
    <section className="relative overflow-hidden my-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div
        className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/15 transition-all duration-700 min-h-[260px] sm:min-h-[320px] flex items-center bg-[#0b3826]"
        style={{
          backgroundColor: currentBanner.bg_color || '#0b3826',
        }}
      >
        {/* Ambient Radial Glows matching asinanmeremmelek.site */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#A8D5A2]/15 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#69D98C]/15 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
        
        {/* Subtle dot overlay */}
        <div className="absolute inset-0 bg-radial-dots pointer-events-none opacity-60" />

        {/* Banner Content Container */}
        <div className="relative z-10 p-6 sm:p-12 w-full grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          <div className="md:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-[#F5E6A3] text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-[#F5E6A3] animate-pulse" /> SPESIAL MEREM MELEK
            </div>

            <h1
              className="font-display font-extrabold text-2xl sm:text-4xl md:text-5xl tracking-tight leading-tight"
              style={{ color: currentBanner.text_color || '#FFFFFF' }}
            >
              {currentBanner.title}
            </h1>

            {currentBanner.subtitle && (
              <p className="text-sm sm:text-lg text-[#B7E4C7] font-medium max-w-2xl leading-relaxed">
                {currentBanner.subtitle}
              </p>
            )}

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={() => onCtaClick(currentBanner.cta_link || '#menu')}
                className="inline-flex items-center gap-2 bg-[#A8D5A2] hover:bg-[#bfe3ba] text-[#0b3826] font-extrabold px-6 py-3 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all text-sm sm:text-base cursor-pointer"
              >
                <span>{currentBanner.cta_label || 'Tampilkan Menu'}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>

              <a
                href="https://wa.me/628118281220"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-emerald-500 text-white font-extrabold px-5 py-3 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all text-sm sm:text-base"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Pesan Direct WA</span>
              </a>
            </div>
          </div>

          {/* Clean Graphic Card (Zero AI Generated Images) */}
          <div className="hidden md:flex md:col-span-4 justify-center">
            <div className="relative w-48 h-48 lg:w-56 lg:h-56 rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-white/10 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3 transform rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="text-6xl">🥭</div>
              <div className="font-display font-extrabold text-lg text-white">100% Buah Fresh</div>
              <div className="text-xs text-[#B7E4C7]">Tanpa Cuka & Pengawet</div>
            </div>
          </div>

        </div>

        {/* Carousel Prev/Next Buttons */}
        {activeBanners.length > 1 && (
          <>
            <button
              onClick={() =>
                setCurrentIndex(
                  (prev) => (prev - 1 + activeBanners.length) % activeBanners.length
                )
              }
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() =>
                setCurrentIndex((prev) => (prev + 1) % activeBanners.length)
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Indicators Dots */}
        {activeBanners.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {activeBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all ${
                  currentIndex === idx
                    ? 'w-6 bg-[#A8D5A2]'
                    : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
