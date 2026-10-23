'use client'

import React, { useState } from 'react'
import { X, Plus, Minus, Flame, Check, AlertCircle } from 'lucide-react'
import { MenuItem, BumbuVariant } from '../../types'
import { getProductPhotoUrl } from '../../data/officialData'
import { SeasoningCustomizer, SeasoningSelection } from './SeasoningCustomizer'

interface ProductDetailModalProps {
  item: MenuItem | null
  bumbuVariants: BumbuVariant[]
  onClose: () => void
  onConfirm: (
    item: MenuItem,
    bumbu?: BumbuVariant,
    qty?: number,
    notes?: string,
    seasonings?: SeasoningSelection[]
  ) => void
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  item,
  bumbuVariants,
  onClose,
  onConfirm,
}) => {
  const [qty, setQty] = useState<number>(1)
  const [notes, setNotes] = useState<string>('')
  const [customSeasonings, setCustomSeasonings] = useState<SeasoningSelection[]>([])
  const [seasoningExtra, setSeasoningExtra] = useState<number>(0)
  const [selectedSingleBumbuId, setSelectedSingleBumbuId] = useState<string>(
    bumbuVariants.length > 0 ? bumbuVariants[0].id : ''
  )

  if (!item) return null

  // Determine size code and rule allowances
  const isPersonal = item.id.includes('personal') || item.name.toLowerCase().includes('personal')
  const isSharing = item.id.includes('sharing') || item.name.toLowerCase().includes('sharing')
  const isMega = item.id.includes('mega') || item.name.toLowerCase().includes('mega')
  const isRujakCustomizable = isPersonal || isSharing || isMega

  // Parse customization options if available on product
  let customizationOpts: any = {}
  try {
    customizationOpts = typeof item.customization_options === 'string'
      ? JSON.parse(item.customization_options)
      : (item.customization_options || {})
  } catch {
    customizationOpts = {}
  }

  const allowedSeasoningCount = Number(
    customizationOpts.allowed_seasonings ?? (isPersonal ? 2 : isSharing ? 5 : isMega ? 4 : 1)
  )
  const sizeCode = isPersonal ? 'PERSONAL' : isSharing ? 'SHARING' : isMega ? 'MEGA' : 'STANDARD'

  // Filter seasonings if specific available seasonings are configured for this product
  const availableSeasoningIds: string[] | undefined =
    Array.isArray(customizationOpts?.available_seasoning_ids) && customizationOpts.available_seasoning_ids.length > 0
      ? customizationOpts.available_seasoning_ids
      : undefined

  const activeBumbuVariants = availableSeasoningIds
    ? bumbuVariants.filter((b) => availableSeasoningIds.includes(b.id))
    : bumbuVariants

  const displayBumbuVariants = activeBumbuVariants.length > 0 ? activeBumbuVariants : bumbuVariants

  // Default seasonings catalog for customizer
  const seasoningsCatalog = displayBumbuVariants.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    extra_price: b.extra_price,
  }))

  // Price calculations
  const singleBumbu = displayBumbuVariants.find((b) => b.id === selectedSingleBumbuId) || displayBumbuVariants[0]
  const singleExtra = !isRujakCustomizable && singleBumbu ? singleBumbu.extra_price : 0
  const totalExtraPerUnit = isRujakCustomizable ? seasoningExtra : singleExtra
  const unitPrice = item.base_price + totalExtraPerUnit
  const totalPrice = unitPrice * qty
  const photoUrl = getProductPhotoUrl(item.photoKey)

  // Validation
  const isRequired = customizationOpts?.is_required ?? true
  const minCount = customizationOpts?.min_seasonings !== undefined ? Number(customizationOpts.min_seasonings) : (isRequired ? allowedSeasoningCount : 0)
  const totalSelectedSeasonings = customSeasonings.reduce((acc, s) => acc + s.qty, 0)
  const isCustomizationValid =
    !isRujakCustomizable ||
    (isRequired
      ? totalSelectedSeasonings === allowedSeasoningCount
      : totalSelectedSeasonings <= allowedSeasoningCount && totalSelectedSeasonings >= minCount)

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isCustomizationValid) return

    if (isRujakCustomizable) {
      onConfirm(item, undefined, qty, notes, customSeasonings)
    } else {
      onConfirm(item, singleBumbu, qty, notes)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden text-slate-800 my-8 max-h-[92vh] flex flex-col md:flex-row">
        {/* LEFT COLUMN: PRODUCT PHOTO & BADGES */}
        <div className="md:w-1/2 relative bg-slate-50 min-h-[220px] md:min-h-full flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-slate-100 flex-shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={item.name}
              className="w-full h-full max-h-[300px] object-cover rounded-2xl border border-slate-200/80 shadow-md"
              onError={(e) => {
                ;(e.target as HTMLElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="text-7xl">🥭</div>
          )}

          {item.is_signature && (
            <span className="absolute top-4 left-4 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-[#FFD83D] text-[#183F2E] px-3 py-1 rounded-full shadow-sm">
              <Flame className="w-3 h-3 fill-current" /> BEST SELLER
            </span>
          )}

          <button
            onClick={onClose}
            className="md:hidden absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 text-slate-700 flex items-center justify-center border border-slate-200 shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* RIGHT COLUMN: PRODUCT DETAILS & CUSTOMIZER */}
        <form
          onSubmit={handleConfirm}
          className="md:w-1/2 p-6 flex flex-col justify-between space-y-4 overflow-y-auto max-h-[60vh] md:max-h-full"
        >
          <div className="space-y-4">
            <div className="hidden md:flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="font-display font-black text-xl text-[#183F2E] leading-snug">
                {item.name}
              </h3>
              <p className="text-lg font-black text-[#183F2E] mt-1 tabular-nums font-mono">
                Rp {unitPrice.toLocaleString('id-ID')}
              </p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
              {item.description}
            </p>

            {/* CUSTOMIZATION ENGINE (For Personal, Sharing, Mega) */}
            {isRujakCustomizable ? (
              <SeasoningCustomizer
                sizeCode={sizeCode as any}
                seasonings={seasoningsCatalog}
                allowedCount={allowedSeasoningCount}
                allowDuplicates={true}
                onSelectionsChange={(selections, extra, fruitNotes) => {
                  setCustomSeasonings(selections)
                  setSeasoningExtra(extra)
                  if (fruitNotes) setNotes(fruitNotes)
                }}
              />
            ) : (
              // Standard single seasoning or no customization
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Pilihan Bumbu Rujak</label>
                <div className="space-y-1.5">
                  {displayBumbuVariants.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedSingleBumbuId(b.id)}
                      className={`w-full p-3 rounded-2xl border text-left text-xs transition flex items-center justify-between ${
                        selectedSingleBumbuId === b.id
                          ? 'bg-emerald-50 border-[#8BC137] text-[#183F2E] font-bold shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{b.name}</span>
                      {b.extra_price > 0 && (
                        <span className="text-[10px] text-amber-900 font-mono font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                          +Rp {b.extra_price.toLocaleString('id-ID')}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM ACTIONS: QTY & ADD TO CART */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-bold">Jumlah Pesanan:</span>
              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-full border border-slate-200">
                <button
                  type="button"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-8 h-8 rounded-full bg-white text-slate-700 flex items-center justify-center hover:bg-slate-50 shadow-sm"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-7 text-center font-black font-mono text-sm text-[#183F2E]">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(qty + 1)}
                  className="w-8 h-8 rounded-full bg-[#8BC137] text-[#183F2E] flex items-center justify-center hover:bg-[#7ab02d] shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {(() => {
              const isAvail = (item as any).availability_status === 'AVAILABLE' || (!(item as any).availability_status && item.is_available)
              const isTemp = (item as any).availability_status === 'TEMP_UNAVAILABLE'
              const canSubmit = isAvail && isCustomizationValid

              return (
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`w-full py-3.5 rounded-full font-black text-sm flex items-center justify-between px-6 shadow-md transition ${
                    canSubmit
                      ? 'bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>
                    {!isAvail
                      ? isTemp
                        ? 'Produk Tidak Tersedia Sementara'
                        : 'Stok Produk Habis'
                      : isCustomizationValid
                      ? 'Tambah ke Keranjang'
                      : `Pilih ${allowedSeasoningCount} Bumbu`}
                  </span>
                  <span className="font-mono">Rp {totalPrice.toLocaleString('id-ID')}</span>
                </button>
              )
            })()}
          </div>
        </form>
      </div>
    </div>
  )
}
