'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  ChefHat,
  MapPin,
  MessageCircle,
  Star,
  ShieldCheck,
  AlertTriangle,
  UploadCloud,
  X,
  Camera,
  RefreshCw,
  ExternalLink,
  Info,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { MangoMascot, MascotState } from '@/components/mascot/MangoMascot'

export default function OrderTrackingPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orderNumber = params.orderNumber as string
  const token = searchParams.get('token') || ''

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [showOrderDetails, setShowOrderDetails] = useState<boolean>(false)
  const [copiedAwb, setCopiedAwb] = useState<boolean>(false)

  // Confirmation & Issue Modals
  const [confirmModal, setConfirmModal] = useState<boolean>(false)
  const [issueModal, setIssueModal] = useState<boolean>(false)
  const [issueNotes, setIssueNotes] = useState<string>('')
  const [submittingIssue, setSubmittingIssue] = useState<boolean>(false)
  const [issueSuccess, setIssueSuccess] = useState<string | null>(null)

  // Receipt photo upload state
  const [receiptPhotoFile, setReceiptPhotoFile] = useState<File | null>(null)
  const [receiptPhotoPreview, setReceiptPhotoPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Zoom modal for uploaded receipt
  const [zoomReceiptModal, setZoomReceiptModal] = useState<boolean>(false)

  // Receipt confirm state
  const [confirming, setConfirming] = useState<boolean>(false)
  const [confirmSuccessMsg, setConfirmSuccessMsg] = useState<string | null>(null)

  // Review modal state
  const [reviewModal, setReviewModal] = useState<boolean>(false)
  const [rating, setRating] = useState<number>(5)
  const [reviewComment, setReviewComment] = useState<string>('')
  const [submittingReview, setSubmittingReview] = useState<boolean>(false)
  const [reviewSuccess, setReviewSuccess] = useState<boolean>(false)

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderNumber}/payment?token=${token}`)
      if (!res.ok) throw new Error('Gagal memuat status pesanan.')
      const data = await res.json()
      setOrder(data.order)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
    const timer = setInterval(fetchOrder, 6000)
    return () => clearInterval(timer)
  }, [orderNumber, token])

  const handleCopyAwb = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedAwb(true)
    setTimeout(() => setCopiedAwb(false), 2000)
  }

  const formatWIB = (dateString?: string) => {
    if (!dateString) return '-'
    try {
      const d = new Date(dateString)
      return (
        new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(d) + ' WIB'
      )
    } catch {
      return dateString
    }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setPhotoError(null)
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setPhotoError('Format file harus JPG, PNG, atau WebP.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Ukuran file foto maksimal 5MB.')
      return
    }

    setReceiptPhotoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setReceiptPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setReceiptPhotoFile(null)
    setReceiptPhotoPreview(null)
    setPhotoError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleConfirmReceipt = async () => {
    setConfirming(true)
    setPhotoError(null)

    try {
      let uploadedPhotoUrl: string | undefined

      // 1. Upload photo if selected
      if (receiptPhotoFile) {
        setUploadingPhoto(true)
        const formData = new FormData()
        formData.append('proofImage', receiptPhotoFile)
        formData.append('token', token)

        const uploadRes = await fetch(`/api/orders/${orderNumber}/receipt-proof`, {
          method: 'POST',
          body: formData,
        })
        const uploadData = await uploadRes.json()

        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Gagal mengunggah foto bukti penerimaan.')
        }

        uploadedPhotoUrl = uploadData.photoUrl
        setUploadingPhoto(false)
      }

      // 2. Submit receipt confirmation
      const res = await fetch(`/api/orders/${orderNumber}/confirm-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          confirmedById: order?.customer_id,
          confirmedByName: order?.customer_name,
          receiptPhotoUrl: uploadedPhotoUrl,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengonfirmasi pesanan.')

      setConfirmSuccessMsg(data.message || 'Pesanan berhasil dikonfirmasi!')
      await fetchOrder()
      setConfirmModal(false)
      setReviewModal(true)
    } catch (err: any) {
      setPhotoError(err.message || 'Terjadi kesalahan.')
    } finally {
      setConfirming(false)
      setUploadingPhoto(false)
    }
  }

  const handleReportIssue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!issueNotes || issueNotes.trim().length < 5) {
      alert('Harap jelaskan kendala pengiriman Anda (minimal 5 karakter).')
      return
    }

    setSubmittingIssue(true)
    try {
      const res = await fetch(`/api/orders/${orderNumber}/report-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: issueNotes.trim(),
          token,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim laporan kendala.')

      setIssueSuccess('Laporan kendala pengiriman Anda berhasil dikirim ke admin.')
      await fetchOrder()
      setTimeout(() => {
        setIssueModal(false)
        setConfirmModal(false)
      }, 2000)
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim laporan kendala.')
    } finally {
      setSubmittingIssue(false)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingReview(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          orderNumber,
          customerName: order.customer_name,
          rating,
          comment: reviewComment,
        }),
      })
      if (!res.ok) throw new Error('Gagal mengirim ulasan.')
      setReviewSuccess(true)
      setTimeout(() => {
        setReviewModal(false)
      }, 2000)
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim ulasan.')
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-4">
        <MangoMascot state="loading" size="lg" showSpeechBubble />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <MangoMascot state="empty_cart" size="md" />
        <h2 className="text-xl font-black text-[#183F2E] mt-4">Pesanan Tidak Ditemukan</h2>
        <p className="text-sm text-slate-500 mt-1">Periksa kembali tautan pelacakan Anda.</p>
      </div>
    )
  }

  const isCompleted = order.order_status === 'selesai' || Boolean(order.customer_confirmed_at)
  const isPaid = order.payment_status === 'paid'

  // Map 8-stage visual timeline accurately matching actual status
  const statusRank: Record<string, number> = {
    menunggu_pembayaran: 0,
    paid: 1,
    diverifikasi: 1,
    diproses: 2,
    siap_dikirim: 3,
    menunggu_kurir: 4,
    kurir_pickup: 5,
    dikirim: 6,
    dalam_perjalanan: 6,
    sampai: 7,
    menunggu_konfirmasi: 7,
    selesai: 8,
  }

  const currentRank = isCompleted
    ? 8
    : order.courier_status === 'DELIVERED' || order.order_status === 'sampai'
    ? 7
    : order.courier_status === 'IN_TRANSIT'
    ? 6
    : order.courier_status === 'PICKED_UP'
    ? 5
    : order.courier_status === 'SEARCHING'
    ? 4
    : statusRank[order.order_status] ?? (isPaid ? 2 : 0)

  // Dynamic Mascot State & Copywriting per Master Prompt
  let mascotState: MascotState = 'preparing'
  let mascotMessage = 'Pesananmu lagi diracik kitchen dengan buah tropis segar & bumbu mantap! 👨‍🍳🥭'
  let statusBadgeText = 'Sedang Disiapkan Kitchen'
  let statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200'

  if (isCompleted || order.order_status === 'selesai') {
    mascotState = 'delivered'
    mascotMessage = 'Selamat menikmati asinan & rujak buah segar khas AMM! Jangan lupa ulasannya ya~ 🥭⭐'
    statusBadgeText = 'Pesanan Selesai'
    statusBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200'
  } else if (order.courier_status === 'DELIVERED' || order.order_status === 'sampai' || currentRank >= 7) {
    mascotState = 'delivered'
    mascotMessage = 'Pesanan telah sampai di lokasi tujuan Anda! Silakan periksa paket & konfirmasi penerimaan di bawah. 🎉📦'
    statusBadgeText = 'Pesanan Telah Tiba'
    statusBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200'
  } else if (order.courier_status === 'IN_TRANSIT' || order.order_status === 'dikirim' || order.order_status === 'dalam_perjalanan' || currentRank === 6) {
    mascotState = 'in_transit'
    mascotMessage = 'Kurir sedang meluncur cepat menuju alamat kamu! Siap-siap merem melek! 🛵💨'
    statusBadgeText = 'Dalam Perjalanan'
    statusBadgeClass = 'bg-sky-50 text-sky-800 border-sky-200'
  } else if (order.courier_status === 'PICKED_UP' || order.order_status === 'kurir_pickup' || currentRank === 5) {
    mascotState = 'in_transit'
    mascotMessage = 'Kurir telah mengambil paket dari outlet AMM dan mulai berangkat ke lokasi Anda! 🛵📦'
    statusBadgeText = 'Kurir Membawa Paket'
    statusBadgeClass = 'bg-sky-50 text-sky-800 border-sky-200'
  } else if (order.courier_status === 'SEARCHING' || order.order_status === 'menunggu_kurir' || currentRank === 4) {
    mascotState = 'waiting_courier'
    mascotMessage = 'Paket sudah siap di meja penjemputan, memanggil kurir ekspedisi online... 🛵✨'
    statusBadgeText = 'Menunggu Kurir'
    statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200'
  } else if (order.order_status === 'siap_dikirim' || currentRank === 3) {
    mascotState = 'packing'
    mascotMessage = 'Pesananmu sudah siap & dikemas rapi dengan segel higienis! Siap diserahkan ke kurir. 📦🌿'
    statusBadgeText = 'Selesai Dikemas'
    statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200'
  } else if (order.order_status === 'diproses' || currentRank >= 2) {
    mascotState = 'preparing'
    mascotMessage = 'Pesananmu sedang diracik kitchen! Buah segar sedang dipotong & bumbu diracik khas AMM. 👨‍🍳🥭'
    statusBadgeText = 'Sedang Disiapkan Kitchen'
    statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200'
  } else if (!isPaid) {
    mascotState = 'idle'
    mascotMessage = 'Selesaikan pembayaran agar pesananmu segera diproses dapur AMM! 💳✨'
    statusBadgeText = 'Menunggu Pembayaran'
    statusBadgeClass = 'bg-rose-50 text-rose-800 border-rose-200'
  }

  // 8 Steps for Progress Timeline
  const steps = [
    {
      id: 1,
      label: 'Pesanan Dikonfirmasi',
      desc: isPaid ? 'Pembayaran lunas terverifikasi sistem' : 'Menunggu pembayaran lunas',
      icon: Clock,
      done: currentRank >= 1,
      active: currentRank === 0,
    },
    {
      id: 2,
      label: 'Sedang Disiapkan Kitchen',
      desc: 'Buah tropis dipotong segar & bumbu diracik khas AMM',
      icon: ChefHat,
      done: currentRank >= 2,
      active: currentRank === 1,
    },
    {
      id: 3,
      label: 'Selesai Dikemas',
      desc: 'Paket disegel higienis dengan sendok bumbu AMM',
      icon: Package,
      done: currentRank >= 3,
      active: currentRank === 2,
    },
    {
      id: 4,
      label: 'Menunggu Kurir',
      desc: 'Memanggil armada kurir ekspedisi online',
      icon: Truck,
      done: currentRank >= 4,
      active: currentRank === 3,
    },
    {
      id: 5,
      label: 'Kurir Mengambil Pesanan',
      desc: order.courier_name ? `Kurir ${order.courier_name} mengambil paket di outlet` : 'Paket diserahkan ke kurir pengantar',
      icon: Truck,
      done: currentRank >= 5,
      active: currentRank === 4,
    },
    {
      id: 6,
      label: 'Dalam Perjalanan ke Alamat',
      desc: 'Kurir sedang meluncur cepat menuju lokasi tujuan Anda',
      icon: Truck,
      done: currentRank >= 6,
      active: currentRank === 5 || currentRank === 6,
    },
    {
      id: 7,
      label: 'Pesanan Telah Tiba di Lokasi',
      desc: isCompleted ? 'Paket telah tiba di lokasi penerima' : 'Paket telah sampai di titik tujuan',
      icon: MapPin,
      done: currentRank >= 7,
      active: currentRank === 7,
    },
    {
      id: 8,
      label: 'Selesai & Dikonfirmasi',
      desc: isCompleted ? 'Dikonfirmasi diterima oleh pelanggan & poin loyalty bertambah' : 'Menunggu konfirmasi penerimaan Anda',
      icon: CheckCircle,
      done: currentRank >= 8,
      active: currentRank === 8,
    },
  ]

  // Eligibility to show "Pesanan Sudah Diterima" button
  const isEligibleToConfirm = isPaid && !isCompleted && currentRank >= 2

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 max-w-3xl mx-auto space-y-6">
      {/* SECTION A: ORDER HEADER CARD */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Pelacakan Pesanan Resmi AMM
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#183F2E] font-mono flex items-center gap-2 mt-0.5">
              <span className="text-[#8BC137]">#</span>{orderNumber}
            </h1>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Dipesan: {formatWIB(order.created_at)}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:self-center">
            <span className={`px-3 py-1 rounded-full text-xs font-black border ${statusBadgeClass}`}>
              ● {statusBadgeText}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                isPaid
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {isPaid ? '✓ Lunas' : 'Menunggu Bayar'}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200">
              🛵 Kurir Online
            </span>
          </div>
        </div>

        {/* View Order Details Accordion Toggle */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-500">
            {order.items?.length || 0} item pesanan • Total:{' '}
            <strong className="text-[#183F2E] font-mono font-bold">Rp {order.total.toLocaleString('id-ID')}</strong>
          </span>

          <button
            type="button"
            onClick={() => setShowOrderDetails(!showOrderDetails)}
            className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <span>{showOrderDetails ? 'Sembunyikan Menu' : 'Lihat Rincian Menu'}</span>
            {showOrderDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Expandable Order Details Snapshot */}
        {showOrderDetails && (
          <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
            <div className="space-y-2">
              {order.items?.map((it: any) => (
                <div key={it.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="font-bold text-[#183F2E] block">
                      {it.qty}x {it.product_name} <span className="text-emerald-700">({it.size})</span>
                    </span>
                    {it.seasonings && it.seasonings.length > 0 && (
                      <div className="text-[11px] text-amber-800 flex flex-wrap gap-1.5">
                        <span className="text-slate-400">Bumbu:</span>
                        {it.seasonings.map((s: any, idx: number) => (
                          <span key={idx} className="bg-white px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                            {s.qty}x {s.seasoning_name}
                          </span>
                        ))}
                      </div>
                    )}
                    {it.custom_fruit_notes && (
                      <p className="text-[11px] text-amber-700 italic">Catatan Buah: {it.custom_fruit_notes}</p>
                    )}
                  </div>
                  <span className="font-mono text-slate-800 font-bold whitespace-nowrap">
                    Rp {it.subtotal.toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
            </div>

            {/* Bill Snapshot */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Menu</span>
                <span className="font-mono text-slate-800">Rp {(order.subtotal || order.total).toLocaleString('id-ID')}</span>
              </div>
              {order.delivery_fee > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Ongkos Kirim Kurir</span>
                  <span className="font-mono text-slate-800">Rp {Number(order.delivery_fee).toLocaleString('id-ID')}</span>
                </div>
              )}
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Diskon Promo {order.voucher_code ? `(${order.voucher_code})` : ''}</span>
                  <span className="font-mono">-Rp {Number(order.discount_amount).toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-[#183F2E] pt-2 border-t border-slate-200">
                <span>Total Lunas</span>
                <span className="font-mono text-[#183F2E]">Rp {order.total.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION B: HERO TRACKING CARD WITH ANIMATED MANGO MASCOT */}
      <div className="rounded-3xl p-6 sm:p-8 border border-[#183F2E] bg-gradient-to-br from-[#183F2E] via-[#123626] to-[#0d271b] shadow-xl text-center space-y-5 relative overflow-hidden">
        {/* Subtle Decorative Background Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#8BC137]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#FFD83D]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <MangoMascot
            state={mascotState}
            size="lg"
            showSpeechBubble
            message={mascotMessage}
          />
        </div>

        <div className="relative z-10 space-y-1">
          <span className="text-xs uppercase tracking-widest text-[#FFD83D] font-extrabold">Status Pengiriman Terkini</span>
          <h2 className="text-xl sm:text-2xl font-black text-white">{statusBadgeText}</h2>
          <p className="text-xs sm:text-sm text-[#FFF8E8]/90 max-w-md mx-auto leading-relaxed pt-1">
            {mascotMessage}
          </p>
        </div>

        {/* GPS Disclaimer Banner */}
        <div className="relative z-10 max-w-lg mx-auto p-3.5 rounded-2xl bg-white/10 border border-white/15 text-[11px] text-[#FFF8E8]/80 flex items-start gap-2.5 text-left">
          <Info className="w-4 h-4 text-[#FFD83D] flex-shrink-0 mt-0.5" />
          <p className="leading-snug">
            <strong>Catatan Pelacakan:</strong> Status kurir diperbarui otomatis secara berkala oleh sistem dapur AMM & kurir ekspedisi. Peta GPS langsung tidak aktif untuk efisiensi pengiriman instan.
          </p>
        </div>
      </div>

      {/* Delivery Issue Alert Banner if previously reported */}
      {order.delivery_issue_reported === 1 && (
        <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-900 block">Laporan Kendala Pengiriman Tercatat</span>
            <p className="text-amber-800">&ldquo;{order.delivery_issue_notes}&rdquo;</p>
            <p className="text-[11px] text-amber-700 pt-1">
              Tim admin sedang memeriksa kendala ini dengan pihak ekspedisi kurir. Pesanan belum ditutup.
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Success Toast */}
      {confirmSuccessMsg && (
        <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center flex items-center justify-center gap-2 shadow-sm">
          <CheckCircle className="w-4 h-4 text-[#8BC137]" />
          <span>{confirmSuccessMsg}</span>
        </div>
      )}

      {/* SECTION C: 8-STAGE VISUAL PROGRESS TIMELINE */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 sm:p-7 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-black text-[#183F2E] uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-[#8BC137]" /> 8 Tahapan Pengiriman Pesanan
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            Progres: {currentRank} / 8 Tahap
          </span>
        </div>

        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {steps.map((st) => {
            const Icon = st.icon
            return (
              <div key={st.id} className="relative flex items-start gap-3 sm:gap-4 group">
                <div
                  className={`absolute -left-6 sm:-left-8 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                    st.done
                      ? 'bg-[#8BC137] text-[#183F2E] ring-4 ring-[#8BC137]/20 shadow-sm'
                      : st.active
                      ? 'bg-[#FFD83D] text-[#183F2E] animate-pulse ring-4 ring-[#FFD83D]/25 shadow-sm'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-sm truncate ${
                        st.done ? 'text-[#183F2E] font-black' : st.active ? 'text-amber-800 font-black' : 'text-slate-400 font-medium'
                      }`}
                    >
                      {st.label}
                    </h4>
                    {st.done && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                        Selesai
                      </span>
                    )}
                    {st.active && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200 animate-pulse">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{st.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* SECTION D: DELIVERY INFORMATION CARD */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 sm:p-7 space-y-4">
        <h3 className="text-sm font-black text-[#183F2E] flex items-center gap-2 pb-3 border-b border-slate-100">
          <Truck className="w-4 h-4 text-[#8BC137]" /> Informasi Kurir & Pengantaran
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Courier Service */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-400 block text-[11px]">Layanan Kurir:</span>
            <p className="font-bold text-[#183F2E] text-sm">{order.courier_name || 'Kurir Online'}</p>
            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Instant / SameDay
            </span>
          </div>

          {/* Tracking Number / AWB with Copy */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-400 block text-[11px]">No. Resi / AWB / Pelacakan:</span>
            <div className="flex items-center justify-between gap-1 mt-0.5">
              <p className="font-mono font-bold text-[#183F2E] text-sm truncate">
                {order.courier_tracking_number || 'Sedang Dialokasikan'}
              </p>
              {order.courier_tracking_number && (
                <button
                  type="button"
                  onClick={() => handleCopyAwb(order.courier_tracking_number)}
                  className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition flex-shrink-0"
                  title="Salin No. Resi"
                >
                  {copiedAwb ? <Check className="w-3.5 h-3.5 text-[#8BC137]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            {copiedAwb && (
              <span className="text-[10px] text-emerald-700 font-bold block">✓ No. Resi berhasil disalin!</span>
            )}
          </div>

          {/* Estimated Time */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-400 block text-[11px]">Estimasi Tiba:</span>
            <p className="font-bold text-[#183F2E] text-sm">
              {order.estimated_delivery_time || 'Hari ini (WIB)'}
            </p>
            <span className="text-[10px] text-slate-400 block">Disesuaikan lalu lintas jalan</span>
          </div>
        </div>

        {/* Recipient Address */}
        {order.delivery_address && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold">
              <MapPin className="w-3.5 h-3.5 text-amber-600" />
              <span>Alamat Tujuan Pengiriman:</span>
            </div>
            <p className="text-slate-800 leading-relaxed pl-5">{order.delivery_address}</p>
            {order.delivery_instructions && (
              <p className="text-amber-800 text-[11px] font-medium pl-5 pt-1">
                Catatan Lokasi: &ldquo;{order.delivery_instructions}&rdquo;
              </p>
            )}
          </div>
        )}
      </div>

      {/* SECTION F & G: INDEPENDENT CUSTOMER ACTION (CONFIRM RECEIPT) */}
      {isEligibleToConfirm && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-6 sm:p-7 text-center shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center mx-auto text-[#8BC137] shadow-sm">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-[#183F2E]">Pesanan Sudah Tiba di Tangan Anda?</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Periksa kesegaran buah dan bumbu Asinan Merem Melek. Jika sudah lengkap, konfirmasi penerimaan di bawah untuk menyelesaikan pesanan dan menambah poin membership Anda!
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setConfirmModal(true)
                setPhotoError(null)
              }}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle className="w-5 h-5" /> Pesanan Sudah Diterima
            </button>

            <button
              type="button"
              onClick={() => {
                setIssueModal(true)
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs transition cursor-pointer shadow-sm"
            >
              Saya Belum Menerima Pesanan
            </button>
          </div>
        </div>
      )}

      {/* COMPLETED BANNER & REVIEW CTA */}
      {isCompleted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 sm:p-7 text-center shadow-sm space-y-4">
          <div className="flex items-center justify-center gap-1 text-amber-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-current" />
            ))}
          </div>
          <div>
            <h3 className="text-xl font-black text-[#183F2E]">Pesanan Selesai & Dikonfirmasi!</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
              Dikonfirmasi pada:{' '}
              <strong className="text-slate-800 font-mono">
                {order.customer_confirmed_at ? formatWIB(order.customer_confirmed_at) : formatWIB(order.updated_at)}
              </strong>
            </p>
          </div>

          {/* Uploaded Receipt Photo Display if available */}
          {order.receipt_photo_url && (
            <div className="pt-2 flex flex-col items-center">
              <span className="text-[11px] text-emerald-800 font-bold block mb-1.5">
                📸 Foto Bukti Penerimaan Tersimpan:
              </span>
              <img
                src={order.receipt_photo_url}
                alt="Bukti Penerimaan"
                className="w-24 h-24 object-cover rounded-2xl border border-slate-200 shadow-md cursor-pointer hover:scale-105 transition"
                onClick={() => setZoomReceiptModal(true)}
              />
              <button
                type="button"
                onClick={() => setZoomReceiptModal(true)}
                className="text-[10px] text-slate-500 hover:text-slate-800 underline mt-1.5"
              >
                Lihat Ukuran Penuh
              </button>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => setReviewModal(true)}
              className="px-6 py-3 rounded-full bg-white text-[#183F2E] font-black text-xs hover:bg-slate-50 border border-slate-200 shadow-sm transition inline-flex items-center gap-2 cursor-pointer"
            >
              <Star className="w-4 h-4 text-amber-500 fill-current" /> Beri Penilaian & Ulasan Buah
            </button>
          </div>
        </div>
      )}

      {/* WHATSAPP CS HANDOFF BUTTON */}
      <div className="text-center pt-2">
        <a
          href={`https://wa.me/628118281220?text=Halo%20Admin%20AMM%2C%20saya%20ingin%20menanyakan%20status%20pesanan%20${orderNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#25D366] text-[#0C251B] font-black text-xs hover:bg-[#20ba5a] shadow-md transition"
        >
          <MessageCircle className="w-4 h-4" /> Hubungi CS Outlet via WhatsApp (0811-8281-220)
        </a>
      </div>

      {/* CONFIRMATION MODAL WITH RECEIPT PHOTO UPLOAD */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 max-w-md w-full text-center shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-[#8BC137]">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#183F2E]">Pesanan sudah kamu terima?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Pastikan paket Asinan Merem Melek sudah sampai dan kamu telah menerimanya dalam keadaan baik.
              </p>
            </div>

            {/* Optional Photo Upload Section */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-2">
              <span className="text-xs font-bold text-[#183F2E] flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-600" /> Tambahkan Foto Bukti Penerimaan (Opsional)
              </span>
              <p className="text-[11px] text-slate-500">
                Unggah foto paket atau produk yang diterima (format JPG, PNG, atau WebP, maks 5MB).
              </p>

              {receiptPhotoPreview ? (
                <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-200 bg-white">
                  <img src={receiptPhotoPreview} alt="Preview" className="w-full h-36 object-contain" />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-rose-500 rounded-full text-white transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoSelect}
                    className="hidden"
                    id="receipt-photo-input"
                  />
                  <label
                    htmlFor="receipt-photo-input"
                    className="flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-slate-300 hover:border-[#8BC137] bg-white cursor-pointer transition text-xs text-slate-600"
                  >
                    <UploadCloud className="w-6 h-6 text-[#8BC137] mb-1" />
                    <span className="font-bold text-[#183F2E]">Pilih Foto Bukti Penerimaan</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">JPG / PNG / WebP maks 5MB</span>
                  </label>
                </div>
              )}

              {photoError && (
                <p className="text-[11px] text-rose-500 mt-1 font-semibold">{photoError}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={confirming || uploadingPhoto}
                onClick={handleConfirmReceipt}
                className="w-full py-3.5 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 transition"
              >
                {confirming || uploadingPhoto ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{uploadingPhoto ? 'Mengunggah Foto...' : 'Memproses Konfirmasi...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Ya, Pesanan Sudah Diterima</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={confirming || uploadingPhoto}
                onClick={() => {
                  setConfirmModal(false)
                  setIssueModal(true)
                }}
                className="w-full py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Belum, Saya Belum Menerima
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ISSUE MODAL ("BELUM MENERIMA PESANAN") */}
      {issueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-[#183F2E] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Laporkan Kendala Pengiriman
              </h3>
              <button
                type="button"
                onClick={() => setIssueModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Pesanan belum tiba atau kurir salah antar? Sampaikan laporan kendala di bawah agar tim admin kami dapat segera memeriksa status kurir dan menghubungi Anda. <strong>Status pesanan tidak akan ditutup.</strong>
            </p>

            {issueSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center text-xs text-emerald-800 font-bold">
                {issueSuccess}
              </div>
            ) : (
              <form onSubmit={handleReportIssue} className="space-y-4">
                <textarea
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  placeholder="Contoh: Kurir menyatakan paket sampai tapi saya belum menerima paket di pos satpam..."
                  rows={3}
                  required
                  className="w-full text-xs rounded-2xl p-3.5 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#183F2E] focus:ring-2 focus:ring-[#8BC137]/20 transition"
                />

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="submit"
                    disabled={submittingIssue}
                    className="flex-1 py-3 rounded-full bg-amber-400 hover:bg-amber-500 text-[#183F2E] font-black text-xs flex items-center justify-center gap-1 shadow-sm cursor-pointer transition"
                  >
                    {submittingIssue ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Kirim Laporan Kendala'}
                  </button>

                  <a
                    href={`https://wa.me/628118281220?text=Halo%20Admin%20AMM%2C%20pesanan%20${orderNumber}%20belum%20saya%20terima`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 rounded-full bg-[#25D366] text-[#0C251B] font-black text-xs flex items-center justify-center gap-1 text-center shadow-sm"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Chat CS WhatsApp
                  </a>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* REVIEW MODAL */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-black text-[#183F2E] mb-1 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-current" /> Ulasan Buah & Bumbu Merem Melek
            </h3>
            <p className="text-xs text-slate-500">
              Ulasan Anda sangat berarti bagi tim dapur kami untuk menjaga kualitas kesegaran buah.
            </p>

            {reviewSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center text-xs text-emerald-800 font-bold">
                Terima kasih atas ulasan manisnya! 🥭✨
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="flex justify-center gap-2 py-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-1 hover:scale-110 transition cursor-pointer"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          s <= rating ? 'text-amber-400 fill-current' : 'text-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Ceritakan kesegaran buah, rasa bumbu rujak, atau pengalaman pengiriman Anda..."
                    rows={3}
                    required
                    className="w-full text-xs rounded-2xl p-3.5 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#183F2E] focus:ring-2 focus:ring-[#8BC137]/20 transition"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewModal(false)}
                    className="flex-1 py-3 rounded-full bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 cursor-pointer transition"
                  >
                    Nanti Saja
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="flex-1 py-3 rounded-full bg-[#8BC137] text-[#183F2E] font-black text-xs hover:bg-[#7ab02d] flex items-center justify-center gap-1 shadow-sm cursor-pointer transition"
                  >
                    {submittingReview ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Kirim Ulasan'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* FULL-SIZE ZOOM MODAL FOR RECEIPT PHOTO */}
      {zoomReceiptModal && order?.receipt_photo_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative max-w-2xl w-full p-4 text-center">
            <button
              onClick={() => setZoomReceiptModal(false)}
              className="absolute top-0 right-0 p-2 bg-white/20 hover:bg-rose-500 rounded-full text-white cursor-pointer transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={order.receipt_photo_url}
              alt="Foto Bukti Penerimaan"
              className="max-h-[80vh] w-auto mx-auto rounded-2xl shadow-2xl object-contain border border-white/20"
            />
            <p className="text-xs text-white/70 mt-3 font-mono">
              Diunggah pada: {order.receipt_photo_uploaded_at ? formatWIB(order.receipt_photo_uploaded_at) : '-'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
