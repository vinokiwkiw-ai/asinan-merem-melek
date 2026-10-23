"use client";

import React, { useState } from 'react'
import { Search, Clock, CheckCircle2, Package, Truck, AlertCircle, MessageSquare, MapPin, ExternalLink } from 'lucide-react'
import { Order, OrderStatus, Branch } from '../types'

interface OrderTrackerProps {
  orders: Order[]
  branches: Branch[]
  onOpenMidtrans: (order: Order) => void
}

export const OrderTracker: React.FC<OrderTrackerProps> = ({
  orders,
  branches,
  onOpenMidtrans,
}) => {
  const [searchCode, setSearchCode] = useState('')
  const [activeOrderCode, setActiveOrderCode] = useState(
    orders.length > 0 ? orders[0].order_code : ''
  )

  const selectedOrder = orders.find(
    (o) =>
      o.order_code.toLowerCase() === activeOrderCode.toLowerCase() ||
      o.customer_phone.includes(activeOrderCode)
  )

  const branch = selectedOrder
    ? branches.find((b) => b.id === selectedOrder.branch_id)
    : null

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchCode.trim()) {
      setActiveOrderCode(searchCode.trim())
    }
  }

  // Timeline Steps Definition
  const timelineSteps: { status: OrderStatus; label: string; icon: any }[] = [
    { status: 'menunggu_pembayaran', label: 'Menunggu Pembayaran', icon: Clock },
    { status: 'diverifikasi', label: 'Pembayaran Diverifikasi', icon: CheckCircle2 },
    { status: 'diproses', label: 'Racik & Kemas Buah', icon: Package },
    { status: 'siap_diambil', label: 'Siap Diambil / Dikirim', icon: Truck },
    { status: 'selesai', label: 'Pesanan Selesai', icon: CheckCircle2 },
  ]

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case 'menunggu_pembayaran':
        return 0
      case 'diverifikasi':
        return 1
      case 'diproses':
        return 2
      case 'siap_diambil':
      case 'dikirim':
        return 3
      case 'selesai':
        return 4
      case 'dibatalkan':
        return -1
      default:
        return 0
    }
  }

  return (
    <section className="my-8 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center space-y-2 mb-8">
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white">
          Lacak <span className="text-amber-400">Pesanan Asinan</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-300">
          Masukkan Kode Pesanan (contoh: <code className="text-amber-300 font-mono">AMM-260911-0042</code>) atau Nomor WhatsApp Anda.
        </p>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-lg mx-auto mb-8">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder="Ketik kode pesanan / nomor telepon..."
            className="w-full bg-slate-900 border border-amber-500/30 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
        <button
          type="submit"
          className="bg-brand-red hover:bg-brand-bright text-white font-extrabold px-6 py-3 rounded-2xl text-xs shadow-md"
        >
          Cari
        </button>
      </form>

      {/* Main Order View Card */}
      {!selectedOrder ? (
        <div className="bg-slate-900/60 border border-amber-500/20 rounded-3xl p-8 text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto opacity-70" />
          <p className="text-slate-300 text-sm">
            Pesanan tidak ditemukan. Coba periksa kembali kode pesanan Anda.
          </p>
          {orders.length > 0 && (
            <div className="pt-2">
              <span className="text-xs text-slate-400">Atau pilih dari contoh pesanan aktif:</span>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {orders.slice(0, 3).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setActiveOrderCode(o.order_code)}
                    className="bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-mono px-3 py-1.5 rounded-xl border border-slate-700"
                  >
                    {o.order_code}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/80 backdrop-blur-md border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-red-950/50 space-y-6">
          
          {/* Order Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-amber-500/20 gap-4">
            <div>
              <div className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">
                Kode Pesanan Real-time
              </div>
              <h3 className="font-display font-extrabold text-2xl text-white font-mono">
                {selectedOrder.order_code}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Atas nama: <strong>{selectedOrder.customer_name}</strong> (+{selectedOrder.customer_phone})
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-1.5">
              {/* Payment Status Badge */}
              <div className="flex items-center gap-2">
                {selectedOrder.payment_status === 'paid' && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> LUNAS (TRANSFER)
                  </span>
                )}
                {selectedOrder.payment_status === 'pending' && (
                  <button
                    onClick={() => onOpenMidtrans(selectedOrder)}
                    className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-400/40 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1 animate-pulse"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-400" /> TRANSFER SEKARANG →
                  </button>
                )}
                {(selectedOrder.payment_status === 'expired' || selectedOrder.payment_status === 'failed') && (
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-extrabold px-3 py-1 rounded-full">
                    {selectedOrder.payment_status.toUpperCase()}
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-400">
                Outlet: <strong className="text-white">{selectedOrder.branch_name}</strong>
              </div>
            </div>
          </div>

          {/* VISUAL TIMELINE */}
          <div className="space-y-3">
            <div className="text-xs font-extrabold uppercase text-amber-300 tracking-wider">
              Status Garis Waktu Pesanan
            </div>

            {selectedOrder.order_status === 'dibatalkan' ? (
              <div className="bg-rose-500/20 border border-rose-500/40 p-4 rounded-2xl text-rose-300 text-xs text-center font-bold">
                ❌ Pesanan ini telah dibatalkan (Expired/Dibatalkan oleh sistem/admin).
              </div>
            ) : (
              <div className="py-4">
                <div className="grid grid-cols-5 gap-2 relative">
                  {/* Progress Line */}
                  <div className="absolute top-5 left-6 right-6 h-1 bg-slate-800 -z-0" />
                  <div
                    className="absolute top-5 left-6 h-1 bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500 -z-0"
                    style={{
                      width: `${(getStepIndex(selectedOrder.order_status) / 4) * 90}%`,
                    }}
                  />

                  {timelineSteps.map((step, idx) => {
                    const currentIndex = getStepIndex(selectedOrder.order_status)
                    const isDone = idx <= currentIndex
                    const isCurrent = idx === currentIndex
                    const IconComponent = step.icon

                    return (
                      <div key={step.status} className="flex flex-col items-center text-center relative z-10">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                            isCurrent
                              ? 'bg-amber-400 text-brand-dark ring-4 ring-amber-400/30 scale-110'
                              : isDone
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                        >
                          <IconComponent className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <span
                          className={`text-[10px] font-bold mt-2 leading-tight ${
                            isCurrent
                              ? 'text-amber-300'
                              : isDone
                              ? 'text-slate-200'
                              : 'text-slate-500'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ITEM DETAILS TABLE */}
          <div className="space-y-3 pt-4 border-t border-amber-500/10">
            <div className="text-xs font-extrabold uppercase text-amber-300 tracking-wider">
              Rincian Item Pesanan
            </div>

            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 space-y-2">
              {selectedOrder.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-none">
                  <div>
                    <span className="font-bold text-white">{it.menu_name}</span>
                    {it.bumbu_name && (
                      <span className="text-amber-400 text-[10px] block">({it.bumbu_name})</span>
                    )}
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-slate-400">{it.qty}x</span> Rp {it.price_each.toLocaleString('id-ID')}
                  </div>
                </div>
              ))}

              <div className="pt-2 flex justify-between text-xs font-extrabold text-amber-400 border-t border-slate-800">
                <span>Total Biaya</span>
                <span>Rp {(selectedOrder.total || 0).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* OUTLET ACTION BUTTONS */}
          {branch && (
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <a
                href={`https://wa.me/${branch.whatsapp_number}?text=${encodeURIComponent(
                  `Halo Admin Asinan Merem Melek, saya mau tanya status pesanan ${selectedOrder.order_code}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md"
              >
                <MessageSquare className="w-4 h-4" /> Hubungi Outlet WhatsApp (+{branch.whatsapp_number})
              </a>

              <a
                href={branch.gmaps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <MapPin className="w-4 h-4 text-amber-400" /> Maps Outlet <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

        </div>
      )}
    </section>
  )
}
