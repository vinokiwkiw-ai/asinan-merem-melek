"use client";

import React, { useState } from 'react'
import { X, Plus, Minus, Flame, Check, MessageSquare } from 'lucide-react'
import { MenuItem, BumbuVariant } from '../types'

interface AddToCartModalProps {
  item: MenuItem | null
  bumbuVariants: BumbuVariant[]
  onClose: () => void
  onConfirm: (item: MenuItem, bumbu?: BumbuVariant, qty?: number, notes?: string) => void
}

export const AddToCartModal: React.FC<AddToCartModalProps> = ({
  item,
  bumbuVariants,
  onClose,
  onConfirm,
}) => {
  const [selectedBumbuId, setSelectedBumbuId] = useState<string>(
    bumbuVariants.length > 0 ? bumbuVariants[0].id : ''
  )
  const [qty, setQty] = useState<number>(1)
  const [notes, setNotes] = useState<string>('')

  if (!item) return null

  const selectedBumbu = bumbuVariants.find((b) => b.id === selectedBumbuId)
  const extraPrice = selectedBumbu ? selectedBumbu.extra_price : 0
  const unitPrice = item.base_price + extraPrice
  const totalPrice = unitPrice * qty

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(item, selectedBumbu, qty, notes)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden text-slate-800 my-8">
        
        {/* Header Visual Box */}
        <div className="relative p-6 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-3xl shrink-0 shadow-sm">
              🥭
            </div>
            <div>
              {item.is_signature && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full mb-1">
                  <Flame className="w-3 h-3 fill-amber-700 text-amber-700" /> SIGNATURE BEST SELLER
                </span>
              )}
              <h3 className="font-black text-xl text-[#183F2E] leading-snug">
                {item.name}
              </h3>
              <p className="text-base font-black text-[#183F2E] font-mono">
                Rp {item.base_price.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleConfirm} className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
          
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            {item.description}
          </p>

          {/* BUMBU VARIANT SELECTOR */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-black text-sm text-[#183F2E] flex items-center gap-1.5">
                <span>Pilih Varian Bumbu Rujak</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">Pilih salah satu</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {bumbuVariants.map((bumbu) => {
                const isChecked = bumbu.id === selectedBumbuId
                return (
                  <div
                    key={bumbu.id}
                    onClick={() => setSelectedBumbuId(bumbu.id)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-emerald-50 border-[#8BC137] ring-1 ring-[#8BC137]/30 text-[#183F2E] shadow-sm'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isChecked ? 'border-[#8BC137] bg-[#8BC137]' : 'border-slate-300'
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5 text-[#183F2E] stroke-[3]" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#183F2E]">{bumbu.name}</div>
                        {bumbu.description && (
                          <div className="text-[10px] text-slate-500">{bumbu.description}</div>
                        )}
                      </div>
                    </div>

                    <div className="text-xs font-semibold shrink-0">
                      {bumbu.extra_price > 0 ? (
                        <span className="text-emerald-700 font-bold font-mono">+Rp {bumbu.extra_price.toLocaleString('id-ID')}</span>
                      ) : (
                        <span className="text-emerald-700 text-[10px] font-bold">Gratis</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* CUSTOM NOTES FIELD */}
          <div className="space-y-1.5">
            <label className="font-bold text-xs text-slate-700">
              Catatan Pesanan (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Cabai dipisah, kuah sedikit saja..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#183F2E] focus:ring-2 focus:ring-[#8BC137]/20 transition"
            />
          </div>

          {/* QTY STEPPER & TOTAL */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Subtotal Item</div>
              <div className="font-black text-lg text-[#183F2E] font-mono tabular-nums">
                Rp {totalPrice.toLocaleString('id-ID')}
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-black text-sm w-6 text-center text-[#183F2E]">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="w-8 h-8 rounded-full bg-[#8BC137] text-[#183F2E] hover:bg-[#7ab02d] flex items-center justify-center transition-colors font-bold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CONFIRM BUTTON */}
          <button
            type="submit"
            className="w-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black py-4 rounded-full shadow-md text-sm transition-all transform active:scale-98 cursor-pointer"
          >
            Tambah ke Keranjang • Rp {totalPrice.toLocaleString('id-ID')}
          </button>
        </form>
      </div>
    </div>
  )
}
