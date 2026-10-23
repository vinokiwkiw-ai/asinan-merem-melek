'use client'

import React, { useState, useEffect } from 'react'
import { Star, ShieldCheck, ChevronLeft, ChevronRight, Quote, Sparkles } from 'lucide-react'

interface ReviewItem {
  id: string
  customerName: string
  rating: number
  comment: string
  productName: string
  createdAt: string
  isVerifiedPurchase: boolean
  isFeatured?: boolean
}

export function HomepageReviewsSection() {
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [avgRating, setAvgRating] = useState<number>(5.0)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    fetch('/api/reviews?limit=10')
      .then((res) => res.json())
      .then((data) => {
        if (data.reviews && data.reviews.length > 0) {
          setReviews(data.reviews)
          setAvgRating(data.summary?.avgRating || 5.0)
          setTotalCount(data.summary?.totalCount || data.reviews.length)
        }
      })
      .catch((err) => console.error('Error fetching homepage reviews', err))
      .finally(() => setLoading(false))
  }, [])

  const nextReview = () => {
    if (reviews.length === 0) return
    setCurrentIndex((prev) => (prev + 1) % reviews.length)
  }

  const prevReview = () => {
    if (reviews.length === 0) return
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length)
  }

  if (loading) {
    return (
      <section className="my-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl p-8 backdrop-blur-md bg-white/60 border border-white/80 shadow-sm text-center text-xs text-slate-400">
          Memuat ulasan pelanggan setia...
        </div>
      </section>
    )
  }

  if (reviews.length === 0) {
    return null
  }

  const activeReview = reviews[currentIndex]

  return (
    <section className="my-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#8BC137]/15 border border-[#8BC137]/30 text-[#183F2E] text-xs font-bold shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-current" />
          <span>Pengalaman Pelanggan Asinan Merem Melek</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#183F2E]">
          Kata Mereka yang Sudah Merem Melek
        </h2>
        <div className="flex items-center justify-center gap-2 pt-1 text-xs text-slate-600">
          <div className="flex items-center text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-current" />
            ))}
          </div>
          <span className="font-extrabold text-[#183F2E]">{avgRating.toFixed(1)} / 5.0</span>
          <span className="text-slate-400">• Dari {totalCount}+ Ulasan Terverifikasi</span>
        </div>
      </div>

      {/* Main Glassmorphism Review Carousel */}
      <div className="relative max-w-3xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 backdrop-blur-xl bg-white/75 border border-white/90 shadow-xl transition-all duration-300">
          {/* Decorative Background Quote Glow */}
          <div className="absolute top-4 right-6 text-[#8BC137]/15 pointer-events-none select-none">
            <Quote className="w-24 h-24" />
          </div>

          <div className="relative z-10 space-y-4">
            {/* Stars & Tag */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(activeReview.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-current" />
                ))}
              </div>

              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-extrabold shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-[#8BC137]" />
                <span>Pesanan Terverifikasi</span>
              </div>
            </div>

            {/* Comment Body */}
            <p className="text-base sm:text-lg text-slate-800 font-medium leading-relaxed italic">
              &ldquo;{activeReview.comment}&rdquo;
            </p>

            {/* Footer / Reviewer Meta */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-black text-[#183F2E] text-sm block">
                  {activeReview.customerName}
                </span>
                <span className="text-[11px] text-slate-500">
                  Menikmati: <strong className="text-slate-700">{activeReview.productName}</strong>
                </span>
              </div>

              <span className="text-[11px] text-slate-400 font-mono">
                {activeReview.createdAt ? new Date(activeReview.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Carousel Navigation Buttons */}
        {reviews.length > 1 && (
          <div className="flex items-center justify-between mt-5 px-2">
            <div className="flex items-center gap-1.5">
              {reviews.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentIndex
                      ? 'w-6 bg-[#183F2E]'
                      : 'w-2 bg-slate-200 hover:bg-slate-300'
                  }`}
                  aria-label={`Lihat ulasan ke-${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevReview}
                className="p-2.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition active:scale-95 cursor-pointer"
                title="Ulasan Sebelumnya"
                aria-label="Ulasan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextReview}
                className="p-2.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition active:scale-95 cursor-pointer"
                title="Ulasan Selanjutnya"
                aria-label="Ulasan Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
