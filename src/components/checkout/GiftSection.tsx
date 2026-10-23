'use client'

import React from 'react'
import { Gift, Heart, Eye, EyeOff, Sparkles } from 'lucide-react'

export interface GiftConfig {
  isGift: boolean
  recipientName: string
  recipientPhone: string
  recipientAddress: string
  senderName: string
  isSenderVisible: boolean
  hasGreetingCard: boolean
  cardDesign: string
  cardMessage: string
  hasGiftPackaging: boolean
}

interface GiftSectionProps {
  giftConfig: GiftConfig
  onChange: (updated: GiftConfig) => void
  packagingFee?: number
  greetingCardFee?: number
}

export const cardTemplates = [
  { id: 'merem_melek_special', label: 'Merem Melek Special', desc: 'Desain ceria buah segar khas AMM' },
  { id: 'birthday', label: 'Ulang Tahun (Happy Birthday)', desc: 'Desain manis pesta ulang tahun' },
  { id: 'thank_you', label: 'Terima Kasih (Thank You)', desc: 'Desain apresiasi hangat & elegan' },
  { id: 'congratulations', label: 'Selamat & Sukses', desc: 'Desain perayaan pencapaian spesial' },
  { id: 'thinking_of_you', label: 'Thinking of You / Lekas Sehat', desc: 'Desain buah segar penambah semangat' },
]

export const GiftSection: React.FC<GiftSectionProps> = ({
  giftConfig,
  onChange,
  packagingFee = 15000,
  greetingCardFee = 5000,
}) => {
  const update = (patch: Partial<GiftConfig>) => {
    onChange({ ...giftConfig, ...patch })
  }

  return (
    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 sm:p-6 space-y-5">
      {/* Gift Toggle Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#183F2E] flex items-center gap-1.5">
              <span>Kirim Sebagai Hadiah (Gift Merem Melek)</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </h3>
            <p className="text-xs text-slate-500">
              Kirimkan rujak & asinan segar spesial lengkap dengan kartu ucapan ke orang terkasih.
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
          <input
            type="checkbox"
            checked={giftConfig.isGift}
            onChange={(e) => update({ isGift: e.target.value === 'true' || e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8BC137]"></div>
        </label>
      </div>

      {giftConfig.isGift && (
        <div className="pt-4 border-t border-slate-100 space-y-4 animate-fade-in text-xs">
          {/* Recipient Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Nama Penerima Hadiah</label>
              <input
                type="text"
                value={giftConfig.recipientName}
                onChange={(e) => update({ recipientName: e.target.value })}
                placeholder="Contoh: Sahabat Tercinta"
                className="w-full rounded-2xl px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#183F2E] focus:ring-2 focus:ring-[#8BC137]/20 transition"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">No. WhatsApp Penerima (Kurir)</label>
              <input
                type="text"
                value={giftConfig.recipientPhone}
                onChange={(e) => update({ recipientPhone: e.target.value })}
                placeholder="Contoh: 0812XXXXXXXX"
                className="w-full rounded-2xl px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#183F2E] focus:ring-2 focus:ring-[#8BC137]/20 transition"
              />
            </div>
          </div>

          {/* Sender Details & Visibility Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-700 font-semibold">Nama Pengirim</label>
              <button
                type="button"
                onClick={() => update({ isSenderVisible: !giftConfig.isSenderVisible })}
                className="flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 transition"
              >
                {giftConfig.isSenderVisible ? (
                  <>
                    <Eye className="w-3.5 h-3.5" /> Nama Terlihat
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" /> Anonim (Rahasia)
                  </>
                )}
              </button>
            </div>
            <input
              type="text"
              value={giftConfig.senderName}
              onChange={(e) => update({ senderName: e.target.value })}
              placeholder="Nama Anda yang dicantumkan pada kartu"
              className="w-full rounded-2xl px-3.5 py-2.5 bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#183F2E] focus:ring-2 focus:ring-[#8BC137]/20 transition"
            />
          </div>

          {/* Greeting Card Checkbox & Selector */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={giftConfig.hasGreetingCard}
                  onChange={(e) => update({ hasGreetingCard: e.target.checked })}
                  className="rounded border-slate-300 text-[#8BC137] focus:ring-0"
                />
                <span className="font-bold text-[#183F2E] flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-[#FF5954]" /> Tambahkan Kartu Ucapan Eksklusif
                </span>
              </label>
              <span className="font-bold text-amber-700">+Rp {greetingCardFee.toLocaleString('id-ID')}</span>
            </div>

            {giftConfig.hasGreetingCard && (
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div>
                  <span className="text-slate-600 font-medium block mb-2">Pilih Tema Kartu Ucapan:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cardTemplates.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => update({ cardDesign: tmpl.id })}
                        className={`p-3 rounded-2xl border text-left transition ${
                          giftConfig.cardDesign === tmpl.id
                            ? 'bg-emerald-50 border-[#8BC137] text-[#183F2E] shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <p className="font-bold text-xs text-[#183F2E]">{tmpl.label}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{tmpl.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-700 font-semibold">Pesan Ucapan Hangat</label>
                    <span className="text-[10px] text-slate-400">{giftConfig.cardMessage.length}/300</span>
                  </div>
                  <textarea
                    value={giftConfig.cardMessage}
                    maxLength={300}
                    onChange={(e) => update({ cardMessage: e.target.value })}
                    placeholder="Tuliskan ucapan manismu di sini (kami cetak rapi pada kartu tebal laminasi doff)..."
                    rows={3}
                    className="w-full rounded-2xl px-3.5 py-2.5 bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#183F2E] focus:ring-2 focus:ring-[#8BC137]/20 transition"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Premium Gift Packaging Checkbox */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={giftConfig.hasGiftPackaging}
                onChange={(e) => update({ hasGiftPackaging: e.target.checked })}
                className="rounded border-slate-300 text-[#8BC137] focus:ring-0"
              />
              <div>
                <span className="font-bold text-[#183F2E] block">Packaging Hadiah Eksklusif & Pita Cantik</span>
                <span className="text-[10px] text-slate-500">
                  Kemasan box jinjing premium bernuansa hijau emas + pita satin AMM
                </span>
              </div>
            </label>
            <span className="font-bold text-amber-700 flex-shrink-0">
              +Rp {packagingFee.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
