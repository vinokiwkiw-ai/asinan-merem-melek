'use client'

import React, { useState, useEffect, useId } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useStore'
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  MapPin,
  Truck,
  Store,
  Tag,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { MangoMascot } from '@/components/mascot/MangoMascot'
import { GiftSection, GiftConfig } from '@/components/checkout/GiftSection'

export default function CartPage() {
  const router = useRouter()
  const {
    cart = [],
    updateCartQty,
    removeFromCart,
    clearCart,
    selectedBranchId = 'greenlake',
    setSelectedBranchId,
  } = useAppStore() || {}

  // Customer contact details
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  // Delivery options (online delivery only, pickup disabled)
  const deliveryType = 'delivery'
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryInstructions, setDeliveryInstructions] = useState('')

  // Live item availability check
  const [unavailableItemIds, setUnavailableItemIds] = useState<Set<string>>(new Set())
  const [availabilityWarning, setAvailabilityWarning] = useState<string | null>(null)

  // Shipping quotes
  const [quotes, setQuotes] = useState<any[]>([])
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('')
  const [loadingQuotes, setLoadingQuotes] = useState<boolean>(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)

  // Voucher
  const [voucherCodeInput, setVoucherCodeInput] = useState('')
  const [appliedVoucher, setAppliedVoucher] = useState<string | null>(null)
  const [voucherDiscount, setVoucherDiscount] = useState<number>(0)
  const [voucherError, setVoucherError] = useState<string | null>(null)

  // Gifting
  const [giftConfig, setGiftConfig] = useState<GiftConfig>({
    isGift: false,
    recipientName: '',
    recipientPhone: '',
    recipientAddress: '',
    senderName: '',
    isSenderVisible: true,
    hasGreetingCard: false,
    cardDesign: 'merem_melek_special',
    cardMessage: '',
    hasGiftPackaging: false,
  })

  // Branch statuses
  const [branchStatuses, setBranchStatuses] = useState<Record<string, any>>({})
  const [submittingOrder, setSubmittingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  // Stable session idempotency key
  const [idempotencyKey, setIdempotencyKey] = useState('')
  useEffect(() => {
    setIdempotencyKey(`amm_idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`)
  }, [])

  // Fetch outlet statuses
  useEffect(() => {
    fetch('/api/outlets/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.branches) {
          const map: Record<string, any> = {}
          data.branches.forEach((b: any) => {
            map[b.branchId] = b
          })
          setBranchStatuses(map)
        }
      })
      .catch(console.error)
  }, [])

  // Check live product availability for items in cart
  useEffect(() => {
    if (!cart || cart.length === 0) {
      setUnavailableItemIds(new Set())
      setAvailabilityWarning(null)
      return
    }

    const ids = Array.from(new Set(cart.map((c: any) => c.menuItem?.id))).filter(Boolean)
    if (ids.length === 0) return

    fetch(`/api/products?ids=${ids.join(',')}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.products) {
          const unavailable = new Set<string>()
          const names: string[] = []
          data.products.forEach((p: any) => {
            const status = p.availability_status || (p.is_available ? 'AVAILABLE' : 'OUT_OF_STOCK')
            if (status !== 'AVAILABLE') {
              unavailable.add(p.id)
              names.push(p.name)
            }
          })
          setUnavailableItemIds(unavailable)
          if (unavailable.size > 0) {
            setAvailabilityWarning(
              `Perhatian: Produk "${names.join(', ')}" saat ini sedang tidak tersedia (Habis / Tidak Tersedia Sementara). Silakan hapus item tersebut dari keranjang untuk melanjutkan.`
            )
          } else {
            setAvailabilityWarning(null)
          }
        }
      })
      .catch(console.error)
  }, [cart])

  // Request shipping quotes when address is filled (min 8 chars)
  const fetchDeliveryQuotes = async () => {
    if (deliveryType !== 'delivery' || deliveryAddress.trim().length < 8) return

    setLoadingQuotes(true)
    setQuoteError(null)

    try {
      const res = await fetch('/api/delivery/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: selectedBranchId,
          destinationAddress: deliveryAddress.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memuat kutipan ongkir.')

      setQuotes(data.quotes || [])
      if (data.quotes && data.quotes.length > 0) {
        setSelectedQuoteId(data.quotes[0].quoteId)
      }
    } catch (err: any) {
      setQuoteError(err.message)
    } finally {
      setLoadingQuotes(false)
    }
  }

  // Calculate items subtotal
  const itemsSubtotal = cart.reduce((acc, it) => acc + (it.totalPrice || it.unitPrice * it.qty), 0)

  // Selected delivery fee
  const selectedQuote = quotes.find((q) => q.quoteId === selectedQuoteId)
  const deliveryFee = deliveryType === 'delivery' ? selectedQuote?.quotedAmount || 0 : 0

  // Gift fees
  const giftPackagingFee = giftConfig.hasGiftPackaging ? 15000 : 0
  const greetingCardFee = giftConfig.hasGreetingCard ? 5000 : 0

  // Final Total
  const finalTotal = Math.max(0, itemsSubtotal - voucherDiscount + giftPackagingFee + greetingCardFee + deliveryFee)

  // Apply Voucher
  const handleApplyVoucher = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!voucherCodeInput.trim()) return

    setVoucherError(null)
    try {
      const quoteItems = cart.map((c) => ({
        productId: c.menuItem.id,
        size: 'STANDARD',
        qty: c.qty,
        seasoningSelections: c.selectedBumbu ? [{ seasoningId: c.selectedBumbu.id, qty: 1 }] : [],
      }))

      const res = await fetch('/api/cart/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: quoteItems,
          voucherCode: voucherCodeInput.trim().toUpperCase(),
          hasGiftPackaging: giftConfig.hasGiftPackaging,
          hasGreetingCard: giftConfig.hasGreetingCard,
          deliveryFee,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.voucherError) {
        setVoucherError(data.voucherError || data.error || 'Kode voucher tidak valid.')
        setAppliedVoucher(null)
        setVoucherDiscount(0)
      } else {
        setAppliedVoucher(data.voucherCode)
        setVoucherDiscount(data.voucherDiscount)
      }
    } catch (err: any) {
      setVoucherError('Gagal memeriksa voucher.')
    }
  }

  // Handle Checkout Order Submission
  const handlePlaceOrder = async () => {
    setOrderError(null)

    if (cart.length === 0) {
      setOrderError('Keranjang Anda masih kosong.')
      return
    }

    if (!customerName || customerName.trim().length < 2) {
      setOrderError('Silakan lengkapi nama pemesan.')
      return
    }

    if (!customerPhone || customerPhone.replace(/\D/g, '').length < 9) {
      setOrderError('Nomor WhatsApp pemesan tidak valid.')
      return
    }

    if (unavailableItemIds.size > 0) {
      setOrderError('Beberapa produk dalam keranjang belanja sedang habis atau tidak tersedia. Harap hapus produk tersebut untuk melanjutkan.')
      return
    }

    if (currentBranchStatus && !currentBranchStatus.isOpen) {
      setOrderError(`Outlet ${currentBranchStatus.branchName} saat ini sedang tutup (${currentBranchStatus.nextOpenTime || currentBranchStatus.reason || 'Buka kembali saat jam operasional'}). Pesanan baru belum dapat diproses saat outlet tutup.`)
      return
    }

    if (!deliveryAddress || deliveryAddress.trim().length < 8) {
      setOrderError('Silakan lengkapi alamat pengiriman Anda.')
      return
    }
    if (!selectedQuoteId) {
      setOrderError('Silakan pilih opsi kurir pengiriman.')
      return
    }

    setSubmittingOrder(true)

    try {
      const orderItems = cart.map((c) => ({
        productId: c.menuItem.id,
        size: 'STANDARD',
        qty: c.qty,
        seasoningSelections: c.selectedBumbu ? [{ seasoningId: c.selectedBumbu.id, qty: 1 }] : [],
      }))

      const payload = {
        idempotencyKey,
        branchId: selectedBranchId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryType,
        deliveryAddress: deliveryType === 'delivery' ? deliveryAddress.trim() : null,
        deliveryInstructions: deliveryInstructions?.trim() || null,
        quoteId: deliveryType === 'delivery' ? selectedQuoteId : null,
        items: orderItems,
        voucherCode: appliedVoucher,
        isGift: giftConfig.isGift,
        recipientName: giftConfig.recipientName,
        recipientPhone: giftConfig.recipientPhone,
        recipientAddress: giftConfig.recipientAddress,
        senderName: giftConfig.senderName,
        isSenderVisible: giftConfig.isSenderVisible,
        cardDesign: giftConfig.cardDesign,
        cardMessage: giftConfig.cardMessage,
        hasGiftPackaging: giftConfig.hasGiftPackaging,
        hasGreetingCard: giftConfig.hasGreetingCard,
      }

      const res = await fetch('/api/checkout/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat pesanan.')
      }

      // Order created successfully! Clear cart & redirect to dedicated payment page
      clearCart()
      router.push(`/payment/${data.orderNumber}?token=${data.trackingToken}`)
    } catch (err: any) {
      setOrderError(err.message)
      setSubmittingOrder(false)
    }
  }

  // If cart is empty
  if (cart.length === 0) {
    return (
      <div className="min-h-screen py-16 px-4 flex flex-col items-center justify-center text-center">
        <MangoMascot state="empty_cart" size="lg" showSpeechBubble />
        <h2 className="text-2xl font-black text-[#183F2E] mt-6">Keranjang Belanja Masih Kosong</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">
          Yuk jelajahi menu asinan kiamboy segar dan aneka rujak buah dengan bumbu khas Asinan Merem Melek!
        </p>
        <button
          onClick={() => router.push('/menu')}
          className="mt-6 px-7 py-3.5 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black text-sm shadow-md transition inline-flex items-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" /> Lihat Menu Sekarang
        </button>
      </div>
    )
  }

  const currentBranchStatus = branchStatuses[selectedBranchId]

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#183F2E] flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-[#8BC137]" /> Keranjang & Checkout
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pemesanan langsung resmi Asinan Merem Melek (Transfer Bank • 12 Menit)
          </p>
        </div>
        <button
          onClick={() => clearCart()}
          className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 font-bold transition"
        >
          <Trash2 className="w-3.5 h-3.5" /> Kosongkan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Items & Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Branch Picker & Live Status */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 sm:p-6">
            <label className="text-xs font-bold text-amber-800 uppercase tracking-wider block mb-3">
              Pilih Cabang Outlet AMM
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'greenlake', name: 'Greenlake City', loc: 'Tangerang' },
                { id: 'kelapagading', name: 'Kelapa Gading', loc: 'Jakarta Utara' },
              ].map((b) => {
                const st = branchStatuses[b.id]
                const isSelected = selectedBranchId === b.id
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBranchId(b.id)}
                    className={`p-3.5 rounded-2xl border text-left transition ${
                      isSelected
                        ? 'bg-emerald-50 border-[#8BC137] shadow-sm'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#183F2E]">{b.name}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          st?.isOpen ? 'bg-[#8BC137]' : 'bg-[#FF5954]'
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{b.loc}</p>
                    <p
                      className={`text-[10px] font-bold mt-1.5 ${
                        st?.isOpen ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {st ? (st.isOpen ? `Buka (${st.todaySchedule})` : 'Sedang Tutup') : 'Memeriksa status...'}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cart Items List */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-black text-[#183F2E] pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>Item Menu ({cart.length} produk)</span>
              <span className="text-xs font-mono font-bold text-emerald-700">
                Rp {itemsSubtotal.toLocaleString('id-ID')}
              </span>
            </h3>

            {/* Availability Warning Banner */}
            {availabilityWarning && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                <span className="leading-relaxed">{availabilityWarning}</span>
              </div>
            )}

            <div className="space-y-3">
              {cart.map((item) => {
                const isUnavailable = unavailableItemIds.has(item.menuItem?.id)
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border flex items-center gap-3.5 transition-all ${
                      isUnavailable ? 'border-rose-200 bg-rose-50' : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <img
                      src={
                        item.menuItem.photoKey
                          ? `/menu-photos/${item.menuItem.photoKey}.webp`
                          : '/menu-photos/rujak-buah-personal.webp'
                      }
                      alt={item.menuItem.name}
                      className="w-16 h-16 rounded-xl object-cover bg-slate-200 flex-shrink-0 shadow-sm"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#183F2E] truncate">{item.menuItem.name}</h4>
                        {isUnavailable && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF5954] text-white flex-shrink-0">
                            Habis
                          </span>
                        )}
                      </div>
                      {item.selectedBumbu && (
                        <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                          Bumbu: {item.selectedBumbu.name}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[11px] text-amber-700 truncate mt-0.5">Catatan: {item.notes}</p>
                      )}
                      <p className="text-xs font-mono font-bold text-slate-700 mt-1">
                        Rp {item.unitPrice.toLocaleString('id-ID')}
                      </p>
                    </div>

                    {/* Quantity & Remove */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1.5 bg-white p-1 rounded-full border border-slate-200 shadow-sm">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, item.qty - 1)}
                          className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 transition"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-[#183F2E]">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, item.qty + 1)}
                          className="w-6 h-6 rounded-full bg-[#8BC137] text-[#183F2E] flex items-center justify-center hover:bg-[#7ab02d] transition"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="p-1.5 text-slate-400 hover:text-[#FF5954] transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-black text-[#183F2E] pb-3 border-b border-slate-100">
              Informasi Pemesan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama pemesan"
                  className="w-full rounded-2xl px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#183F2E] focus:ring-2 focus:ring-[#8BC137]/20 transition"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">No. WhatsApp Aktif *</label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full rounded-2xl px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#183F2E] focus:ring-2 focus:ring-[#8BC137]/20 transition"
                />
              </div>
            </div>
          </div>

          {/* Delivery Method & Quotation */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-black text-[#183F2E] pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>Metode Pengiriman</span>
              <span className="text-[11px] text-emerald-700 font-bold">Terkoneksi API Kurir</span>
            </h3>

            {/* Online Delivery Dedicated Banner (Store pickup removed) */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white text-emerald-700 shadow-sm flex-shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-[#183F2E] block">Pengiriman Kurir Online</span>
                <span className="text-[11px] text-slate-600">
                  Pesanan diantar langsung ke alamat Anda via GoSend, GrabExpress, atau Kurir Toko AMM.
                </span>
              </div>
            </div>

            {/* Delivery Address & Quotes */}
            {deliveryType === 'delivery' && (
              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Alamat Lengkap Pengiriman *
                  </label>
                  <textarea
                    rows={2}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    onBlur={fetchDeliveryQuotes}
                    placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, patokan lokasi..."
                    className="w-full rounded-2xl px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#183F2E] focus:ring-2 focus:ring-[#8BC137]/20 transition"
                  />
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-[10px] text-slate-400">
                      *Klik di luar kolom atau tombol cek untuk kalkulasi tarif ongkir
                    </span>
                    <button
                      type="button"
                      onClick={fetchDeliveryQuotes}
                      className="text-[11px] font-bold text-emerald-700 hover:underline"
                    >
                      Cek Tarif Ongkir
                    </button>
                  </div>
                </div>

                {loadingQuotes && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-2 text-slate-600">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#8BC137]" />
                    <span>Menghitung ongkos kirim resmi kurir...</span>
                  </div>
                )}

                {quoteError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                    {quoteError}
                  </div>
                )}

                {/* Quotes Radio Options */}
                {quotes.length > 0 && !loadingQuotes && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-amber-800 block">
                      Pilih Layanan Kurir:
                    </span>
                    {quotes.map((q) => {
                      const isSel = selectedQuoteId === q.quoteId
                      return (
                        <button
                          key={q.quoteId}
                          type="button"
                          onClick={() => setSelectedQuoteId(q.quoteId)}
                          className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition ${
                            isSel
                              ? 'bg-emerald-50 border-[#8BC137] text-[#183F2E] shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-xs text-[#183F2E] block">
                              {q.providerLabel}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Estimasi: {q.estimatedDuration} {q.isManualEstimate && '(Estimasi Outlet)'}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-sm text-emerald-800">
                            Rp {q.quotedAmount.toLocaleString('id-ID')}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Catatan untuk Kurir (Opsional)
                  </label>
                  <input
                    type="text"
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    placeholder="Contoh: Titip ke sekuriti lobi / rumah pagar hitam"
                    className="w-full rounded-2xl px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#183F2E] focus:ring-2 focus:ring-[#8BC137]/20 transition"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Gift Merem Melek Section */}
          <GiftSection giftConfig={giftConfig} onChange={setGiftConfig} />
        </div>

        {/* Right Column: Pricing Summary & Bank Transfer CTA */}
        <div className="lg:col-span-5 space-y-6">
          {/* Voucher Box */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 sm:p-6 space-y-3">
            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Voucher Diskon
            </h3>
            <form onSubmit={handleApplyVoucher} className="flex gap-2">
              <input
                type="text"
                value={voucherCodeInput}
                onChange={(e) => setVoucherCodeInput(e.target.value)}
                placeholder="Kode Promo (e.g. MEREMMELEK10)"
                className="flex-1 text-xs rounded-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 uppercase outline-none focus:bg-white focus:border-[#183F2E] focus:ring-2 focus:ring-[#8BC137]/20 transition"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black text-xs rounded-full shadow-sm transition"
              >
                Gunakan
              </button>
            </form>

            {appliedVoucher && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                <span>Voucher &ldquo;{appliedVoucher}&rdquo; diterapkan!</span>
                <span className="font-bold">-Rp {voucherDiscount.toLocaleString('id-ID')}</span>
              </div>
            )}

            {voucherError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {voucherError}
              </div>
            )}
          </div>

          {/* Order Summary & Final Total */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-black text-[#183F2E] pb-3 border-b border-slate-100">
              Ringkasan Pembayaran
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Menu</span>
                <span className="font-mono text-slate-800">Rp {itemsSubtotal.toLocaleString('id-ID')}</span>
              </div>

              {voucherDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Diskon Promo</span>
                  <span className="font-mono font-bold">-Rp {voucherDiscount.toLocaleString('id-ID')}</span>
                </div>
              )}

              {giftPackagingFee > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Packaging Hadiah Eksklusif</span>
                  <span className="font-mono text-slate-800">
                    +Rp {giftPackagingFee.toLocaleString('id-ID')}
                  </span>
                </div>
              )}

              {greetingCardFee > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Kartu Ucapan Kustom</span>
                  <span className="font-mono text-slate-800">
                    +Rp {greetingCardFee.toLocaleString('id-ID')}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Ongkos Kirim (Kurir Online)</span>
                <span className="font-mono text-slate-800">
                  {deliveryFee > 0 ? `Rp ${deliveryFee.toLocaleString('id-ID')}` : 'Rp 0'}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-sm">
                <span className="font-black text-[#183F2E]">Total Tagihan:</span>
                <span className="text-2xl font-black font-mono text-[#183F2E]">
                  Rp {finalTotal.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Error banner */}
            {orderError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{orderError}</span>
              </div>
            )}

            {/* Bank Transfer Notice Box */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1 text-xs text-amber-900">
              <div className="flex items-center gap-1.5 font-bold">
                <Clock className="w-4 h-4 text-amber-700" /> Pembayaran Transfer Bank (12 Menit)
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Setelah klik tombol di bawah, Anda akan diarahkan ke halaman transfer bank resmi dengan
                countdown 12 menit dan upload bukti transfer.
              </p>
            </div>

            {/* Submit Checkout Button */}
            <button
              type="button"
              disabled={submittingOrder || unavailableItemIds.size > 0 || Boolean(currentBranchStatus && !currentBranchStatus.isOpen)}
              onClick={handlePlaceOrder}
              className={`w-full py-4 rounded-full font-black text-sm flex items-center justify-center gap-2 shadow-md transition ${
                submittingOrder || unavailableItemIds.size > 0 || (currentBranchStatus && !currentBranchStatus.isOpen)
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] cursor-pointer'
              }`}
            >
              {submittingOrder ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memproses Pesanan...</span>
                </>
              ) : unavailableItemIds.size > 0 ? (
                <span>Hapus Produk Habis Terlebih Dahulu</span>
              ) : currentBranchStatus && !currentBranchStatus.isOpen ? (
                <span>Outlet Sedang Tutup ({currentBranchStatus.nextOpenTime || 'Tutup Sementara'})</span>
              ) : (
                <>
                  Lanjut ke Pembayaran <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#8BC137]" />
              <span>Transaksi Aman • Verifikasi Kasir Resmi AMM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
