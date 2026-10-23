import React, { useState, useEffect } from 'react'
import { CheckCircle2, MessageSquare, MapPin, ArrowRight, Sparkles, ShoppingBag, Clock, Copy, HandCoins } from 'lucide-react'
import { Order, Branch } from '../../types'
import { api } from '../../api'

interface OrderSuccessViewProps {
  order: Order
  branch: Branch | null
  onBackToMenu: () => void
}

export const OrderSuccessView: React.FC<OrderSuccessViewProps> = ({
  order,
  branch,
  onBackToMenu,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isNotifying, setIsNotifying] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  
  // Handoff Animation State
  const [showSuccessAnim, setShowSuccessAnim] = useState(false)

  // Real-time Timer Sync with Server expires_at
  useEffect(() => {
    if (order.payment_status !== 'pending') return

    const calculateTimeLeft = () => {
      const expires = new Date(order.payment_expired_at).getTime()
      const now = new Date().getTime()
      return Math.max(0, Math.floor((expires - now) / 1000))
    }

    setTimeLeft(calculateTimeLeft())

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(interval)
  }, [order.payment_status, order.payment_expired_at])

  // Watch for Payment Verified Status Change to trigger Animation
  useEffect(() => {
    if (order.payment_status === 'paid' && !order.whatsapp_sent) {
      setShowSuccessAnim(true)
      
      const timer = setTimeout(() => {
        // Mark as sent in backend to prevent animation loop
        api.markWhatsAppSent(order.id)
      }, 2500) // Wait for animation

      return () => clearTimeout(timer)
    }
  }, [order.payment_status, order.whatsapp_sent, order.id])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const handleNotifyTransfer = async () => {
    setIsNotifying(true)
    try {
      await api.notifyTransfer(order.id)
      // Visual feedback only, status stays pending
      alert('Informasi transfer telah diteruskan ke sistem. Kami sedang menunggu konfirmasi pembayaran.')
    } catch (e) {
      console.error(e)
    } finally {
      setIsNotifying(false)
    }
  }

  const copyRekening = () => {
    const bank = api.getBankAccount()
    navigator.clipboard.writeText(bank.number)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  if (showSuccessAnim) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 p-6 animate-fade-in">
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_50px_rgba(16,185,129,0.5)]">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <h2 className="mt-6 text-3xl font-black text-white text-center">Pembayaran Berhasil!</h2>
        <p className="mt-2 text-emerald-400 text-center max-w-sm">
          Pesanan sedang diteruskan ke WhatsApp Outlet...
        </p>
      </div>
    )
  }

  const bankAccount = api.getBankAccount()

  return (
    <section className="my-12 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 animate-fade-in">
      
      <div className="relative rounded-3xl p-5 sm:p-8 md:p-12 bg-gradient-to-b from-[#10462f] via-[#0b3826] to-[#072a1d] border border-white/20 shadow-2xl overflow-hidden text-center space-y-6">
        
        {/* Sunset Ambient Glow */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-amber-500/20 via-orange-500/10 to-transparent blur-3xl pointer-events-none" />

        {/* Checkmark Icon */}
        <div className="w-20 h-20 rounded-full bg-[#A8D5A2]/20 border border-[#A8D5A2]/40 text-[#A8D5A2] flex items-center justify-center mx-auto shadow-2xl animate-bounce">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 text-[#F5E6A3] text-xs font-bold uppercase tracking-widest border border-white/15">
            <Sparkles className="w-3.5 h-3.5" /> {order.payment_status === 'pending' ? 'MENUNGGU PEMBAYARAN TRANSFER' : 'TERVERIFIKASI OTOMATIS'}
          </div>
          <h2 className="font-display font-black text-2xl sm:text-4xl md:text-5xl text-white tracking-tight leading-tight">
            {order.payment_status === 'pending' ? 'SELESAIKAN PEMBAYARAN' : (
              <>ORDER KAMU SIAP <span className="text-[#A8D5A2]">BIKIN MELEK!</span></>
            )}
          </h2>
          <p className="text-xs sm:text-base text-[#B7E4C7]/90 max-w-xl mx-auto">
            Pesanan <span className="font-mono text-[#F5E6A3] font-bold">{order.order_code}</span> telah diterima. {order.payment_status === 'pending' ? 'Silakan lakukan transfer ke rekening di bawah agar pesanan dapat diproses.' : 'Langsung disiapkan oleh dapur outlet.'}
          </p>
        </div>

        {order.payment_status === 'pending' && (
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-3xl p-6 mt-4 text-left space-y-5 mx-auto max-w-md shadow-lg shadow-black/50">
            <div className="flex flex-col items-center justify-center bg-black/40 py-4 rounded-2xl border border-amber-500/20">
              <span className="text-amber-500/80 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Clock className="w-4 h-4"/> Sisa Waktu Pembayaran</span>
              <span className={`font-mono text-4xl font-black tabular-nums ${timeLeft < 300 ? 'text-rose-500 animate-pulse' : 'text-amber-400'}`}>
                {formatTime(timeLeft)}
              </span>
              <p className="text-[10px] text-amber-200/50 mt-1">Order otomatis dibatalkan jika waktu habis.</p>
            </div>

            <div className="space-y-1 text-center">
              <span className="text-sm text-slate-300">Total Pembayaran</span>
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Rp {(order.total || 0).toLocaleString('id-ID')}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <span className="text-xs text-slate-400">Bank Tujuan</span>
                <span className="font-bold text-white uppercase">{bankAccount.bank}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <span className="text-xs text-slate-400">Atas Nama</span>
                <span className="font-bold text-white">{bankAccount.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Nomor Rekening</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-lg text-amber-400">{bankAccount.number}</span>
                  <button onClick={copyRekening} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
                    {isCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleNotifyTransfer}
                disabled={isNotifying}
                className="w-full py-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all active:scale-95"
              >
                <HandCoins className="w-5 h-5" />
                {isNotifying ? 'Memproses...' : 'SAYA SUDAH TRANSFER'}
              </button>
              <p className="text-center text-[10px] text-amber-200/60 mt-3 leading-relaxed px-4">
                Kami sedang menunggu konfirmasi pembayaran. Pesanan akan otomatis diproses setelah pembayaran berhasil diverifikasi oleh sistem.
              </p>
            </div>
          </div>
        )}

        {order.payment_status === 'expired' && (
          <div className="bg-rose-950/40 border border-rose-500/40 rounded-3xl p-6 mt-4 text-center space-y-3 mx-auto max-w-md">
            <h3 className="font-bold text-rose-400 text-lg">PEMBAYARAN GAGAL / WAKTU HABIS</h3>
            <p className="text-sm text-rose-200/70">Waktu pembayaran Anda telah habis. Silakan buat pesanan baru.</p>
          </div>
        )}

        {/* Order Details Card */}
        <div className="bg-black/30 backdrop-blur-md p-6 rounded-3xl border border-white/15 text-left text-xs space-y-3">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-white/10 pb-2 gap-1">
            <span className="text-white/60">Kode Referensi Order:</span>
            <span className="font-mono font-bold text-[#F5E6A3]">{order.order_code}</span>
          </div>

          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-white/10 pb-2 gap-1">
            <span className="text-white/60">Pemesan:</span>
            <span className="font-bold text-white">{order.customer_name} (+{order.customer_phone})</span>
          </div>

          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-white/10 pb-2 gap-1">
            <span className="text-white/60">Outlet Cabang:</span>
            <span className="font-bold text-[#B7E4C7]">{order.branch_name}</span>
          </div>

          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-white/10 pb-2 gap-1">
            <span className="text-white/60">Metode Pengambilan:</span>
            <span className="font-bold text-amber-300 capitalize">{order.delivery_type}</span>
          </div>

          {order.delivery_type === 'delivery' && (
            <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-white/10 pb-2 gap-1">
              <span className="text-white/60">Alamat Kirim:</span>
              <span className="font-bold text-white sm:text-right max-w-full sm:max-w-xs">{order.delivery_address}</span>
            </div>
          )}

          {/* Itemized List */}
          <div className="pt-2 space-y-1.5">
            <span className="text-white/60 font-bold block">Rincian Produk:</span>
            {order.items.map((it) => (
              <div key={it.id} className="flex justify-between text-white/80">
                <span>• {it.menu_name} ({it.qty}x)</span>
                <span className="font-mono">Rp {(it.price_each * it.qty).toLocaleString('id-ID')}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-white/15 flex justify-between text-sm font-extrabold text-[#B7E4C7]">
            <span>Total Pembayaran</span>
            <span>Rp {(order.total || 0).toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          {branch && order.payment_status === 'paid' && (
            <a
              href={`https://wa.me/${branch.whatsapp_number}?text=${encodeURIComponent(
                `Halo Admin Asinan Merem Melek!\n\nPembayaran untuk pesanan ${order.order_code} telah diverifikasi.\n\nNama: ${order.customer_name}\nTotal: Rp ${order.total.toLocaleString('id-ID')}\nStatus: TERKONFIRMASI (PAID)\n\nMohon diproses pesanannya ya kak. Terima kasih 🙏`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-[#25D366] hover:bg-emerald-500 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg"
            >
              <MessageSquare className="w-4 h-4" /> Hubungi via WhatsApp
            </a>
          )}

          <button
            onClick={onBackToMenu}
            className="flex-1 bg-[#A8D5A2] hover:bg-[#bfe3ba] text-[#0b3826] font-extrabold py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg"
          >
            <ShoppingBag className="w-4 h-4" /> {order.payment_status === 'expired' ? 'BUAT PESANAN BARU' : 'Kembali Ke Menu'}
          </button>
        </div>

      </div>

    </section>
  )
}
