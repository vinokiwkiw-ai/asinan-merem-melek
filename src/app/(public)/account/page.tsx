'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Star,
  MapPin,
  ShoppingBag,
  LogOut,
  Gift,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { MangoMascot } from '@/components/mascot/MangoMascot'

export default function AccountPage() {
  const router = useRouter()
  const [customer, setCustomer] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'points' | 'orders' | 'addresses'>('points')

  // Membership & Rewards state
  const [membership, setMembership] = useState<any>(null)
  const [rewards, setRewards] = useState<any[]>([])
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null)

  // Orders state
  const [orders, setOrders] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('semua')
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('')

  // Addresses state
  const [addresses, setAddresses] = useState<any[]>([])
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [newLabel, setNewLabel] = useState('Rumah')
  const [newRecipient, setNewRecipient] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [savingAddress, setSavingAddress] = useState(false)

  useEffect(() => {
    // Check verified server session first
    const initSession = async () => {
      let localToken: string | null = null
      let localCustomer: any = null

      try {
        const cached = localStorage.getItem('amm_customer_session')
        localToken = localStorage.getItem('amm_customer_token')
        if (cached) {
          localCustomer = JSON.parse(cached)
          setCustomer(localCustomer)
          loadMembership(localCustomer.id)
          loadAddresses(localCustomer.id)
          loadOrders(localCustomer.phone)
        }
      } catch (e) {
        console.warn('Failed to parse cached session:', e)
      }

      try {
        const headers: Record<string, string> = {}
        if (localToken) {
          headers['Authorization'] = `Bearer ${localToken}`
        }

        const res = await fetch('/api/auth/customer', {
          headers,
          credentials: 'include',
        })
        const data = await res.json()
        if (data.authenticated && data.customer) {
          setCustomer(data.customer)
          localStorage.setItem('amm_customer_session', JSON.stringify(data.customer))
          if (data.sessionToken) {
            localStorage.setItem('amm_customer_token', data.sessionToken)
          }
          loadMembership(data.customer.id)
          loadAddresses(data.customer.id)
          loadOrders(data.customer.phone)
          return
        }
      } catch (err) {
        console.error('Session check error:', err)
        // If server check fails temporarily (network issue), but local session exists, stay logged in
        if (localCustomer) return
      }

      // If truly unauthenticated, clear stale cache and redirect
      if (!localCustomer) {
        localStorage.removeItem('amm_customer_session')
        localStorage.removeItem('amm_customer_token')
        router.push('/login?redirect=/account')
      }
    }

    initSession()
  }, [router])

  const loadMembership = async (customerId: string) => {
    try {
      const res = await fetch(`/api/membership?customerId=${customerId}`)
      const data = await res.json()
      if (data.summary) {
        setMembership(data.summary)
        setRewards(data.rewards || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const loadAddresses = async (customerId: string) => {
    try {
      const res = await fetch(`/api/customer/addresses?customerId=${customerId}`)
      const data = await res.json()
      if (data.addresses) setAddresses(data.addresses)
    } catch (err) {
      console.error(err)
    }
  }

  const loadOrders = async (phone: string, status = 'semua', search = '') => {
    setLoadingOrders(true)
    try {
      const queryParams = new URLSearchParams()
      if (phone) queryParams.set('phone', phone)
      if (customer?.id) queryParams.set('customerId', customer.id)
      if (status && status !== 'semua') queryParams.set('status', status)
      if (search) queryParams.set('search', search)

      const res = await fetch(`/api/customer/orders?${queryParams.toString()}`)
      const data = await res.json()
      if (data.orders) setOrders(data.orders)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleRedeem = async (rewardId: string) => {
    if (!customer) return
    setRedeeming(rewardId)
    setRedeemSuccess(null)
    try {
      const res = await fetch('/api/membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REDEEM',
          customerId: customer.id,
          rewardId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menukarkan reward.')

      setRedeemSuccess(`Berhasil! Kode Voucher Anda: ${data.discountCode}`)
      loadMembership(customer.id)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setRedeeming(null)
    }
  }

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer || !newRecipient || !newPhone || !newAddress) return

    setSavingAddress(true)
    try {
      const res = await fetch('/api/customer/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          label: newLabel,
          recipientName: newRecipient,
          phone: newPhone,
          fullAddress: newAddress,
          isDefault: addresses.length === 0,
        }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan alamat.')

      setShowAddAddress(false)
      setNewAddress('')
      setNewRecipient('')
      setNewPhone('')
      loadAddresses(customer.id)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSavingAddress(false)
    }
  }

  const handleDeleteAddress = async (id: string) => {
    if (!customer) return
    try {
      await fetch(`/api/customer/addresses?id=${id}&customerId=${customer.id}`, { method: 'DELETE' })
      loadAddresses(customer.id)
    } catch (err) {
      console.error(err)
    }
  }

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('amm_customer_token')
      await fetch('/api/auth/customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'LOGOUT' }),
      })
    } catch {}
    localStorage.removeItem('amm_customer_session')
    localStorage.removeItem('amm_customer_token')
    router.push('/login')
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 max-w-4xl mx-auto">
      {/* Header Profile */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-16 h-16 rounded-full bg-[#8BC137] text-[#183F2E] font-black text-2xl flex items-center justify-center shadow-md flex-shrink-0">
            {customer?.name?.charAt(0) || 'A'}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#183F2E]">{customer?.name}</h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">+{customer?.phone}</p>
            <span className="inline-block text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 mt-1.5">
              Member Setia Merem Melek
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-xs font-bold text-slate-600 transition flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" /> Keluar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 rounded-full bg-white border border-slate-100 shadow-sm mb-6 max-w-md mx-auto sm:mx-0">
        <button
          onClick={() => setActiveTab('points')}
          className={`flex-1 py-2.5 rounded-full text-xs font-black transition flex items-center justify-center gap-1.5 ${
            activeTab === 'points' ? 'bg-[#8BC137] text-[#183F2E] shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Star className="w-3.5 h-3.5" /> Poin & Rewards
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-2.5 rounded-full text-xs font-black transition flex items-center justify-center gap-1.5 ${
            activeTab === 'orders' ? 'bg-[#8BC137] text-[#183F2E] shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" /> Riwayat Pesanan
        </button>
        <button
          onClick={() => setActiveTab('addresses')}
          className={`flex-1 py-2.5 rounded-full text-xs font-black transition flex items-center justify-center gap-1.5 ${
            activeTab === 'addresses' ? 'bg-[#8BC137] text-[#183F2E] shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" /> Alamat Saya
        </button>
      </div>

      {/* TAB 1: POINTS & REWARDS */}
      {activeTab === 'points' && (
        <div className="space-y-6">
          {/* Points Card */}
          <div className="rounded-3xl p-6 sm:p-8 border border-[#183F2E] bg-gradient-to-r from-[#183F2E] to-[#123626] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-bold text-[#FFD83D] uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
                <Star className="w-4 h-4 fill-current" /> Saldo Poin Membership AMM
              </span>
              <div className="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight drop-shadow-sm">
                {(membership?.totalPoints || 0).toLocaleString('id-ID')}{' '}
                <span className="text-lg font-bold text-[#FFD83D]">poin</span>
              </div>
              <p className="text-xs text-[#FFF8E8]/80 pt-1">
                Dihitung otomatis dari buku besar transaksi: dapatkan 1 poin per kelipatan Rp 1.000 belanja.
              </p>
            </div>

            <MangoMascot state="reward" size="md" />
          </div>

          {redeemSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2 shadow-sm">
              <Sparkles className="w-4 h-4 flex-shrink-0 text-[#8BC137]" />
              <span>{redeemSuccess}</span>
            </div>
          )}

          {/* Rewards Catalog */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-black text-[#183F2E] flex items-center gap-2 pb-3 border-b border-slate-100">
              <Gift className="w-4 h-4 text-[#8BC137]" /> Katalog Penukaran Hadiah
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {rewards.map((r) => {
                const canAfford = (membership?.totalPoints || 0) >= r.points_required
                return (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-[#183F2E]">{r.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-1">{r.description}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold mb-2">
                        <span className="text-amber-800 font-mono">{r.points_required} Poin</span>
                        <span className="text-[10px] text-slate-400">Stok Tersedia</span>
                      </div>
                      <button
                        type="button"
                        disabled={!canAfford || redeeming === r.id}
                        onClick={() => handleRedeem(r.id)}
                        className={`w-full py-2.5 rounded-full text-xs font-black transition flex items-center justify-center gap-1 ${
                          canAfford
                            ? 'bg-[#8BC137] text-[#183F2E] hover:bg-[#7ab02d] shadow-sm'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {redeeming === r.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : canAfford ? (
                          'Tukarkan Poin'
                        ) : (
                          'Poin Belum Cukup'
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Points Ledger History */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-black text-[#183F2E] pb-3 border-b border-slate-100">
              Riwayat Transaksi Poin (Buku Besar)
            </h3>
            {membership?.history && membership.history.length > 0 ? (
              <div className="divide-y divide-slate-100 text-xs">
                {membership.history.map((h: any) => (
                  <div key={h.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{h.reason}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{h.createdAt}</p>
                    </div>
                    <span
                      className={`font-mono font-bold text-sm ${
                        h.points > 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {h.points > 0 ? `+${h.points}` : h.points} pts
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">Belum ada riwayat perolehan poin.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ORDER HISTORY */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Filters & Search Header */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search by Order Number */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={orderSearchQuery}
                  onChange={(e) => {
                    setOrderSearchQuery(e.target.value)
                    if (customer?.phone) {
                      loadOrders(customer.phone, orderStatusFilter, e.target.value)
                    }
                  }}
                  placeholder="Cari nomor pesanan (#AMM-...)"
                  className="w-full text-xs rounded-full pl-4 pr-9 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#183F2E] transition"
                />
                {orderSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrderSearchQuery('')
                      if (customer?.phone) {
                        loadOrders(customer.phone, orderStatusFilter, '')
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => {
                  if (customer?.phone) {
                    loadOrders(customer.phone, orderStatusFilter, orderSearchQuery)
                  }
                }}
                className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition inline-flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? 'animate-spin' : ''}`} />
                <span>Segarkan</span>
              </button>
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 text-xs">
              {[
                { id: 'semua', label: 'Semua Status' },
                { id: 'menunggu_pembayaran', label: 'Menunggu Bayar' },
                { id: 'diproses', label: 'Diproses Dapur' },
                { id: 'dikirim', label: 'Dalam Pengiriman' },
                { id: 'selesai', label: 'Selesai Diterima' },
              ].map((flt) => (
                <button
                  key={flt.id}
                  type="button"
                  onClick={() => {
                    setOrderStatusFilter(flt.id)
                    if (customer?.phone) {
                      loadOrders(customer.phone, flt.id, orderSearchQuery)
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    orderStatusFilter === flt.id
                      ? 'bg-[#183F2E] text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {flt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          {loadingOrders ? (
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#8BC137]" />
              <span>Memuat riwayat transaksi customer...</span>
            </div>
          ) : orders.length > 0 ? (
            orders.map((o) => (
              <div key={o.id || o.orderNumber} className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 sm:p-6 space-y-4">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-[#183F2E] text-sm">#{o.orderNumber || o.order_number}</span>
                      {o.paymentStatus === 'paid' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          ✓ Lunas
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          Menunggu Bayar
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 block text-[11px] mt-0.5 font-medium">
                      {o.createdAt || o.created_at}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      (o.orderStatus || o.order_status) === 'selesai'
                        ? 'bg-emerald-100 text-emerald-800'
                        : (o.orderStatus || o.order_status) === 'diproses'
                        ? 'bg-amber-100 text-amber-800'
                        : (o.orderStatus || o.order_status) === 'dikirim'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {(o.orderStatus || o.order_status) === 'selesai'
                      ? '✓ Pesanan Diterima & Selesai'
                      : (o.orderStatus || o.order_status) === 'diproses'
                      ? '🍳 Sedang Disiapkan Dapur'
                      : (o.orderStatus || o.order_status) === 'dikirim'
                      ? '🛵 Dalam Perjalanan'
                      : o.orderStatus || o.order_status}
                  </span>
                </div>

                {/* Items & Seasonings Snapshot */}
                <div className="space-y-2 text-xs">
                  {(o.items || []).map((it: any) => (
                    <div key={it.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>
                          {it.qty}x {it.product_name || it.productName} ({it.size})
                        </span>
                        <span className="font-mono text-[#183F2E]">
                          Rp {(it.subtotal || it.unit_price * it.qty || 0).toLocaleString('id-ID')}
                        </span>
                      </div>

                      {/* Seasonings Snapshot */}
                      {it.seasonings && it.seasonings.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-slate-400 font-semibold">Bumbu:</span>
                          {it.seasonings.map((s: any, idx: number) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[#183F2E] font-medium"
                            >
                              {s.qty}x {s.seasoning_name || s.seasoningName}
                              {s.extra_price > 0 && ` (+Rp ${s.extra_price.toLocaleString('id-ID')})`}
                            </span>
                          ))}
                        </div>
                      )}

                      {it.custom_fruit_notes && (
                        <p className="text-[10px] text-amber-800 italic pt-0.5">
                          Catatan: &ldquo;{it.custom_fruit_notes}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Price Breakdown & Loyalty Points */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">
                        Total Bayar: <strong className="text-[#183F2E] font-mono text-sm">Rp {(o.total || 0).toLocaleString('id-ID')}</strong>
                      </span>
                      {o.discount > 0 && (
                        <span className="text-[10px] text-rose-600 font-bold">
                          Hemat Rp {o.discount.toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>

                    {/* Points Earned from this order */}
                    {o.pointsEarned > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <Sparkles className="w-3 h-3 text-amber-500" /> +{o.pointsEarned} Poin Diperoleh
                      </span>
                    )}
                  </div>

                  {/* Tracking Button */}
                  <button
                    type="button"
                    onClick={() => router.push(o.trackingUrl || `/track/${o.orderNumber || o.order_number}?token=${o.trackingToken || o.tracking_token}`)}
                    className="px-5 py-2.5 rounded-full bg-[#8BC137] text-[#183F2E] font-black text-xs hover:bg-[#7ab02d] transition inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span>Lacak Pesanan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-10 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#8BC137]/15 mx-auto flex items-center justify-center text-3xl">
                🥭
              </div>
              <p className="text-sm font-bold text-[#183F2E]">Belum Ada Riwayat Pesanan</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {orderSearchQuery || orderStatusFilter !== 'semua'
                  ? 'Tidak ada pesanan yang sesuai dengan filter pencarian Anda.'
                  : 'Yuk, nikmati kesegaran rujak buah dan asinan autentik khas Merem Melek!'}
              </p>
              <button
                type="button"
                onClick={() => router.push('/menu')}
                className="mt-2 px-6 py-2.5 bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black text-xs rounded-full shadow-sm transition cursor-pointer"
              >
                Pesan Rujak Sekarang
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SAVED ADDRESSES */}
      {activeTab === 'addresses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-black text-[#183F2E]">Alamat Pengiriman Tersimpan</h3>
            <button
              onClick={() => setShowAddAddress(!showAddAddress)}
              className="px-4 py-2 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black text-xs flex items-center gap-1 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Alamat
            </button>
          </div>

          {showAddAddress && (
            <form onSubmit={handleAddAddress} className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Label Alamat</label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Rumah, Kantor, dll"
                    className="w-full rounded-2xl p-3 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#183F2E] transition"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Nama Penerima</label>
                  <input
                    type="text"
                    required
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    placeholder="Nama penerima"
                    className="w-full rounded-2xl p-3 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#183F2E] transition"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Nomor WhatsApp Penerima</label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="08123456789"
                  className="w-full rounded-2xl p-3 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#183F2E] transition"
                />
              </div>
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  required
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Jalan, No. Rumah, RT/RW, Patokan..."
                  className="w-full rounded-2xl p-3 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#183F2E] transition"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAddress(false)}
                  className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="px-5 py-2.5 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black shadow-sm transition"
                >
                  {savingAddress ? 'Menyimpan...' : 'Simpan Alamat'}
                </button>
              </div>
            </form>
          )}

          {addresses.map((a) => (
            <div key={a.id} className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 flex items-start justify-between gap-4 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#183F2E]">{a.label}</span>
                  {a.is_default === 1 && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                      Utama
                    </span>
                  )}
                </div>
                <p className="font-semibold text-slate-800 mt-1">{a.recipient_name} ({a.phone})</p>
                <p className="text-slate-500 mt-0.5">{a.full_address}</p>
              </div>
              <button
                onClick={() => handleDeleteAddress(a.id)}
                className="text-slate-400 hover:text-rose-600 p-1.5 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
