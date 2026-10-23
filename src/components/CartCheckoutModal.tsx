"use client";

import React, { useState } from 'react'
import { X, Trash2, Plus, Minus, MapPin, Phone, User, ShoppingBag, ArrowRight, MessageSquare, ShieldCheck } from 'lucide-react'
import { Branch, CartItem, Order } from '../types'

interface CartCheckoutModalProps {
  branches: Branch[]
  selectedBranchId: string
  onSelectBranch: (id: string) => void
  cart: CartItem[]
  cartSubtotal: number
  onUpdateQty: (id: string, qty: number) => void
  onRemoveItem: (id: string) => void
  onClose: () => void
  onCreateOrder: (
    name: string,
    phone: string,
    deliveryType: 'pickup' | 'delivery',
    address: string,
    district: string,
    city: string,
    zipcode: string,
    notes: string
  ) => Promise<Order>
  onOpenPaymentModal: (order: Order) => void
  isPage?: boolean
}

export const CartCheckoutModal: React.FC<CartCheckoutModalProps> = ({
  branches,
  selectedBranchId,
  onSelectBranch,
  cart,
  cartSubtotal,
  onUpdateQty,
  onRemoveItem,
  onClose,
  onCreateOrder,
  onOpenPaymentModal,
  isPage,
}) => {
  const currentBranch = branches.find((b) => b.id === selectedBranchId) || branches[0]

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [district, setDistrict] = useState('')
  const [city, setCity] = useState('')
  const [zipcode, setZipcode] = useState('')
  const [notes, setNotes] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const deliveryFee = 15000 // Delivery only
  const grandTotal = cartSubtotal + deliveryFee

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!customerName.trim()) {
      setErrorMessage('Mohon isi nama lengkap Anda.')
      return
    }
    if (!customerPhone.trim() || customerPhone.length < 8) {
      setErrorMessage('Mohon masukkan nomor WhatsApp yang valid.')
      return
    }
    if (!deliveryAddress.trim() || !district.trim() || !city.trim()) {
      setErrorMessage('Mohon lengkapi alamat pengiriman, kecamatan, dan kota.')
      return
    }

    setErrorMessage('')
    setIsSubmitting(true)

    try {
      // 1. Create order with backend delegation (WA and validation handled there)
      const createdOrder = await onCreateOrder(
        customerName.trim(),
        customerPhone.trim(),
        'delivery', // Always delivery
        deliveryAddress.trim(),
        district.trim(),
        city.trim(),
        zipcode.trim(),
        notes.trim()
      )

      // 4. Open Payment Modal
      onClose()
      onOpenPaymentModal(createdOrder)
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Terjadi kesalahan saat memproses pesanan.')
    } finally {
      setIsSubmitting(false)
    }
  }


  const content = (
    <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl shadow-red-950 overflow-hidden text-slate-100 my-4 max-h-[90vh] flex flex-col">
      
      {/* Modal Header */}
      <div className="p-5 border-b border-amber-500/20 bg-gradient-to-r from-brand-dark via-slate-900 to-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-crimson/30 border border-brand-bright/40 flex items-center justify-center text-amber-300">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-lg sm:text-xl text-white">
              Keranjang & Checkout
            </h3>
            <p className="text-xs text-amber-400">
              Outlet Cabang: <strong>{currentBranch.name}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Modal Content Body */}
      {cart.length === 0 ? (
        <div className="p-12 text-center space-y-4">
          <ShoppingBag className="w-16 h-16 text-slate-600 mx-auto" />
          <p className="text-slate-400 text-sm">Keranjang belanja Anda masih kosong.</p>
          <button
            onClick={onClose}
            className="bg-brand-red hover:bg-brand-bright text-white font-bold px-6 py-2.5 rounded-xl text-xs"
          >
            Pilih Menu Sekarang
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmitCheckout} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ITEMS LIST */}
          <div className="space-y-3">
            <div className="text-xs font-extrabold uppercase text-amber-300 tracking-wider">
              Item Pesanan ({cart.length})
            </div>

            <div className="space-y-2.5">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img
                      src={item.menuItem.image_url || '/images/kiamboy.jpg'}
                      alt={item.menuItem.name}
                      className="w-14 h-14 rounded-xl object-cover border border-amber-500/20 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">
                        {item.menuItem.name}
                      </div>
                      {item.selectedBumbu && (
                        <div className="text-[10px] text-amber-400 font-medium">
                          {item.selectedBumbu.name}
                        </div>
                      )}
                      {item.notes && (
                        <div className="text-[10px] text-slate-400 italic">
                          Catatan: "{item.notes}"
                        </div>
                      )}
                      <div className="text-xs font-semibold text-slate-300 mt-1">
                        Rp {item.unitPrice.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>

                  {/* Qty Stepper & Remove */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, item.qty - 1)}
                        className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, item.qty + 1)}
                        className="w-6 h-6 rounded-lg bg-amber-400 text-brand-dark hover:bg-amber-300 font-bold flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CUSTOMER INFORMATION FORM */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="text-xs font-extrabold uppercase text-amber-300 tracking-wider">
              Informasi Pemesan
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-medium flex items-center gap-1 mb-1">
                  <User className="w-3.5 h-3.5 text-amber-400" /> Nama Lengkap <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Dei Permana"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium flex items-center gap-1 mb-1">
                  <Phone className="w-3.5 h-3.5 text-amber-400" /> No. WhatsApp <span className="text-rose-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* DELIVERY ADDRESS FIELDS */}
            <div>
              <label className="text-xs text-slate-300 font-medium flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400" /> Alamat Pengiriman Lengkap <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Masukkan jalan, nomor rumah, RT/RW, patokan..."
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              <div className="col-span-1 sm:col-span-1">
                <label className="text-xs text-slate-300 font-medium mb-1 block">Kecamatan <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Contoh: Cipondoh"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="col-span-1 sm:col-span-1">
                <label className="text-xs text-slate-300 font-medium mb-1 block">Kota <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Contoh: Tangerang"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-slate-300 font-medium mb-1 block">Kode Pos</label>
                <input
                  type="text"
                  value={zipcode}
                  onChange={(e) => setZipcode(e.target.value)}
                  placeholder="Opsional"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs text-slate-300 font-medium mb-1 block">Catatan Pesanan</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opsional (contoh: cabai dipisah)"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* ERROR ALERT */}
          {errorMessage && (
            <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 p-3 rounded-xl text-xs">
              {errorMessage}
            </div>
          )}

          {/* ORDER SUMMARY */}
          <div className="pt-4 border-t border-slate-800 space-y-2 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Subtotal Menu</span>
              <span>Rp {cartSubtotal.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Ongkos Kirim (Kurir Outlet)</span>
              <span>Rp {deliveryFee.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-amber-400 pt-2 border-t border-slate-800">
              <span>Total Bayar</span>
              <span>Rp {grandTotal.toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* CHECKOUT SUBMIT BUTTON */}
          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-brand-crimson via-brand-bright to-brand-crimson hover:from-brand-bright hover:to-brand-crimson disabled:opacity-50 text-white font-extrabold py-4 rounded-2xl shadow-xl shadow-red-950/80 border border-amber-400/40 text-sm flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98"
            >
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>{isSubmitting ? 'Memproses...' : 'Lanjutkan ke Pembayaran'}</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
            <p className="text-[10px] text-slate-400 text-center">
              Pembayaran via Transfer Bank.
            </p>
          </div>

        </form>
      )}

    </div>
  )

  if (isPage) return content

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      {content}
    </div>
  )
}
