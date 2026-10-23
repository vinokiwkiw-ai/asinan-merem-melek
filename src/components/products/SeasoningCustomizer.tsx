'use client'

import React, { useState, useMemo } from 'react'
import { Plus, Minus, Check, AlertCircle, Info } from 'lucide-react'

export interface SeasoningItem {
  id: string
  name: string
  description: string
  extra_price: number
  photo_key?: string
}

export interface SeasoningSelection {
  seasoningId: string
  seasoningName: string
  qty: number
  extraPrice: number
}

interface SeasoningCustomizerProps {
  sizeCode: 'PERSONAL' | 'SHARING' | 'MEGA'
  seasonings: SeasoningItem[]
  allowedCount: number
  allowDuplicates?: boolean
  maxDuplicates?: number
  onSelectionsChange: (selections: SeasoningSelection[], extraTotal: number, fruitNotes: string) => void
  initialSelections?: SeasoningSelection[]
  initialFruitNotes?: string
}

export const SeasoningCustomizer: React.FC<SeasoningCustomizerProps> = ({
  sizeCode,
  seasonings,
  allowedCount,
  allowDuplicates = true,
  maxDuplicates = 3,
  onSelectionsChange,
  initialSelections = [],
  initialFruitNotes = '',
}) => {
  // Map of seasoningId -> quantity selected
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    seasonings.forEach((s) => {
      map[s.id] = 0
    })
    initialSelections.forEach((sel) => {
      map[sel.seasoningId] = sel.qty
    })
    return map
  })

  const [fruitNotes, setFruitNotes] = useState(initialFruitNotes)

  // Calculate total selected count
  const totalSelected = useMemo(() => {
    return Object.values(quantities).reduce((acc, q) => acc + q, 0)
  }, [quantities])

  const remainingCount = allowedCount - totalSelected

  // Calculate extra cost for special seasonings or extra items
  const extraTotal = useMemo(() => {
    let extra = 0
    seasonings.forEach((s) => {
      const q = quantities[s.id] || 0
      if (q > 0 && s.extra_price > 0) {
        extra += q * s.extra_price
      }
    })
    return extra
  }, [quantities, seasonings])

  const notifyChange = (newQuantities: Record<string, number>, notes: string) => {
    const list: SeasoningSelection[] = []
    let extra = 0
    seasonings.forEach((s) => {
      const q = newQuantities[s.id] || 0
      if (q > 0) {
        list.push({
          seasoningId: s.id,
          seasoningName: s.name,
          qty: q,
          extraPrice: s.extra_price,
        })
        if (s.extra_price > 0) {
          extra += q * s.extra_price
        }
      }
    })
    onSelectionsChange(list, extra, notes)
  }

  const handleIncrement = (id: string) => {
    if (totalSelected >= allowedCount) return
    const current = quantities[id] || 0
    if (!allowDuplicates && current >= 1) return
    if (allowDuplicates && current >= maxDuplicates) return

    const updated = { ...quantities, [id]: current + 1 }
    setQuantities(updated)
    notifyChange(updated, fruitNotes)
  }

  const handleDecrement = (id: string) => {
    const current = quantities[id] || 0
    if (current <= 0) return

    const updated = { ...quantities, [id]: current - 1 }
    setQuantities(updated)
    notifyChange(updated, fruitNotes)
  }

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setFruitNotes(val)
    notifyChange(quantities, val)
  }

  return (
    <div className="space-y-4">
      {/* Header & Live Allowance Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-2xl bg-[#FFF8E8] border border-amber-200">
        <div>
          <span className="text-xs font-black tracking-wider text-amber-900 uppercase">
            Pilihan Bumbu Rujak ({sizeCode})
          </span>
          <p className="text-xs text-amber-800/80 mt-0.5">
            Wajib memilih tepat <strong className="text-amber-950">{allowedCount} bumbu</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-black transition-colors ${
              totalSelected === allowedCount
                ? 'bg-[#8BC137] text-[#183F2E]'
                : totalSelected < allowedCount
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-rose-100 text-rose-800 border border-rose-300'
            }`}
          >
            {totalSelected === allowedCount ? (
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Pas {allowedCount} Bumbu
              </span>
            ) : totalSelected < allowedCount ? (
              `Pilih ${remainingCount} lagi`
            ) : (
              `Kelebihan ${totalSelected - allowedCount}`
            )}
          </span>
        </div>
      </div>

      {/* Seasoning Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {seasonings.map((s) => {
          const count = quantities[s.id] || 0
          const canAdd =
            totalSelected < allowedCount &&
            (allowDuplicates ? count < maxDuplicates : count === 0)

          return (
            <div
              key={s.id}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                count > 0
                  ? 'bg-emerald-50/80 border-[#8BC137] shadow-sm'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-sm font-extrabold text-[#183F2E] truncate">{s.name}</h4>
                  {s.extra_price > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      +Rp {s.extra_price.toLocaleString('id-ID')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {s.description}
                </p>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {count > 0 ? (
                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-full border border-slate-200 shadow-sm">
                    <button
                      type="button"
                      onClick={() => handleDecrement(s.id)}
                      className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-5 text-center text-xs font-black text-[#183F2E]">
                      {count}
                    </span>
                    <button
                      type="button"
                      disabled={!canAdd}
                      onClick={() => handleIncrement(s.id)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                        canAdd
                          ? 'bg-[#8BC137] text-[#183F2E] hover:bg-[#7ab02d]'
                          : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!canAdd}
                    onClick={() => handleIncrement(s.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition ${
                      canAdd
                        ? 'bg-slate-100 text-slate-700 hover:bg-[#8BC137] hover:text-[#183F2E]'
                        : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" /> Pilih
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Warning Notice if count is invalid */}
      {totalSelected !== allowedCount && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            {totalSelected < allowedCount
              ? `Silakan pilih ${allowedCount - totalSelected} bumbu lagi sebelum menambahkan ke keranjang.`
              : `Total bumbu melebihi kuota ${allowedCount}. Silakan kurangi ${totalSelected - allowedCount} bumbu.`}
          </span>
        </div>
      )}

      {/* Optional Fruit Customization & Substitution Notes */}
      <div className="pt-2">
        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
          <span>Catatan Buah & Request Khusus (Opsional)</span>
          <Info className="w-3.5 h-3.5 text-amber-600" />
        </label>
        <textarea
          value={fruitNotes}
          onChange={handleNotesChange}
          placeholder="Contoh: Tanpa kedondong, perbanyak mangga muda & jambu kristal."
          rows={2}
          className="w-full text-xs rounded-2xl p-3 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#8BC137]/30 focus:border-[#8BC137] transition"
        />
        <p className="text-[10px] text-slate-400 mt-1">
          *Catatan buah bersifat request ketersediaan dan akan disesuaikan oleh kitchen saat persiapan.
        </p>
      </div>
    </div>
  )
}
