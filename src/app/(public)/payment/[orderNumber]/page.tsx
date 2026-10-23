'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import {
  Copy,
  Check,
  Clock,
  Upload,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  QrCode,
  Sparkles,
} from 'lucide-react'
import { MangoMascot } from '@/components/mascot/MangoMascot'

export default function PaymentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderNumber = params.orderNumber as string
  const token = searchParams.get('token') || ''

  const [orderData, setOrderData] = useState<any>(null)
  const [paymentData, setPaymentData] = useState<any>(null)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(720)
  const [isExpired, setIsExpired] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [copiedBank, setCopiedBank] = useState<boolean>(false)
  const [copiedAmount, setCopiedAmount] = useState<boolean>(false)

  // Upload state
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [refNumber, setRefNumber] = useState<string>('')
  const [uploading, setUploading] = useState<boolean>(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false)

  // Fetch payment data
  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/orders/${orderNumber}/payment?token=${token}`)
      if (!res.ok) throw new Error('Gagal memuat status pembayaran.')
      const data = await res.json()
      setOrderData(data.order)
      setPaymentData(data.payment)
      setRemainingSeconds(data.remainingSeconds)
      setIsExpired(data.isExpired)
      setLoading(false)
    } catch (err: any) {
      console.error(err)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    // Poll status every 4 seconds
    const interval = setInterval(fetchStatus, 4000)
    return () => clearInterval(interval)
  }, [orderNumber, token])

  // Countdown timer tick
  useEffect(() => {
    if (remainingSeconds <= 0) return
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [remainingSeconds])

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const copyToClipboard = (text: string, type: 'bank' | 'amount') => {
    navigator.clipboard.writeText(text)
    if (type === 'bank') {
      setCopiedBank(true)
      setTimeout(() => setCopiedBank(false), 2000)
    } else {
      setCopiedAmount(true)
      setTimeout(() => setCopiedAmount(false), 2000)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      if (selected.size > 5 * 1024 * 1024) {
        setUploadError('Ukuran file maksimal 5MB.')
        return
      }
      setFile(selected)
      setPreviewUrl(URL.createObjectURL(selected))
      setUploadError(null)
    }
  }

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setUploadError('Silakan pilih file bukti transfer terlebih dahulu.')
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('proofImage', file)
      formData.append('referenceNumber', refNumber)
      formData.append('amountTransferred', String(orderData?.total || 0))

      const res = await fetch(`/api/orders/${orderNumber}/proof`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim bukti transfer.')
      }

      setUploadSuccess(true)
      fetchStatus()
    } catch (err: any) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4 px-4">
        <MangoMascot state="loading" size="lg" showSpeechBubble />
      </div>
    )
  }

  if (!orderData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <MangoMascot state="empty_cart" size="md" />
        <h2 className="text-xl font-bold text-white mt-4">Pesanan Tidak Ditemukan</h2>
        <p className="text-sm text-white/60 mt-2">Periksa kembali nomor pesanan atau tautan Anda.</p>
      </div>
    )
  }

  const isVerified = paymentData?.status === 'payment_verified' || orderData?.payment_status === 'paid'
  const isUnderReview = paymentData?.status === 'under_verification'
  const isRejected = paymentData?.status === 'payment_rejected'

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 max-w-3xl mx-auto">
      {/* Top Banner & Mascot Header */}
      <div className="text-center mb-8">
        <MangoMascot
          state={isVerified ? 'payment_success' : isExpired ? 'empty_cart' : 'idle'}
          size="md"
          showSpeechBubble
          message={
            isVerified
              ? 'Yeeay! Pembayaranmu sukses diverifikasi! Pesanan lagi disiapkan!'
              : isUnderReview
              ? 'Bukti transfermu sudah diterima! Sedang diverifikasi kasir AMM.'
              : isExpired
              ? 'Waktu pembayaran 12 menit telah berakhir.'
              : 'Selesaikan transfer bank dalam 12 menit ya bestie!'
          }
        />
        <h1 className="text-2xl sm:text-3xl font-black text-[#183F2E] mt-3">
          {isVerified ? 'Pembayaran Berhasil Diverifikasi! 🎉' : 'Instruksi Pembayaran Transfer Bank'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Nomor Pesanan:{' '}
          <span className="font-mono font-bold text-[#183F2E] tracking-wide">#{orderNumber}</span>
        </p>
      </div>

      {/* Countdown Card (Only if pending) */}
      {!isVerified && !isExpired && (
        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 mb-6 text-center space-y-1">
          <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">
            <Clock className="w-4 h-4 text-amber-600 animate-spin-slow" /> Batas Waktu Pembayaran
          </div>
          <div className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-[#183F2E]">
            {formatTimer(remainingSeconds)}
          </div>
          <p className="text-xs text-slate-500 pt-1">
            Pesanan akan otomatis dibatalkan jika bukti transfer belum terverifikasi dalam batas waktu di atas.
          </p>
        </div>
      )}

      {/* Expired Alert */}
      {isExpired && !isVerified && (
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-center mb-6">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <h3 className="text-lg font-black text-rose-800">Waktu Pembayaran Kedaluwarsa</h3>
          <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto">
            Batas waktu transfer 12 menit telah habis. Jika Anda sudah terlanjur mentransfer, silakan hubungi tim
            bantuan AMM via WhatsApp untuk verifikasi manual atau refund.
          </p>
          <a
            href="https://wa.me/628118281220?text=Halo%20Admin%20AMM%2C%20saya%20sudah%20transfer%20tetapi%20pesanan%20kedaluwarsa"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-[#25D366] text-[#0C251B] font-black text-xs rounded-full shadow-md"
          >
            Hubungi WhatsApp Admin (0811-8281-220)
          </a>
        </div>
      )}

      {/* Verified Success Box */}
      {isVerified && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 sm:p-8 mb-6 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-[#8BC137] text-[#183F2E] flex items-center justify-center mx-auto mb-3 shadow-md">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-[#183F2E]">Pembayaran Diterima</h2>
          <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
            Pesanan Anda telah diterima oleh kitchen dan sedang disiapkan dengan higienis dan buah tersegar!
          </p>
          <div className="mt-5">
            <button
              onClick={() => router.push(`/track/${orderNumber}?token=${orderData.tracking_token}`)}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black text-sm shadow-md transition"
            >
              Lacak Status Pesanan <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Bank & Total Amount Details */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-black text-[#183F2E] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#8BC137]" /> Rekening Pembayaran Resmi
            </h3>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Bank Transfer
            </span>
          </div>

          {/* Amount to Transfer */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Total Yang Harus Ditransfer</p>
              <p className="text-xl font-black text-[#183F2E] mt-0.5 font-mono">
                Rp {orderData.total.toLocaleString('id-ID')}
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(String(orderData.total), 'amount')}
              className="px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              {copiedAmount ? <Check className="w-3.5 h-3.5 text-[#8BC137]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAmount ? 'Tersalin' : 'Salin'}</span>
            </button>
          </div>

          {/* Bank Account Details */}
          <div className="space-y-3 text-xs">
            <div>
              <p className="text-slate-500 font-medium">Nama Bank</p>
              <p className="text-sm font-bold text-[#183F2E] mt-0.5">{paymentData?.bank_name || 'BCA (Bank Central Asia)'}</p>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <p className="text-slate-500 text-[11px] font-medium">Nomor Rekening</p>
                <p className="text-base font-mono font-bold text-[#183F2E] mt-0.5 tracking-wider">
                  {paymentData?.account_number || '883-098-1220'}
                </p>
              </div>
              <button
                onClick={() =>
                  copyToClipboard(paymentData?.account_number || '883-098-1220', 'bank')
                }
                className="px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition flex items-center gap-1.5 text-xs font-bold shadow-sm"
              >
                {copiedBank ? <Check className="w-3.5 h-3.5 text-[#8BC137]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBank ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Nama Pemilik Rekening</p>
              <p className="text-sm font-bold text-[#183F2E] mt-0.5">
                {paymentData?.account_holder || 'ASINAN MEREM MELEK PT'}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
            ⚠️ <strong>Perhatian:</strong> Pastikan nama penerima tertera sesuai di atas sebelum menyelesaikan
            transfer di m-banking atau ATM Anda.
          </div>
        </div>

        {/* Payment QR & Verification Status */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-black text-[#183F2E] flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#8BC137]" /> QR Pembayaran Resmi
              </h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Scan QR
              </span>
            </div>

            {/* QR Mockup Box */}
            <div className="w-48 h-48 mx-auto bg-white rounded-3xl p-3 flex flex-col items-center justify-center shadow-sm relative border-2 border-[#8BC137]">
              <div className="w-full h-full border-2 border-dashed border-[#183F2E]/20 rounded-2xl flex flex-col items-center justify-center p-2 text-center">
                <QrCode className="w-20 h-20 text-[#183F2E]" />
                <span className="text-[9px] font-black text-[#183F2E] mt-1 uppercase tracking-wider">
                  Asinan Merem Melek
                </span>
                <span className="text-[8px] text-slate-400 font-mono">BCA Transfer QR</span>
              </div>
            </div>
            <p className="text-[10px] text-center text-slate-400 mt-2">
              Scan melalui BCA Mobile / QRIS atau transfer manual ke rekening di samping.
            </p>
          </div>

          {/* Current Status Pill */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Status Verifikasi:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                isVerified
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : isUnderReview
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                  : isRejected
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {isVerified
                ? 'Terverifikasi'
                : isUnderReview
                ? 'Sedang Diverifikasi Kasir'
                : isRejected
                ? 'Bukti Ditolak'
                : 'Menunggu Pembayaran'}
            </span>
          </div>
        </div>
      </div>

      {/* Proof Upload Form (If not yet verified) */}
      {!isVerified && !isExpired && (
        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
            <div>
              <h3 className="text-base font-black text-[#183F2E] flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#8BC137]" /> Unggah Bukti Transfer
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kirim tangkapan layar (screenshot) bukti transfer m-banking atau resi ATM Anda.
              </p>
            </div>
            {isUnderReview && (
              <span className="text-xs text-amber-800 flex items-center gap-1 font-bold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menunggu Admin
              </span>
            )}
          </div>

          {isRejected && paymentData?.rejection_reason && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              <strong>Alasan Penolakan:</strong> {paymentData.rejection_reason}
              <p className="mt-1 text-slate-700">Silakan unggah kembali bukti transfer yang valid di bawah ini.</p>
            </div>
          )}

          <form onSubmit={handleUploadProof} className="space-y-4">
            {/* File Input Box */}
            <div className="border-2 border-dashed border-slate-300 hover:border-[#8BC137] rounded-3xl p-6 text-center transition cursor-pointer relative bg-slate-50/50">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {previewUrl ? (
                <div className="space-y-2">
                  <img
                    src={previewUrl}
                    alt="Preview Bukti"
                    className="max-h-48 mx-auto rounded-xl object-contain shadow-sm"
                  />
                  <p className="text-xs text-emerald-700 font-bold">{file?.name}</p>
                  <p className="text-[10px] text-slate-400">Klik untuk mengganti gambar</p>
                </div>
              ) : (
                <div className="space-y-2 py-4">
                  <div className="w-12 h-12 rounded-full bg-white border border-slate-200 text-[#8BC137] flex items-center justify-center mx-auto shadow-sm">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-[#183F2E]">Klik atau Tarik Foto Bukti Transfer ke Sini</p>
                  <p className="text-xs text-slate-400">Format: JPG, PNG, atau WebP (Maksimal 5MB)</p>
                </div>
              )}
            </div>

            {/* Optional Reference Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Referensi Transaksi (Opsional)
              </label>
              <input
                type="text"
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                placeholder="Contoh: 20261022143009"
                className="w-full text-xs rounded-2xl px-3.5 py-3 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#183F2E] transition"
              />
            </div>

            {uploadError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold">
                Bukti transfer berhasil diunggah! Mohon tunggu konfirmasi admin AMM.
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !file}
              className={`w-full py-4 rounded-full font-black text-sm flex items-center justify-center gap-2 shadow-md transition ${
                file && !uploading
                  ? 'bg-[#8BC137] text-[#183F2E] hover:bg-[#7ab02d] cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Mengunggah Bukti...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Kirim Bukti Transfer
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* WhatsApp Handoff Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-slate-500 mb-2">Butuh bantuan konfirmasi cepat dengan admin?</p>
        <a
          href={`https://wa.me/628118281220?text=Halo%20Admin%20AMM%2C%20saya%20sudah%20transfer%20untuk%20pesanan%20${orderNumber}%20sebesar%20Rp%20${orderData.total.toLocaleString(
            'id-ID'
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#25D366] text-[#0C251B] font-black text-xs hover:bg-[#20ba5a] shadow-md transition"
        >
          Konfirmasi via WhatsApp Resmi AMM
        </a>
      </div>
    </div>
  )
}
