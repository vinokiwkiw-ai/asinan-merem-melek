"use client";

import React from 'react'
import { MapPin, Clock, MessageSquare, ExternalLink, CheckCircle2, ShoppingBag, Truck } from 'lucide-react'
import { Branch } from '../types'

interface BranchPickerProps {
  branches: Branch[]
  selectedBranchId: string
  onSelectBranch: (id: string) => void
}

export const BranchPicker: React.FC<BranchPickerProps> = ({
  branches,
  selectedBranchId,
  onSelectBranch,
}) => {
  const [liveStatuses, setLiveStatuses] = React.useState<Record<string, any>>({})

  React.useEffect(() => {
    fetch('/api/outlets/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.branches) {
          const map: Record<string, any> = {}
          data.branches.forEach((b: any) => {
            map[b.branchId] = b
          })
          setLiveStatuses(map)
        }
      })
      .catch((err) => console.error('Failed to load outlet statuses', err))
  }, [])

  return (
    <section className="my-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-6">
        <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#183F2E] flex items-center justify-center gap-2">
          <span>Pilih Outlet Cabang</span>
          <span className="text-emerald-700">Asinan Merem Melek</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Pilih lokasi cabang terdekat untuk pemesanan langsung, pengiriman online, atau penunjuk arah Google Maps.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.isArray(branches) && branches.map((branch) => {
          const isSelected = branch.id === selectedBranchId
          const live = liveStatuses[branch.id]
          const isOpen = live ? live.isOpen : branch.is_open
          const scheduleDisplay = live ? live.todaySchedule : (branch.open_hours || '09:00 - 20:00 WIB')
          const isTempClosed = live?.storeStatus === 'TEMP_CLOSED'

          return (
            <div
              key={branch.id}
              onClick={() => onSelectBranch(branch.id)}
              className={`relative rounded-3xl p-6 transition-all duration-300 cursor-pointer border ${
                isSelected
                  ? 'bg-white border-[#8BC137] ring-2 ring-[#8BC137]/30 shadow-md scale-[1.01]'
                  : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm hover:shadow'
              }`}
            >
              {isSelected && (
                <div className="absolute top-4 right-4 flex items-center gap-1 text-[#183F2E] text-xs font-black bg-[#8BC137] px-3 py-1 rounded-full shadow-sm">
                  <CheckCircle2 className="w-4 h-4 fill-[#183F2E] text-[#8BC137]" />
                  <span>Cabang Terpilih</span>
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-2xl ${
                  isSelected ? 'bg-emerald-100 border border-emerald-200' : 'bg-slate-50 border border-slate-100'
                }`}>
                  🥭
                </div>

                <div className="space-y-2 flex-1 pr-12">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-black text-lg sm:text-xl text-[#183F2E]">
                      {branch.name}
                    </h3>
                    {isTempClosed ? (
                      <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                        Tutup Sementara 🟠
                      </span>
                    ) : isOpen ? (
                      <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                        Buka Sekarang 🟢
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full">
                        Tutup Sekarang 🔴
                      </span>
                    )}
                  </div>

                  {live?.nextOpenTime && !isOpen && !isTempClosed && (
                    <p className="text-[11px] font-semibold text-amber-800">
                      ℹ️ {live.nextOpenTime}
                    </p>
                  )}

                  {live?.reason && (
                    <p className="text-[11px] text-slate-500 italic">
                      Catatan: {live.reason}
                    </p>
                  )}

                  <div className="flex items-start gap-1.5 text-xs text-slate-600">
                    <span className="font-bold text-[#183F2E]">Alamat:</span>
                    <span>{branch.address}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#8BC137]" />
                      <span>{branch.open_hours || '09:00 - 20:00 WIB'}</span>
                    </div>

                    <a
                      href={`https://wa.me/${branch.whatsapp_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WA: +{branch.whatsapp_number}</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <a
                  href={branch.gmaps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-full border border-slate-200 transition-colors shadow-sm"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#8BC137]" />
                  <span>Petunjuk Arah Maps</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>

                <button
                  type="button"
                  onClick={() => onSelectBranch(branch.id)}
                  className={`text-xs font-black py-2.5 px-5 rounded-full transition-all ${
                    isSelected
                      ? 'bg-[#8BC137] text-[#183F2E] cursor-default shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {isSelected ? 'Terpilih' : 'Pilih Cabang Ini'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
