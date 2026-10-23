"use client";

import React, { useState, useEffect } from 'react'
import { X, QrCode, CheckCircle2, Clock, ShieldCheck, MessageSquare, ExternalLink } from 'lucide-react'
import confetti from 'canvas-confetti'
import { Order } from '../types'

interface MidtransModalProps {
  order: Order | null
  onClose: () => void
  onConfirmPayment: (orderId: string) => void
}

export const MidtransModal: React.FC<MidtransModalProps> = ({
  order,
  onClose,
  onConfirmPayment,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'gopay' | 'va'>('qris')
  const [timeLeft, setTimeLeft] = useState<number>(0)

  // Countdown timer logic based on payment_expired_at
  useEffect(() => {
    if (!order) return;
    const calculateTimeLeft = () => {
      const expiry = new Date(order.payment_expired_at).getTime()
      const now = new Date().getTime()
      const diff = Math.max(0, Math.floor((expiry - now) / 1000))
      setTimeLeft(diff)
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(timer)
  }, [order])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const handleVerify = () => {
    onConfirmPayment(order!.id)
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    })
  }

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl shadow-red-950 overflow-hidden text-slate-100">
        
        {/* Midtrans Official Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-brand-dark p-4 px-6 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 font-extrabold text-white text-xs flex items-center justify-center shadow">
              SNAP
            </div>
            <div>
              <div className="text-xs font-bold text-white">Pembayaran Resmi Midtrans</div>
              <div className="text-[10px] text-amber-300 font-mono">Kode Order: {order.order_code}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Main View */}
        <div className="p-6 space-y-5">

          {/* IF ALREADY PAID / VERIFIED */}
          {order.payment_status === 'paid' ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase border border-emerald-500/40">
                  PEMBAYARAN TERVERIFIKASI OTOMATIS
                </span>
                <h3 className="font-display font-extrabold text-2xl text-white mt-2">
                  Pesanan Berhasil Diverifikasi!
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Pesanan <span className="font-mono text-amber-400 font-bold">{order.order_code}</span> langsung diproses dapur outlet <strong className="text-white">{order.branch_name}</strong>.
                </p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-xs space-y-1.5 text-left">
                <div className="flex justify-between text-slate-400">
                  <span>Nama Pemesan:</span>
                  <span className="font-bold text-white">{order.customer_name}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Metode Pengambilan:</span>
                  <span className="font-bold text-amber-300 capitalize">{order.delivery_type}</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                  <span>Total Transaksi:</span>
                  <span className="font-bold text-amber-400">Rp {(order.total || 0).toLocaleString('id-ID')}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold py-3.5 rounded-2xl shadow-xl text-xs transition-all"
              >
                Lihat Status Garis Waktu Pesanan
              </button>
            </div>
          ) : (
            /* IF PENDING PAYMENT */
            <>
              {/* Order Amount & Countdown Timer Header */}
              <div className="bg-slate-800/80 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Tagihan</div>
                  <div className="font-display font-black text-xl text-amber-400">
                    Rp {(order.total || 0).toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3 text-amber-400" /> Sisa Waktu:
                  </div>
                  <div className="font-mono font-extrabold text-lg text-rose-400 animate-pulse">
                    {formattedTime}
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Pilih Metode Pembayaran Midtrans</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qris')}
                    className={`p-3 rounded-xl border text-center text-xs font-bold transition-all ${
                      paymentMethod === 'qris'
                        ? 'bg-amber-400 text-brand-dark border-amber-400 shadow'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    Scan QRIS / GoPay / ShopeePay
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('va')}
                    className={`p-3 rounded-xl border text-center text-xs font-bold transition-all ${
                      paymentMethod === 'va'
                        ? 'bg-amber-400 text-brand-dark border-amber-400 shadow'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    Virtual Account Bank
                  </button>
                </div>
              </div>

              {/* QRIS Display View */}
              {paymentMethod === 'qris' && (
                <div className="bg-white p-4 rounded-2xl text-slate-900 text-center space-y-3">
                  <div className="text-xs font-extrabold text-slate-800">
                    Scan QRIS Menggunakan M-Banking / GoPay / OVO / Dana / ShopeePay
                  </div>
                  <div className="w-48 h-48 mx-auto bg-slate-50 p-2 rounded-2xl border-2 border-slate-900 flex items-center justify-center shadow-inner">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ASINAN_MEREM_MELEK_${order.order_code}`}
                      alt="QRIS Code Resmi"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">Kode Referensi Pembayaran: {order.order_code}</div>
                </div>
              )}

              {paymentMethod === 'va' && (
                <div className="bg-slate-800 p-4 rounded-2xl space-y-2 border border-slate-700 text-xs">
                  <div className="flex justify-between border-b border-slate-700 pb-2">
                    <span className="text-slate-400">Bank Transfer VA:</span>
                    <span className="font-bold text-amber-300">BCA / Mandiri / BNI / BRI</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">Nomor Virtual Account:</span>
                    <span className="font-mono font-bold text-white text-sm bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-700">
                      8801 2399 {order.order_code.slice(-4)}
                    </span>
                  </div>
                </div>
              )}

              {/* Automatic Instant Verification Button */}
              <button
                type="button"
                onClick={handleVerify}
                className="w-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold py-3.5 rounded-2xl shadow-xl border border-amber-400/40 text-xs flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98"
              >
                <ShieldCheck className="w-4 h-4 text-slate-950" />
                <span>Verifikasi Pembayaran Otomatis Sekarang</span>
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
