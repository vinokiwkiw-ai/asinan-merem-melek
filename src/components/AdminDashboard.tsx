'use client'

import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  CheckCircle,
  Clock,
  Package,
  ShoppingBag,
  Store,
  Tag,
  Star,
  MessageSquare,
  FileText,
  Settings,
  ShieldCheck,
  AlertCircle,
  Eye,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Download,
  X,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Truck,
  Upload,
  Image as ImageIcon,
  Edit3,
  Layers,
  Globe,
  Sparkles,
  Percent,
  Archive,
  Save,
} from 'lucide-react'
import { MangoMascot } from './mascot/MangoMascot'

interface AdminUser {
  id: string
  name: string
  username: string
  email: string
  role: string
  permissions: string[]
}

export const AdminDashboard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [activeModule, setActiveModule] = useState<string>('overview')

  // Global state
  const [orders, setOrders] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true)
  const [reportSummary, setReportSummary] = useState<any>(null)
  const [productsData, setProductsData] = useState<any>({ products: [], seasonings: [], customizationRules: [] })
  const [settingsData, setSettingsData] = useState<any>({ settings: {}, schedules: [], exceptions: [] })
  const [vouchers, setVouchers] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])

  // Modal states
  const [selectedProofOrder, setSelectedProofOrder] = useState<any>(null)
  const [rejectModalOrder, setRejectModalOrder] = useState<any>(null)
  const [rejectionReason, setRejectionReason] = useState<string>('')
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null)
  const [editProductModal, setEditProductModal] = useState<any>(null)
  const [editorActiveTab, setEditorActiveTab] = useState<'basic' | 'images' | 'pricing' | 'options' | 'stock' | 'promotion' | 'seo'>('basic')
  const [uploadingProductPhoto, setUploadingProductPhoto] = useState<boolean>(false)
  const [productPreviewModal, setProductPreviewModal] = useState<boolean>(false)
  const [savingProduct, setSavingProduct] = useState<boolean>(false)
  const [adjustPointsCustomer, setAdjustPointsCustomer] = useState<any>(null)
  const [pointsDelta, setPointsDelta] = useState<number>(50)
  const [pointsReason, setPointsReason] = useState<string>('')

  // New order & product filters
  const [orderFilter, setOrderFilter] = useState<string>('all')
  const [productFilter, setProductFilter] = useState<string>('ALL')
  const [productSearch, setProductSearch] = useState<string>('')

  // Status correction modal state
  const [statusCorrectionOrder, setStatusCorrectionOrder] = useState<any>(null)
  const [correctionTargetStatus, setCorrectionTargetStatus] = useState<string>('')
  const [correctionReason, setCorrectionReason] = useState<string>('')
  const [correctionLoading, setCorrectionLoading] = useState<boolean>(false)
  const [correctionFieldError, setCorrectionFieldError] = useState<string | null>(null)

  // Courier edit modal state
  const [courierModalOrder, setCourierModalOrder] = useState<any>(null)
  const [courierForm, setCourierForm] = useState({
    courierName: '',
    courierTrackingNumber: '',
    courierStatus: 'IN_TRANSIT',
    estimatedDeliveryTime: '',
  })

  // Full-size image zoom modal (receipt proof / transfer proof)
  const [zoomImageUrl, setZoomImageUrl] = useState<{ url: string; title: string; subtitle?: string } | null>(null)

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Master Seasonings State
  const [seasoningsList, setSeasoningsList] = useState<any[]>([])
  const [showSeasoningManager, setShowSeasoningManager] = useState<boolean>(false)
  const [seasoningModalForm, setSeasoningModalForm] = useState<{
    id?: string
    name: string
    description: string
    extraPrice: number
    sortOrder: number
    isAvailable: number
  } | null>(null)

  // Reviews Moderation State
  const [reviewFilterRating, setReviewFilterRating] = useState<string>('all')
  const [reviewFilterStatus, setReviewFilterStatus] = useState<string>('all')
  const [reviewSearchQuery, setReviewSearchQuery] = useState<string>('')

  // Outlet Schedule & Store Status State
  const [storeStatus, setStoreStatus] = useState<'OPEN' | 'TEMP_CLOSED'>('OPEN')
  const [storeAnnouncement, setStoreAnnouncement] = useState<string>('')
  const [showAddExceptionModal, setShowAddExceptionModal] = useState<boolean>(false)
  const [exceptionForm, setExceptionForm] = useState({
    branch_id: 'greenlake',
    date: '',
    is_closed: 1,
    open_time: '09:00',
    close_time: '20:00',
    reason: '',
  })

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Load user from session
  useEffect(() => {
    const saved = sessionStorage.getItem('amm_admin_user')
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved))
      } catch {
        setCurrentUser({
          id: 'usr_superadmin_01',
          name: 'Super Administrator',
          username: 'superadmin',
          email: 'admin@asinanmeremmelek.site',
          role: 'SUPER_ADMIN',
          permissions: ['overview', 'orders', 'payments', 'products', 'outlets', 'vouchers', 'membership', 'reviews', 'reports', 'settings'],
        })
      }
    } else {
      setCurrentUser({
        id: 'usr_superadmin_01',
        name: 'Super Administrator',
        username: 'superadmin',
        email: 'admin@asinanmeremmelek.site',
        role: 'SUPER_ADMIN',
        permissions: ['overview', 'orders', 'payments', 'products', 'outlets', 'vouchers', 'membership', 'reviews', 'reports', 'settings'],
      })
    }
  }, [])

  // Fetch orders & reports
  const fetchOrders = async (statusFilter?: string) => {
    try {
      const activeFilter = statusFilter !== undefined ? statusFilter : orderFilter
      const q = activeFilter && activeFilter !== 'all' ? `?status=${activeFilter}` : ''
      const res = await fetch(`/api/admin/orders${q}`)
      const data = await res.json()
      if (data.orders) setOrders(data.orders)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingOrders(false)
    }
  }

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/admin/reports/summary')
      const data = await res.json()
      setReportSummary(data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products')
      const data = await res.json()
      setProductsData(data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      setSettingsData(data)
      if (data.settings?.store_status) {
        setStoreStatus(data.settings.store_status)
      }
      if (data.settings?.store_announcement !== undefined) {
        setStoreAnnouncement(data.settings.store_announcement)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchSeasonings = async () => {
    try {
      const res = await fetch('/api/admin/seasonings')
      const data = await res.json()
      if (data.seasonings) setSeasoningsList(data.seasonings)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchVouchers = async () => {
    try {
      const res = await fetch('/api/admin/vouchers')
      const data = await res.json()
      if (data.vouchers) setVouchers(data.vouchers)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchReviews = async (rating = reviewFilterRating, published = reviewFilterStatus, search = reviewSearchQuery) => {
    try {
      const q = new URLSearchParams()
      if (rating && rating !== 'all') q.set('rating', rating)
      if (published && published !== 'all') q.set('published', published)
      if (search) q.set('search', search)
      const res = await fetch(`/api/admin/reviews?${q.toString()}`)
      const data = await res.json()
      if (data.reviews) setReviews(data.reviews)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/support/tickets')
      const data = await res.json()
      if (data.tickets) setTickets(data.tickets)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchOrders()
    fetchReports()
    fetchProducts()
    fetchSettings()
    fetchSeasonings()
    fetchVouchers()
    fetchReviews()
    fetchTickets()

    // Poll every 8s
    const timer = setInterval(() => {
      fetchOrders()
      fetchReports()
    }, 8000)
    return () => clearInterval(timer)
  }, [])

  // Approve Payment Action
  const handleApprovePayment = async (orderId: string) => {
    try {
      const res = await fetch('/api/admin/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          action: 'APPROVE',
          adminName: currentUser?.name || 'Admin',
          adminId: currentUser?.id || 'admin',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memverifikasi pembayaran.')

      showToast(`Pembayaran pesanan ${data.orderNumber} berhasil diverifikasi!`)
      setSelectedProofOrder(null)
      fetchOrders()
      fetchReports()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Reject Payment Action
  const handleRejectPayment = async () => {
    if (!rejectModalOrder) return
    if (!rejectionReason || rejectionReason.trim().length < 5) {
      showToast('Alasan penolakan minimal 5 karakter!', 'error')
      return
    }

    try {
      const res = await fetch('/api/admin/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: rejectModalOrder.id,
          action: 'REJECT',
          rejectionReason: rejectionReason.trim(),
          adminName: currentUser?.name || 'Admin',
          adminId: currentUser?.id || 'admin',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menolak bukti pembayaran.')

      showToast(`Bukti pembayaran pesanan ${data.orderNumber} telah ditolak.`)
      setRejectModalOrder(null)
      setSelectedProofOrder(null)
      setRejectionReason('')
      fetchOrders()
      fetchReports()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Update Order Status (Standard Operational Progression)
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, reason?: string) => {
    const operationalDefaultReasons: Record<string, string> = {
      diproses: 'Pesanan mulai disiapkan dan diproses oleh dapur kitchen',
      siap_dikirim: 'Pesanan selesai dikemas higienis dan siap dijemput kurir',
      dikirim: 'Pesanan telah diserahkan ke kurir pengantar untuk dikirim',
      sampai: 'Pesanan dilaporkan telah tiba di lokasi tujuan penerima',
      selesai: 'Pesanan diselesaikan melalui verifikasi operasional admin',
      dibatalkan: 'Pesanan dibatalkan oleh pihak admin operasional',
    }
    const finalReason = (reason || operationalDefaultReasons[newStatus] || `Pembaruan status operasional ke ${newStatus}`).trim()

    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          orderStatus: newStatus,
          adminNotes: finalReason,
          correctionReason: finalReason,
          adminName: currentUser?.name || 'Admin',
          adminId: currentUser?.id || 'admin',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      showToast(data.message || 'Status pesanan berhasil diperbarui!')
      fetchOrders(orderFilter)
      fetchReports()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Quick Product Availability Toggle
  const handleQuickAvailability = async (productId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_AVAILABILITY',
          productId,
          availabilityStatus: newStatus,
          adminName: currentUser?.name || 'Admin',
          adminId: currentUser?.id || 'admin',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      showToast(data.message)
      setProductsData((prev: any) => ({
        ...prev,
        products: prev.products.map((p: any) =>
          p.id === productId
            ? { ...p, availability_status: newStatus, is_available: newStatus === 'AVAILABLE' ? 1 : 0 }
            : p
        ),
      }))
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Submit Status Correction with Mandatory Reason
  const handlePerformStatusCorrection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!statusCorrectionOrder || !correctionTargetStatus) return
    const trimmedReason = correctionReason.trim()
    if (trimmedReason.length < 5) {
      setCorrectionFieldError('Alasan koreksi status wajib diisi minimal 5 karakter!')
      return
    }
    setCorrectionFieldError(null)

    setCorrectionLoading(true)
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: statusCorrectionOrder.id,
          orderStatus: correctionTargetStatus,
          correctionReason: trimmedReason,
          adminName: currentUser?.name || 'Admin',
          adminId: currentUser?.id || 'admin',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      showToast(data.message || 'Koreksi status berhasil dicatat!')
      setStatusCorrectionOrder(null)
      setCorrectionTargetStatus('')
      setCorrectionReason('')
      setCorrectionFieldError(null)
      fetchOrders(orderFilter)
      fetchReports()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setCorrectionLoading(false)
    }
  }

  // Save Courier Tracking Information
  const handleSaveCourierInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courierModalOrder) return

    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: courierModalOrder.id,
          courierName: courierForm.courierName,
          courierTrackingNumber: courierForm.courierTrackingNumber,
          courierStatus: courierForm.courierStatus,
          estimatedDeliveryTime: courierForm.estimatedDeliveryTime,
          adminName: currentUser?.name || 'Admin',
          adminId: currentUser?.id || 'admin',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      showToast('Informasi kurir berhasil disimpan!')
      setCourierModalOrder(null)
      fetchOrders(orderFilter)
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Open Create New Product Form
  const handleAddNewProduct = () => {
    setEditorActiveTab('basic')
    setEditProductModal({
      id: '',
      sku: `AMM-${Date.now().toString().slice(-6)}`,
      name: '',
      slug: '',
      category_id: productsData.categories?.[0]?.id || 'asinan',
      base_price: 35000,
      short_description: '',
      full_description: '',
      description: '',
      photo_key: '',
      image_url: '/menu-photos/rujak-buah-personal.webp',
      gallery_images: [],
      seo_title: '',
      seo_description: '',
      display_order: (productsData.products?.length || 0) + 1,
      is_signature: false,
      is_bestseller: false,
      promo_price: '',
      promo_start_at: '',
      promo_end_at: '',
      stock: 999,
      low_stock_threshold: 10,
      available_sizes: ['PERSONAL', 'SHARING', 'MEGA'],
      size_pricing: { PERSONAL: 71500, SHARING: 137500, MEGA: 265000 },
      customization_options: { allowed_seasonings: 2, allow_duplicates: true },
      is_available: true,
      availability_status: 'AVAILABLE',
      mood: 'SEGAR',
    })
  }

  // Open Edit Product Form
  const handleEditProductClick = (product: any) => {
    setEditorActiveTab('basic')
    let parsedGallery = []
    try {
      parsedGallery = typeof product.gallery_images === 'string' ? JSON.parse(product.gallery_images || '[]') : (product.gallery_images || [])
    } catch {
      parsedGallery = []
    }

    let parsedSizes = ['PERSONAL', 'SHARING', 'MEGA']
    try {
      parsedSizes = typeof product.available_sizes === 'string' ? JSON.parse(product.available_sizes || '[]') : (product.available_sizes || ['PERSONAL', 'SHARING', 'MEGA'])
    } catch {
      parsedSizes = ['PERSONAL', 'SHARING', 'MEGA']
    }

    let parsedSizePricing: any = {}
    try {
      parsedSizePricing = typeof product.size_pricing === 'string' ? JSON.parse(product.size_pricing || '{}') : (product.size_pricing || {})
    } catch {
      parsedSizePricing = {}
    }

    setEditProductModal({
      ...product,
      gallery_images: parsedGallery,
      available_sizes: parsedSizes,
      size_pricing: parsedSizePricing,
      short_description: product.short_description || product.description || '',
      full_description: product.full_description || product.description || '',
      promo_price: product.promo_price ?? '',
      promo_start_at: product.promo_start_at ?? '',
      promo_end_at: product.promo_end_at ?? '',
      low_stock_threshold: product.low_stock_threshold ?? 10,
    })
  }

  // Upload Product Image to /api/admin/products/upload
  const handleUploadProductImage = async (file: File, isGallery = false) => {
    if (!file) return
    setUploadingProductPhoto(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/products/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (isGallery) {
        const currentGallery = Array.isArray(editProductModal.gallery_images)
          ? editProductModal.gallery_images
          : []
        setEditProductModal({
          ...editProductModal,
          gallery_images: [...currentGallery, { url: data.url, alt: editProductModal.name || 'Foto Produk' }],
        })
      } else {
        setEditProductModal({
          ...editProductModal,
          image_url: data.url,
        })
      }
      showToast('Foto berhasil diunggah!')
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setUploadingProductPhoto(false)
    }
  }

  // Save Product Changes
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editProductModal) return
    if (!editProductModal.name || editProductModal.name.trim().length < 2) {
      showToast('Nama produk wajib diisi minimal 2 karakter!', 'error')
      return
    }
    if (!editProductModal.category_id) {
      showToast('Kategori produk wajib dipilih!', 'error')
      return
    }

    setSavingProduct(true)
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_PRODUCT',
          product: editProductModal,
          adminName: currentUser?.name || 'Admin',
          adminId: currentUser?.id || 'admin',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      showToast(data.message || 'Produk berhasil disimpan!')
      setEditProductModal(null)
      fetchProducts()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSavingProduct(false)
    }
  }

  // Soft Archive Product
  const handleArchiveProduct = async (productId: string, productName: string) => {
    if (!confirm(`Yakin ingin mengarsipkan menu "${productName}"? Menu akan disembunyikan dari etalase pelanggan namun catatan pesanan terdahulu tetap aman.`)) return

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ARCHIVE_PRODUCT',
          productId,
          adminName: currentUser?.name || 'Admin',
          adminId: currentUser?.id || 'admin',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      showToast(data.message || 'Menu berhasil diarsipkan!')
      fetchProducts()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Adjust Customer Points
  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustPointsCustomer || !pointsReason) return

    try {
      const res = await fetch('/api/membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADJUST',
          customerId: adjustPointsCustomer.id,
          pointsDelta: Number(pointsDelta),
          reason: pointsReason.trim(),
          adminName: currentUser?.name || 'Admin',
          adminId: currentUser?.id || 'admin',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      showToast(`Poin berhasil disesuaikan! Saldo baru: ${data.newBalance} pts`)
      setAdjustPointsCustomer(null)
      setPointsReason('')
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Save Settings
  const handleSaveSetting = async (key: string, value: any) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_SETTING',
          key,
          value,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast(`Pengaturan "${key}" berhasil diperbarui!`)
      fetchSettings()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Toggle Store Status (OPEN vs TEMP_CLOSED)
  const handleToggleStoreStatus = async () => {
    const nextStatus = storeStatus === 'OPEN' ? 'TEMP_CLOSED' : 'OPEN'
    await handleSaveSetting('store_status', nextStatus)
    setStoreStatus(nextStatus)
  }

  // Save Store Announcement
  const handleSaveStoreAnnouncement = async () => {
    await handleSaveSetting('store_announcement', storeAnnouncement)
  }

  // Save Outlet Schedule
  const handleSaveSchedule = async (schedule: any) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_SCHEDULE',
          schedule,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('Jadwal operasional outlet berhasil disimpan!')
      fetchSettings()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Save Holiday / Schedule Exception
  const handleSaveException = async () => {
    if (!exceptionForm.date) {
      showToast('Tanggal pengecualian wajib dipilih', 'error')
      return
    }
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_EXCEPTION',
          exception: exceptionForm,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('Pengecualian jadwal libur berhasil disimpan!')
      setShowAddExceptionModal(false)
      fetchSettings()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Delete Schedule Exception
  const handleDeleteException = async (id: string) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_EXCEPTION',
          id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('Pengecualian jadwal berhasil dihapus.')
      fetchSettings()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Save Master Seasoning
  const handleSaveSeasoning = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!seasoningModalForm || !seasoningModalForm.name.trim()) {
      showToast('Nama bumbu wajib diisi', 'error')
      return
    }

    try {
      const isEdit = Boolean(seasoningModalForm.id)
      const res = await fetch('/api/admin/seasonings', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seasoningModalForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast(isEdit ? 'Data bumbu berhasil diperbarui!' : 'Bumbu baru berhasil ditambahkan!')
      setShowSeasoningManager(false)
      setSeasoningModalForm(null)
      fetchSeasonings()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Toggle Seasoning Availability
  const handleToggleSeasoning = async (id: string, currentStatus: number) => {
    try {
      const res = await fetch('/api/admin/seasonings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          isAvailable: currentStatus === 1 ? 0 : 1,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('Status ketersediaan bumbu berhasil diperbarui.')
      fetchSeasonings()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Toggle Review Publication on Homepage
  const handleTogglePublishReview = async (id: string, currentPublished: number) => {
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          isPublished: currentPublished === 1 ? 0 : 1,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast(currentPublished === 1 ? 'Ulasan disembunyikan dari homepage.' : 'Ulasan dipublikasikan di homepage!')
      fetchReviews()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Toggle Review Featured
  const handleToggleFeaturedReview = async (id: string, currentFeatured: number) => {
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          isFeatured: currentFeatured === 1 ? 0 : 1,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('Status ulasan sorotan berhasil diperbarui.')
      fetchReviews()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Filter pending proofs
  const pendingProofOrders = orders.filter((o) => o.payment?.status === 'under_verification')

  // Navigation tabs definition
  const navTabs = [
    { id: 'overview', label: 'Ringkasan & KPI', icon: LayoutDashboard },
    { id: 'payments', label: 'Verifikasi Pembayaran', icon: ShieldCheck, badge: pendingProofOrders.length },
    { id: 'orders', label: 'Kelola Pesanan', icon: ShoppingBag, badge: orders.length },
    { id: 'products', label: 'Menu & Customizer', icon: Package },
    { id: 'outlets', label: 'Jadwal Outlet WIB', icon: Store },
    { id: 'vouchers', label: 'Voucher Diskon', icon: Tag },
    { id: 'membership', label: 'Membership & Poin', icon: Star },
    { id: 'reviews', label: 'Ulasan & Bantuan', icon: MessageSquare },
    { id: 'reports', label: 'Laporan & Ekspor', icon: FileText },
    { id: 'settings', label: 'Pengaturan Bisnis', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAF6] text-[#183F2E] flex flex-col md:flex-row">
      {/* Sleek Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[100] px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 max-w-sm transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'error'
              ? 'bg-white border-rose-200 text-rose-800 shadow-rose-500/10'
              : 'bg-white border-emerald-200 text-emerald-800 shadow-emerald-500/10'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
              toast.type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          </div>
          <div className="flex-1 text-xs font-semibold leading-snug">{toast.message}</div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200/80 p-5 flex flex-col justify-between flex-shrink-0 shadow-sm">
        <div className="space-y-6">
          {/* Logo Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF8E8] border border-[#8BC137]/30 flex items-center justify-center text-xl shadow-sm flex-shrink-0">
              🥭
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-[#183F2E] tracking-tight">Merem Melek</h2>
              <span className="text-[10px] font-black text-[#8BC137] tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#8BC137]/15 inline-block mt-0.5">
                {currentUser?.role || 'Admin'}
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            {navTabs.map((tab) => {
              const Icon = tab.icon
              const isSelected = activeModule === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveModule(tab.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-[#8BC137] text-[#183F2E] shadow-sm font-black'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-[#183F2E]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                        isSelected ? 'bg-[#183F2E] text-[#8BC137]' : 'bg-[#FF5954] text-white shadow-sm'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500">
          <p className="font-bold text-[#183F2E] truncate">{currentUser?.name}</p>
          <p className="text-[10px] text-[#8BC137] font-mono mt-0.5 font-bold">WIB (Asia/Jakarta)</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-5 sm:p-8 overflow-y-auto max-w-7xl">
        {/* MODULE 1: OVERVIEW & KPI */}
        {activeModule === 'overview' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-[#183F2E]">Ringkasan Operasional & KPI</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitoring penjualan terverifikasi dan antrean kitchen Asinan Merem Melek.
                </p>
              </div>

              {pendingProofOrders.length > 0 && (
                <button
                  onClick={() => setActiveModule('payments')}
                  className="px-4 py-2 bg-[#FF5954] hover:bg-[#ff413c] text-white text-xs font-extrabold rounded-full shadow-md animate-bounce-subtle flex items-center gap-2 transition"
                >
                  <AlertCircle className="w-4 h-4" /> {pendingProofOrders.length} Bukti Transfer Menunggu
                  Verifikasi!
                </button>
              )}
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Pesanan
                </span>
                <div className="text-2xl sm:text-3xl font-black text-[#183F2E]">
                  {reportSummary?.totalOrders || orders.length}
                </div>
                <span className="text-[10px] text-slate-500 block">Semua pesanan masuk</span>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Pendapatan Lunas
                </span>
                <div className="text-2xl sm:text-3xl font-black text-[#183F2E] font-mono">
                  Rp {(reportSummary?.verifiedRevenue || 0).toLocaleString('id-ID')}
                </div>
                <span className="text-[10px] text-emerald-600 font-bold block">✓ Dana transfer terverifikasi</span>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Antrean Verifikasi
                </span>
                <div className="text-2xl sm:text-3xl font-black text-amber-600">
                  {pendingProofOrders.length}
                </div>
                <span className="text-[10px] text-amber-700 block">Bukti screenshot diunggah</span>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Pesanan Selesai
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-700">
                  {reportSummary?.completedOrders || 0}
                </div>
                <span className="text-[10px] text-emerald-700 font-bold block">
                  Tingkat Sukses: {reportSummary?.completionRate || 0}%
                </span>
              </div>
            </div>

            {/* Top Products & Seasonings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-3">
                <h3 className="text-sm font-extrabold text-[#183F2E] flex items-center gap-2 pb-2 border-b border-slate-100">
                  <TrendingUp className="w-4 h-4 text-[#8BC137]" /> Produk Paling Laris (Best Seller)
                </h3>
                <div className="space-y-2 text-xs">
                  {reportSummary?.topProducts?.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="font-bold text-[#183F2E] truncate max-w-[200px]">{p.name}</span>
                      <div className="text-right">
                        <span className="font-black text-[#183F2E] block">{p.qty} terjual</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Rp {p.revenue.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  )) || <p className="text-slate-400 py-2">Belum ada data penjualan.</p>}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-3">
                <h3 className="text-sm font-extrabold text-[#183F2E] flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Package className="w-4 h-4 text-amber-500" /> Bumbu Paling Diminati Pelanggan
                </h3>
                <div className="space-y-2 text-xs">
                  {reportSummary?.topSeasonings?.map((s: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="font-bold text-[#183F2E]">{s.name}</span>
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {s.count} porsi dipilih
                      </span>
                    </div>
                  )) || <p className="text-slate-400 py-2">Belum ada data bumbu.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 2: PAYMENT VERIFICATION INBOX */}
        {activeModule === 'payments' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-[#183F2E]">Antrean Verifikasi Bukti Pembayaran</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Periksa kesesuaian screenshot transfer pelanggan dengan rekening resmi sebelum menyetujui pesanan.
              </p>
            </div>

            {pendingProofOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
                <MangoMascot state="payment_success" size="md" />
                <h3 className="text-lg font-extrabold text-[#183F2E] mt-4">Antrean Bersih!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tidak ada bukti pembayaran yang menunggu verifikasi saat ini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingProofOrders.map((o) => (
                  <div key={o.id} className="bg-white rounded-3xl p-5 border border-amber-200/70 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <span className="font-mono font-extrabold text-sm text-[#183F2E]">{o.order_number}</span>
                        <span className="text-[10px] text-slate-400 block">Dibuat: {o.created_at}</span>
                      </div>
                      <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-[#FFD83D] text-[#183F2E]">
                        Verifikasi Kasir
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Pelanggan:</span>
                        <p className="font-extrabold text-[#183F2E] mt-0.5">{o.customer_name}</p>
                        <p className="text-slate-500 font-mono text-[11px]">{o.customer_phone}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Harus Diterima:</span>
                        <p className="font-mono font-black text-base text-[#183F2E] mt-0.5">
                          Rp {o.total.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>

                    {/* Receipt Preview Thumbnail */}
                    {o.payment?.proof_image_path ? (
                      <div className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 h-44 flex items-center justify-center">
                        <img
                          src={o.payment.proof_image_path}
                          alt="Bukti Transfer"
                          className="max-h-full object-contain cursor-pointer transition group-hover:scale-105"
                          onClick={() => setSelectedProofOrder(o)}
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedProofOrder(o)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-xs font-bold text-white rounded-2xl"
                        >
                          <Eye className="w-4 h-4" /> Perbesar Gambar Bukti
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400">
                        Tidak ada file bukti transfer terlampir.
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setRejectModalOrder(o)}
                        className="flex-1 py-2.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition border border-rose-200"
                      >
                        Tolak Bukti...
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprovePayment(o.id)}
                        className="flex-1 py-2.5 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black text-xs transition shadow-sm flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Setujui & Lanjutkan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODULE 3: ORDER MANAGEMENT */}
        {activeModule === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-[#183F2E]">Kelola & Monitoring Pesanan</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pantau status kitchen, kurir pengiriman, konfirmasi penerimaan, dan kendala pelanggan.
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
              {[
                { id: 'all', label: 'Semua Pesanan' },
                { id: 'diproses', label: 'Sedang Disiapkan' },
                { id: 'dikirim', label: 'Dalam Perjalanan' },
                { id: 'sampai_unconfirmed', label: 'Telah Sampai (Belum Konfirmasi)' },
                { id: 'selesai', label: 'Selesai & Dikonfirmasi' },
                { id: 'kendala', label: 'Ada Laporan Kendala' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setOrderFilter(f.id)
                    fetchOrders(f.id)
                  }}
                  className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition cursor-pointer text-xs ${
                    orderFilter === f.id
                      ? 'bg-[#8BC137] text-[#183F2E] shadow-sm font-black'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-[#183F2E] hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-sm">
                <MangoMascot state="idle" size="sm" />
                <p className="text-sm font-bold text-[#183F2E] mt-3">Tidak ada pesanan pada filter ini.</p>
                <p className="text-xs text-slate-400 mt-1">Coba pilih filter lain atau muat ulang.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((o) => {
                  const hasArrivedUnconfirmed =
                    (o.order_status === 'sampai' || o.courier_status === 'DELIVERED') && !o.customer_confirmed_at

                  return (
                    <div key={o.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                      {/* Card Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs">
                        <div>
                          <span className="font-mono font-black text-sm text-[#183F2E]">{o.order_number}</span>
                          <span className="text-slate-400 block text-[10px] mt-0.5">
                            {o.created_at} • Outlet {o.branch_id === 'kelapagading' ? 'Kelapa Gading' : 'Greenlake City'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {hasArrivedUnconfirmed && (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                              ⚠️ Paket Sampai • Belum Dikonfirmasi Customer
                            </span>
                          )}

                          <span
                            className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                              o.order_status === 'selesai'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : o.order_status === 'diproses'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : o.order_status === 'dikirim'
                                ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                : o.order_status === 'dibatalkan'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {o.order_status}
                          </span>
                        </div>
                      </div>

                      {/* Delivery Issue Alert Banner if customer reported issue */}
                      {o.delivery_issue_reported === 1 && (
                        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                          <span className="font-bold flex items-center gap-1.5 text-rose-700">
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                            Laporan Kendala Customer (Pesanan Belum Diterima)
                          </span>
                          <p className="text-rose-900 font-medium">&ldquo;{o.delivery_issue_notes}&rdquo;</p>
                          <span className="text-[10px] text-rose-500 block">
                            Dilaporkan pada: {o.delivery_issue_reported_at ? new Date(o.delivery_issue_reported_at).toLocaleString('id-ID') : '-'}
                          </span>
                        </div>
                      )}

                      {/* Customer & Delivery Summary */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Pelanggan:</span>
                          <p className="font-bold text-[#183F2E] mt-0.5">{o.customer_name}</p>
                          <p className="text-slate-500 font-mono">{o.customer_phone}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Pengiriman:</span>
                          <p className="font-semibold text-[#183F2E] mt-0.5">
                            {o.delivery_type === 'pickup' ? 'Ambil di Toko (Historis)' : 'Kurir Online'}
                          </p>
                          <p className="text-slate-500 truncate">{o.delivery_address || 'Kurir Online AMM'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Tagihan:</span>
                          <p className="font-mono font-black text-sm text-[#183F2E] mt-0.5">
                            Rp {o.total.toLocaleString('id-ID')} ({o.payment_status})
                          </p>
                        </div>
                      </div>

                      {/* Courier & Receipt Photo Info */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-[#8BC137]" />
                            <span className="font-bold text-[#183F2E]">
                              Kurir: {o.courier_name || 'Belum Dialokasikan'}
                            </span>
                            {o.courier_tracking_number && (
                              <span className="font-mono text-[#183F2E] bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
                                Resi: {o.courier_tracking_number}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3">
                            <span>Status Kurir: <strong className="text-slate-800">{o.courier_status || 'WAITING'}</strong></span>
                            {o.estimated_delivery_time && (
                              <span>Estimasi Tiba: <strong className="text-slate-800">{o.estimated_delivery_time}</strong></span>
                            )}
                          </div>

                          {/* Customer Confirmation Badge */}
                          {o.customer_confirmed_at ? (
                            <p className="text-[11px] text-emerald-700 font-semibold pt-1">
                              ✓ Dikonfirmasi diterima oleh: {o.confirmed_by_name || o.customer_name} ({new Date(o.customer_confirmed_at).toLocaleString('id-ID')})
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400 pt-1">
                              Status Konfirmasi: Menunggu konfirmasi penerimaan dari customer
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Receipt Photo Thumbnail if available */}
                          {o.receipt_photo_url && (
                            <div className="flex items-center gap-2">
                              <img
                                src={o.receipt_photo_url}
                                alt="Bukti Penerimaan"
                                className="w-11 h-11 object-cover rounded-xl border border-slate-200 cursor-pointer hover:scale-105 transition"
                                onClick={() =>
                                  setZoomImageUrl({
                                    url: o.receipt_photo_url,
                                    title: `Foto Bukti Penerimaan — ${o.order_number}`,
                                    subtitle: `Diunggah oleh pelanggan pada ${o.receipt_photo_uploaded_at ? new Date(o.receipt_photo_uploaded_at).toLocaleString('id-ID') : '-'}`,
                                  })
                                }
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setZoomImageUrl({
                                    url: o.receipt_photo_url,
                                    title: `Foto Bukti Penerimaan — ${o.order_number}`,
                                    subtitle: `Diunggah oleh pelanggan pada ${o.receipt_photo_uploaded_at ? new Date(o.receipt_photo_uploaded_at).toLocaleString('id-ID') : '-'}`,
                                  })
                                }
                                className="px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-bold transition"
                              >
                                Lihat Foto
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setCourierModalOrder(o)
                              setCourierForm({
                                courierName: o.courier_name || '',
                                courierTrackingNumber: o.courier_tracking_number || '',
                                courierStatus: o.courier_status || 'IN_TRANSIT',
                                estimatedDeliveryTime: o.estimated_delivery_time || '',
                              })
                            }}
                            className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
                          >
                            Edit Kurir
                          </button>
                        </div>
                      </div>

                      {/* Status Advancement & Correction Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-slate-400 text-[11px] font-semibold mr-1">Alur Operasional:</span>
                          {o.order_status === 'menunggu_pembayaran' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(o.id, 'diproses')}
                              className="px-4 py-2 rounded-full bg-[#FFD83D] hover:bg-[#fed121] text-[#183F2E] font-black cursor-pointer shadow-sm transition"
                            >
                              Mulai Diproses Kitchen
                            </button>
                          )}
                          {o.order_status === 'diproses' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(o.id, 'dikirim')}
                              className="px-4 py-2 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black cursor-pointer shadow-sm transition"
                            >
                              Serahkan ke Kurir
                            </button>
                          )}
                          {o.order_status === 'dikirim' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(o.id, 'selesai')}
                              className="px-4 py-2 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black cursor-pointer shadow-sm transition"
                            >
                              Tandai Selesai
                            </button>
                          )}
                          {o.order_status !== 'selesai' && o.order_status !== 'dibatalkan' && (
                            <button
                              onClick={() => {
                                setStatusCorrectionOrder(o)
                                setCorrectionTargetStatus('dibatalkan')
                                setCorrectionReason('')
                              }}
                              className="px-3.5 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition font-bold cursor-pointer"
                            >
                              Batalkan Pesanan
                            </button>
                          )}
                        </div>

                        {/* Audit-Logged Status Correction Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setStatusCorrectionOrder(o)
                            setCorrectionTargetStatus(o.order_status)
                            setCorrectionReason('')
                          }}
                          className="px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60 text-[11px] font-bold transition cursor-pointer"
                        >
                          Koreksi Status Manual...
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* MODULE 4: PRODUCTS & CUSTOMIZER RULES */}
        {activeModule === 'products' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-[#183F2E]">Menu & Aturan Bumbu</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Atur harga produk, bumbu rujak, dan batasan pilihan ukuran Personal, Sharing, Mega.
                </p>
              </div>
            </div>

            {/* Customization Rules Editor */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold text-[#183F2E] uppercase tracking-wider pb-2 border-b border-slate-100">
                Aturan Bumbu Berdasarkan Ukuran Porsi
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                {productsData.customizationRules?.map((rule: any) => (
                  <div key={rule.size_code} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-[#183F2E]">{rule.size_code}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                        {rule.allowed_seasoning_count} Bumbu Termasuk
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">{rule.description}</p>
                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Boleh Duplikat:</span>
                      <span className="font-bold text-slate-700">
                        {rule.allow_duplicates ? 'Ya (Maks ' + rule.max_duplicates + ')' : 'Tidak'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Product Catalog List with Inline Availability Controls & Filter */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-[#183F2E]">
                    Daftar Produk ({productsData.products?.length || 0} menu)
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Kelola detail menu, foto, harga varian, promo, dan ketersediaan etalase.
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Cari nama menu / kategori..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-full pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#8BC137]/30 focus:border-[#8BC137]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSeasoningManager(true)}
                    className="px-4 py-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-extrabold text-xs flex items-center gap-1.5 shadow-sm flex-shrink-0 transition"
                  >
                    <Layers className="w-4 h-4 text-amber-700" /> Kelola Master Bumbu ({seasoningsList.length})
                  </button>

                  <button
                    type="button"
                    onClick={handleAddNewProduct}
                    className="px-4 py-2 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black text-xs flex items-center gap-1.5 shadow-sm flex-shrink-0 transition"
                  >
                    <Plus className="w-4 h-4" /> Tambah Menu Baru
                  </button>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'ALL', label: 'Semua Status' },
                  { id: 'AVAILABLE', label: '🟢 Tersedia' },
                  { id: 'OUT_OF_STOCK', label: '🔴 Habis' },
                  { id: 'TEMP_UNAVAILABLE', label: '🟠 Tidak Tersedia Sementara' },
                  { id: 'HIDDEN', label: '⚪ Disembunyikan' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setProductFilter(f.id)}
                    className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer text-xs ${
                      productFilter === f.id
                        ? 'bg-[#8BC137] text-[#183F2E] shadow-sm font-black'
                        : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Product Rows */}
              <div className="divide-y divide-slate-100 text-xs">
                {(() => {
                  const filtered = (productsData.products || []).filter((p: any) => {
                    const status = p.availability_status || (p.is_available ? 'AVAILABLE' : 'OUT_OF_STOCK')
                    const matchesFilter = productFilter === 'ALL' || status === productFilter
                    const matchesSearch =
                      !productSearch ||
                      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                      p.category_id?.toLowerCase().includes(productSearch.toLowerCase())
                    return matchesFilter && matchesSearch
                  })

                  if (filtered.length === 0) {
                    return (
                      <p className="text-slate-400 text-center py-6">
                        Tidak ada produk yang cocok dengan filter atau pencarian saat ini.
                      </p>
                    )
                  }

                  return filtered.map((p: any) => {
                    const currentStatus = p.availability_status || (p.is_available ? 'AVAILABLE' : 'OUT_OF_STOCK')

                    return (
                      <div key={p.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={p.image_url || '/menu-photos/rujak-buah-personal.webp'}
                            alt={p.name}
                            className="w-12 h-12 rounded-2xl object-cover bg-slate-100 flex-shrink-0 border border-slate-100 shadow-sm"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-[#183F2E] truncate">{p.name}</h4>
                              {p.is_signature === 1 && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#FFD83D]/30 text-amber-900">
                                  Signature
                                </span>
                              )}
                              {p.is_bestseller === 1 && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-100 text-rose-700">
                                  Terlaris
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400 uppercase font-semibold">{p.category_id}</span>
                              <span className="text-[11px] font-mono text-[#183F2E] font-black">
                                Rp {p.base_price.toLocaleString('id-ID')}
                              </span>
                              {p.promo_price && (
                                <span className="text-[10px] font-mono text-emerald-600 font-bold">
                                  (Promo: Rp {Number(p.promo_price).toLocaleString('id-ID')})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions: Inline Status Dropdown & Edit & Archive */}
                        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                          <select
                            value={currentStatus}
                            onChange={(e) => handleQuickAvailability(p.id, e.target.value)}
                            className={`border text-xs rounded-full px-3 py-1.5 font-bold outline-none cursor-pointer transition ${
                              currentStatus === 'AVAILABLE'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : currentStatus === 'OUT_OF_STOCK'
                                ? 'bg-rose-50 border-rose-200 text-rose-800'
                                : currentStatus === 'TEMP_UNAVAILABLE'
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-slate-100 border-slate-200 text-slate-600'
                            }`}
                          >
                            <option value="AVAILABLE">🟢 Tersedia (Bisa Dipesan)</option>
                            <option value="OUT_OF_STOCK">🔴 Habis (Tampil, Tak Bisa Dibeli)</option>
                            <option value="TEMP_UNAVAILABLE">🟠 Tidak Tersedia Sementara</option>
                            <option value="HIDDEN">⚪ Disembunyikan dari Web</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleEditProductClick(p)}
                            className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition"
                            title="Edit Menu Lengkap"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                            <span className="hidden sm:inline">Edit Menu</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleArchiveProduct(p.id, p.name)}
                            className="p-1.5 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition"
                            title="Arsipkan / Sembunyikan Menu"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          </div>
        )}

        {/* MODULE 5: OUTLET SCHEDULES & STORE STATUS */}
        {activeModule === 'outlets' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-[#183F2E]">Jadwal Operasional Outlet & Status Toko</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kontrol status buka/tutup toko nasional, jam per-cabang (WIB), dan hari libur operasional.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddExceptionModal(true)}
                className="px-4 py-2.5 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black text-xs flex items-center gap-1.5 shadow-sm transition flex-shrink-0"
              >
                <Plus className="w-4 h-4" /> Tambah Libur / Jadwal Khusus
              </button>
            </div>

            {/* Global Store Status Switch & Announcement Banner */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${
                      storeStatus === 'OPEN' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-[#183F2E]">Status Operasional Toko Nasional</h3>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          storeStatus === 'OPEN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800 animate-pulse'
                        }`}
                      >
                        {storeStatus === 'OPEN' ? '🟢 Buka Normal' : '🟠 Tutup Sementara'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {storeStatus === 'OPEN'
                        ? 'Website menerima pesanan pelanggan secara normal mengikuti jam buka outlet.'
                        : 'Checkout dikunci sementara dengan peringatan halus di keranjang belanja.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleStoreStatus}
                  className={`px-5 py-2.5 rounded-full font-black text-xs transition shadow-sm ${
                    storeStatus === 'OPEN'
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  {storeStatus === 'OPEN' ? 'Ubah ke Tutup Sementara' : 'Buka Toko Kembali'}
                </button>
              </div>

              {/* Store Announcement Editor */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Pesan Pengumuman Toko (Muncul di Header & Halaman Keranjang):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={storeAnnouncement}
                    onChange={(e) => setStoreAnnouncement(e.target.value)}
                    placeholder="Contoh: Toko sedang istirahat sejenak untuk persiapan bahan segar, buka kembali pukul 13:00 WIB."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-[#8BC137]/30 focus:border-[#8BC137]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveStoreAnnouncement}
                    className="px-5 py-2.5 rounded-2xl bg-[#183F2E] hover:bg-[#20523d] text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" /> Simpan Pengumuman
                  </button>
                </div>
              </div>
            </div>

            {/* Weekly Outlet Schedules */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[
                { id: 'greenlake', name: 'Greenlake City (Tangerang)', defOpen: '09:00', defClose: '20:00' },
                { id: 'kelapagading', name: 'Kelapa Gading (Jakarta Utara)', defOpen: '10:00', defClose: '21:00' },
              ].map((branch) => {
                const daysList = [
                  { day: 1, label: 'Senin' },
                  { day: 2, label: 'Selasa' },
                  { day: 3, label: 'Rabu' },
                  { day: 4, label: 'Kamis' },
                  { day: 5, label: 'Jumat' },
                  { day: 6, label: 'Sabtu' },
                  { day: 0, label: 'Minggu' },
                ]

                return (
                  <div key={branch.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="font-extrabold text-sm text-[#183F2E]">{branch.name}</h3>
                        <span className="text-[10px] text-slate-400">Jam Operasional Reguler Mingguan</span>
                      </div>
                      <span className="text-[10px] font-black px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                        WIB (Asia/Jakarta)
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 text-xs">
                      {daysList.map((d) => {
                        const sched = (settingsData.schedules || []).find(
                          (s: any) => s.branch_id === branch.id && Number(s.day_of_week) === d.day
                        ) || {
                          branch_id: branch.id,
                          day_of_week: d.day,
                          open_time: branch.defOpen,
                          close_time: branch.defClose,
                          is_closed: 0,
                        }

                        const isClosed = Boolean(sched.is_closed)

                        return (
                          <div key={d.day} className="py-2.5 flex items-center justify-between gap-2">
                            <div className="w-20 font-bold text-slate-700">{d.label}</div>

                            <div className="flex items-center gap-2">
                              {isClosed ? (
                                <span className="text-[11px] font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                                  Tutup / Libur
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5 font-mono text-xs">
                                  <input
                                    type="time"
                                    defaultValue={sched.open_time || branch.defOpen}
                                    onBlur={(e) => {
                                      handleSaveSchedule({
                                        ...sched,
                                        open_time: e.target.value,
                                      })
                                    }}
                                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 text-xs"
                                  />
                                  <span className="text-slate-400">-</span>
                                  <input
                                    type="time"
                                    defaultValue={sched.close_time || branch.defClose}
                                    onBlur={(e) => {
                                      handleSaveSchedule({
                                        ...sched,
                                        close_time: e.target.value,
                                      })
                                    }}
                                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 text-xs"
                                  />
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                handleSaveSchedule({
                                  ...sched,
                                  is_closed: isClosed ? 0 : 1,
                                })
                              }}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition ${
                                isClosed
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                              }`}
                            >
                              {isClosed ? 'Buka Hari Ini' : 'Tutup Hari Ini'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Holiday & Schedule Exceptions Section */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-sm text-[#183F2E]">
                    Pengecualian Jadwal & Hari Libur Khusus ({settingsData.exceptions?.length || 0})
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Daftar tanggal khusus di mana outlet libur atau menerapkan jam operasional berbeda.
                  </span>
                </div>
              </div>

              {(!settingsData.exceptions || settingsData.exceptions.length === 0) ? (
                <div className="text-center py-8 text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  Belum ada jadwal pengecualian / libur khusus.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {settingsData.exceptions.map((exc: any) => (
                    <div key={exc.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{exc.date}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                            {exc.branch_id === 'greenlake' ? 'Greenlake City' : 'Kelapa Gading'}
                          </span>
                          {exc.is_closed ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                              Libur Seharian
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                              Jam Khusus: {exc.open_time} - {exc.close_time}
                            </span>
                          )}
                        </div>
                        {exc.reason && <p className="text-slate-500 text-[11px] italic">&ldquo;{exc.reason}&rdquo;</p>}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteException(exc.id)}
                        className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
                        title="Hapus Pengecualian"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODULE 6: VOUCHERS */}
        {activeModule === 'vouchers' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-[#183F2E]">Voucher & Kode Promo</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola kupon diskon persentase dan potongan harga nominal.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {vouchers.map((v) => (
                <div key={v.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-mono font-black text-base text-[#183F2E]">{v.code}</span>
                    <span
                      className={`text-[10px] px-3 py-1 rounded-full font-extrabold ${
                        v.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {v.is_active ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="text-slate-800">
                      Diskon:{' '}
                      <strong>
                        {v.discount_type === 'PERCENT'
                          ? `${v.discount_value}% (Maks Rp ${v.max_discount.toLocaleString('id-ID')})`
                          : `Rp ${v.discount_value.toLocaleString('id-ID')}`}
                      </strong>
                    </p>
                    <p className="text-slate-500">Min. Belanja: Rp {v.min_spend.toLocaleString('id-ID')}</p>
                    <p className="text-slate-500">
                      Terpakai: {v.times_used} / {v.usage_limit} kali
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODULE 7: MEMBERSHIP */}
        {activeModule === 'membership' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-[#183F2E]">Membership & Poin Pelanggan</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Penyesuaian poin manual dengan catatan audit wajib.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-[#183F2E] pb-2 border-b border-slate-100">
                Pemberian Poin Manual (Customer Service Adjustment)
              </h3>
              <form onSubmit={handleAdjustPoints} className="space-y-4 text-xs max-w-md">
                <div>
                  <label className="text-slate-700 block mb-1 font-bold">Customer ID / Nomor Telepon</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: cust_demo_01"
                    onChange={(e) => setAdjustPointsCustomer({ id: e.target.value })}
                    className="w-full rounded-2xl p-3 bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#8BC137]/30 focus:border-[#8BC137]"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-bold">Jumlah Poin (+ untuk tambah, - untuk kurangi)</label>
                  <input
                    type="number"
                    required
                    value={pointsDelta}
                    onChange={(e) => setPointsDelta(Number(e.target.value))}
                    className="w-full rounded-2xl p-3 bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#8BC137]/30 focus:border-[#8BC137]"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-bold">Alasan Penyesuaian (Wajib Audit Log)</label>
                  <textarea
                    rows={2}
                    required
                    value={pointsReason}
                    onChange={(e) => setPointsReason(e.target.value)}
                    placeholder="Contoh: Kompensasi keterlambatan pengiriman pesanan AMM-2026..."
                    className="w-full rounded-2xl p-3 bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#8BC137]/30 focus:border-[#8BC137]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black text-xs shadow-sm transition"
                >
                  Simpan Penyesuaian Poin
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODULE 8: REVIEWS & SUPPORT */}
        {activeModule === 'reviews' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-[#183F2E]">Ulasan Pembeli & Tiket Bantuan</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Moderasi feedback pelanggan terverifikasi dan keluhan layanan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Reviews Moderation Panel */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-extrabold text-[#183F2E] flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-400 fill-current" /> Moderasi Ulasan Masuk ({reviews.length})
                  </h3>
                  <div className="relative w-full sm:w-48">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={reviewSearchQuery}
                      onChange={(e) => {
                        setReviewSearchQuery(e.target.value)
                        fetchReviews(reviewFilterRating, reviewFilterStatus, e.target.value)
                      }}
                      placeholder="Cari ulasan..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-full pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none"
                    />
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Rating:</span>
                    {[
                      { id: 'all', label: 'Semua' },
                      { id: '5', label: '⭐ 5' },
                      { id: '4', label: '⭐ 4' },
                      { id: '3', label: '⭐ 3' },
                      { id: '2', label: '⭐ 2' },
                      { id: '1', label: '⭐ 1' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setReviewFilterRating(f.id)
                          fetchReviews(f.id, reviewFilterStatus, reviewSearchQuery)
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                          reviewFilterRating === f.id
                            ? 'bg-amber-400 text-[#183F2E] shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Status:</span>
                    {[
                      { id: 'all', label: 'Semua' },
                      { id: 'published', label: '🟢 Tayang di Homepage' },
                      { id: 'hidden', label: '⚪ Disembunyikan' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setReviewFilterStatus(f.id)
                          fetchReviews(reviewFilterRating, f.id, reviewSearchQuery)
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                          reviewFilterStatus === f.id
                            ? 'bg-[#183F2E] text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reviews List */}
                <div className="space-y-3 text-xs max-h-[550px] overflow-y-auto pr-1">
                  {reviews.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      Tidak ada ulasan yang sesuai filter.
                    </div>
                  ) : (
                    reviews.map((r) => (
                      <div
                        key={r.id}
                        className={`p-4 rounded-2xl border transition space-y-2.5 ${
                          r.is_featured === 1
                            ? 'bg-amber-50/50 border-amber-200 shadow-sm'
                            : r.is_published === 1
                            ? 'bg-white border-slate-200'
                            : 'bg-slate-50/70 border-slate-200/80 opacity-70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-[#183F2E]">{r.customer_name}</span>
                              {r.order_id && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  #{r.order_id.slice(-6)}
                                </span>
                              )}
                            </div>
                            <div className="flex text-amber-400 mt-0.5">
                              {[...Array(Number(r.rating) || 5)].map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-current" />
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {r.is_featured === 1 && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 fill-current" /> Sorotan
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                r.is_published === 1
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {r.is_published === 1 ? '🟢 Tayang Web' : '⚪ Disembunyikan'}
                            </span>
                          </div>
                        </div>

                        <p className="text-slate-700 italic bg-white/70 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                          &ldquo;{r.comment}&rdquo;
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                          <span className="text-[10px] text-slate-400">{r.created_at}</span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleFeaturedReview(r.id, r.is_featured || 0)}
                              className={`px-2.5 py-1 rounded-full font-bold transition flex items-center gap-1 ${
                                r.is_featured === 1
                                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              <Star className="w-3 h-3" /> {r.is_featured === 1 ? 'Batal Sorot' : 'Sorot'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleTogglePublishReview(r.id, r.is_published)}
                              className={`px-2.5 py-1 rounded-full font-bold transition ${
                                r.is_published === 1
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {r.is_published === 1 ? 'Sembunyikan' : 'Tampilkan di Web'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Support Tickets */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-[#183F2E] pb-2 border-b border-slate-100 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-[#8BC137]" /> Tiket Keluhan Pelanggan ({tickets.length})
                </h3>
                <div className="space-y-3 text-xs max-h-[500px] overflow-y-auto">
                  {tickets.map((t) => (
                    <div key={t.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#183F2E]">
                          {t.customer_name} ({t.customer_phone})
                        </span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                          {t.status}
                        </span>
                      </div>
                      <p className="text-slate-700">{t.description}</p>
                      <p className="text-[10px] text-slate-400">{t.created_at}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 9: REPORTS & EXPORTS */}
        {activeModule === 'reports' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-[#183F2E]">Laporan Penjualan & Ekspor Data</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Download laporan resmi pembukuan AMM dalam format CSV, Excel (XLSX), atau PDF.
                </p>
              </div>

              {/* Export Buttons */}
              <div className="flex gap-2">
                <a
                  href="/api/admin/reports/export?format=csv"
                  download
                  className="px-4 py-2.5 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black text-xs shadow-sm transition inline-flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Unduh CSV
                </a>
                <a
                  href="/api/admin/reports/export?format=xlsx"
                  download
                  className="px-4 py-2.5 rounded-full bg-[#FFD83D] hover:bg-[#fed121] text-[#183F2E] font-black text-xs shadow-sm transition inline-flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Unduh Excel
                </a>
                <a
                  href="/api/admin/reports/export?format=html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-4 h-4" /> Cetak PDF
                </a>
              </div>
            </div>

            {/* Reconciliation KPI Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Gross Sales</span>
                <div className="text-xl font-black font-mono text-[#183F2E]">
                  Rp {(reportSummary?.grossSales || 0).toLocaleString('id-ID')}
                </div>
              </div>
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Diskon Promo</span>
                <div className="text-xl font-black font-mono text-rose-600">
                  -Rp {(reportSummary?.totalDiscounts || 0).toLocaleString('id-ID')}
                </div>
              </div>
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Ongkir Kurir</span>
                <div className="text-xl font-black font-mono text-slate-700">
                  Rp {(reportSummary?.totalShippingFees || 0).toLocaleString('id-ID')}
                </div>
              </div>
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Lunas</span>
                <div className="text-xl font-black font-mono text-emerald-700">
                  Rp {(reportSummary?.verifiedRevenue || 0).toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 10: SETTINGS */}
        {activeModule === 'settings' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-[#183F2E]">Pengaturan Brand & Konfigurasi Bisnis</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Atur identitas merek, rekening bank pembayaran, WhatsApp, dan biaya gift.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6 max-w-2xl text-xs">
              <div>
                <h3 className="font-extrabold text-sm text-[#183F2E] pb-2 border-b border-slate-100 mb-3">
                  Nomor Kontak WhatsApp Resmi
                </h3>
                <input
                  type="text"
                  defaultValue={settingsData.settings?.whatsapp_order || '628118281220'}
                  onBlur={(e) => handleSaveSetting('whatsapp_order', e.target.value)}
                  className="w-full rounded-2xl p-3 bg-slate-50 border border-slate-200 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#8BC137]/30 focus:border-[#8BC137]"
                />
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-[#183F2E] pb-2 border-b border-slate-100 mb-3">
                  Biaya Kemasan & Kartu Gift Merem Melek
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-600 block mb-1 font-bold">Biaya Packaging Box (IDR)</label>
                    <input
                      type="number"
                      defaultValue={settingsData.settings?.gift_packaging_fee || 15000}
                      onBlur={(e) => handleSaveSetting('gift_packaging_fee', e.target.value)}
                      className="w-full rounded-2xl p-3 bg-slate-50 border border-slate-200 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#8BC137]/30 focus:border-[#8BC137]"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1 font-bold">Biaya Kartu Ucapan (IDR)</label>
                    <input
                      type="number"
                      defaultValue={settingsData.settings?.greeting_card_fee || 5000}
                      onBlur={(e) => handleSaveSetting('greeting_card_fee', e.target.value)}
                      className="w-full rounded-2xl p-3 bg-slate-50 border border-slate-200 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#8BC137]/30 focus:border-[#8BC137]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Proof Viewer Zoom Modal */}
      {selectedProofOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-[#183F2E]">
                  Bukti Transfer: {selectedProofOrder.order_number}
                </h3>
                <span className="text-[11px] text-slate-500">{selectedProofOrder.customer_name}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProofOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto rounded-2xl bg-slate-50 p-2 flex items-center justify-center border border-slate-100">
              <img
                src={selectedProofOrder.payment?.proof_image_path}
                alt="Full Proof"
                className="max-h-[60vh] object-contain rounded-xl"
              />
            </div>

            <div className="flex justify-between items-center text-xs pt-2">
              <div>
                <span className="text-slate-500 block text-[11px]">Total Tagihan:</span>
                <span className="font-mono font-black text-base text-[#183F2E]">
                  Rp {selectedProofOrder.total.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOrder(selectedProofOrder)}
                  className="px-4 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition"
                >
                  Tolak...
                </button>
                <button
                  type="button"
                  onClick={() => handleApprovePayment(selectedProofOrder.id)}
                  className="px-5 py-2 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black text-xs shadow-sm transition"
                >
                  Setujui Pembayaran
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Tolak Bukti Pembayaran
              </h3>
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-600">
              Alasan penolakan bersifat wajib dan akan ditampilkan kepada pelanggan untuk perbaikan upload ulang.
            </p>
            <textarea
              rows={3}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Contoh: Nominal transfer tidak sesuai / screenshot buram / rekening tujuan salah."
              className="w-full rounded-2xl p-3 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRejectPayment}
                className="px-5 py-2 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold transition shadow-sm"
              >
                Kirim Penolakan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zoom / Lightbox Modal */}
      {zoomImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-[#183F2E]">{zoomImageUrl.title}</h3>
                {zoomImageUrl.subtitle && (
                  <p className="text-[11px] text-slate-500 mt-0.5">{zoomImageUrl.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setZoomImageUrl(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto rounded-2xl bg-slate-900/5 p-2 flex items-center justify-center border border-slate-100">
              <img
                src={zoomImageUrl.url}
                alt={zoomImageUrl.title}
                className="max-h-[65vh] max-w-full object-contain rounded-xl"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setZoomImageUrl(null)}
                className="px-5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Correction Modal (Audit-Logged) */}
      {statusCorrectionOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-[#183F2E] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#8BC137]" /> Koreksi Status Pesanan
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  {statusCorrectionOrder.order_number}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStatusCorrectionOrder(null)
                  setCorrectionFieldError('')
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" /> Tindakan Tercatat dalam Audit Log
              </p>
              <p className="text-amber-800/90 leading-relaxed">
                Perubahan status manual akan terekam permanen di riwayat audit admin beserta identitas dan alasan koreksi Anda.
              </p>
            </div>

            <form onSubmit={handlePerformStatusCorrection} className="space-y-4">
              <div>
                <label className="text-slate-700 block mb-1 font-bold">Target Status Baru</label>
                <select
                  value={correctionTargetStatus}
                  onChange={(e) => setCorrectionTargetStatus(e.target.value)}
                  className="w-full rounded-2xl p-3 bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#8BC137]/30 focus:border-[#8BC137]"
                >
                  <option value="menunggu_pembayaran">Menunggu Pembayaran</option>
                  <option value="pembayaran_diverifikasi">Pembayaran Diverifikasi</option>
                  <option value="diproses">Sedang Diproses (Dapur)</option>
                  <option value="siap_dikirim">Siap Dikirim</option>
                  <option value="dikirim">Sedang Dikirim (Kurir)</option>
                  <option value="sampai_tujuan">Sampai di Lokasi Tujuan</option>
                  <option value="selesai">Selesai (Pesanan Tuntas)</option>
                  <option value="dibatalkan">Dibatalkan</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-bold">
                  Alasan Koreksi <span className="text-rose-500">* (Wajib, min. 5 karakter)</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={correctionReason}
                  onChange={(e) => {
                    setCorrectionReason(e.target.value)
                    if (e.target.value.trim().length >= 5) {
                      setCorrectionFieldError('')
                    }
                  }}
                  placeholder="Contoh: Customer mengonfirmasi pesanan sudah diterima melalui WhatsApp / kendala teknis kurir..."
                  className={`w-full rounded-2xl p-3 bg-slate-50 border text-slate-800 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 transition ${
                    correctionFieldError
                      ? 'border-rose-400 focus:ring-rose-500/20'
                      : 'border-slate-200 focus:ring-[#8BC137]/30 focus:border-[#8BC137]'
                  }`}
                />
                <div className="flex items-center justify-between text-[11px] mt-1.5">
                  <span
                    className={`font-semibold ${
                      correctionReason.trim().length < 5 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    {correctionReason.trim().length} / 5 karakter minimum
                  </span>
                  {correctionReason.trim().length >= 5 && (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      ✓ Memenuhi syarat audit
                    </span>
                  )}
                </div>
                {correctionFieldError && (
                  <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {correctionFieldError}
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStatusCorrectionOrder(null)
                    setCorrectionFieldError('')
                  }}
                  className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={correctionLoading || correctionReason.trim().length < 5}
                  className="px-5 py-2.5 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-extrabold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  {correctionLoading ? 'Menyimpan...' : 'Simpan Koreksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Courier Edit Modal */}
      {courierModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-[#183F2E] flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#8BC137]" /> Update Informasi Kurir
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  {courierModalOrder.order_number}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCourierModalOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCourierInfo} className="space-y-3.5">
              <div>
                <label className="text-slate-700 block mb-1 font-bold">Nama Layanan Kurir</label>
                <input
                  type="text"
                  placeholder="Contoh: Gosend Instant, GrabExpress, Kurir AMM"
                  value={courierForm.courierName}
                  onChange={(e) => setCourierForm({ ...courierForm, courierName: e.target.value })}
                  className="w-full rounded-2xl p-3 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8BC137]/30 focus:border-[#8BC137]"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-bold">Nomor Resi / AWB / No. Telepon Kurir</label>
                <input
                  type="text"
                  placeholder="Contoh: GK-889102391 / 0812-9988-7766"
                  value={courierForm.courierTrackingNumber}
                  onChange={(e) => setCourierForm({ ...courierForm, courierTrackingNumber: e.target.value })}
                  className="w-full rounded-2xl p-3 bg-slate-50 border border-slate-200 text-slate-800 font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8BC137]/30 focus:border-[#8BC137]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 block mb-1 font-bold">Status Pengiriman</label>
                  <select
                    value={courierForm.courierStatus}
                    onChange={(e) => setCourierForm({ ...courierForm, courierStatus: e.target.value })}
                    className="w-full rounded-2xl p-3 bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#8BC137]/30 focus:border-[#8BC137]"
                  >
                    <option value="SEARCHING">Mencari Kurir</option>
                    <option value="PICKED_UP">Pesanan Diambil</option>
                    <option value="IN_TRANSIT">Dalam Pengantaran</option>
                    <option value="DELIVERED">Tiba di Lokasi</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-bold">Estimasi Tiba</label>
                  <input
                    type="text"
                    placeholder="Contoh: 30-45 mnt / 15:30 WIB"
                    value={courierForm.estimatedDeliveryTime}
                    onChange={(e) => setCourierForm({ ...courierForm, estimatedDeliveryTime: e.target.value })}
                    className="w-full rounded-2xl p-3 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8BC137]/30 focus:border-[#8BC137]"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setCourierModalOrder(null)}
                  className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-extrabold transition shadow-sm"
                >
                  Simpan Info Kurir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7-TAB PRODUCT EDITOR MODAL */}
      {editProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto text-slate-800">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#183F2E] flex items-center gap-2">
                    {editProductModal.id ? 'Edit Menu: ' : 'Tambah Menu Baru: '}
                    <span className="text-emerald-700 truncate max-w-[240px] sm:max-w-md">
                      {editProductModal.name || 'Menu Baru'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Konfigurasi 7 dimensi produk: informasi dasar, galeri, harga, opsi, stok, promosi, dan SEO.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditProductModal(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 7-Tab Navigation Bar */}
            <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 bg-slate-50 border-b border-slate-100 overflow-x-auto scrollbar-none text-xs font-bold">
              {[
                { id: 'basic', label: '1. Info Dasar', icon: FileText },
                { id: 'images', label: '2. Foto & Galeri', icon: ImageIcon },
                { id: 'pricing', label: '3. Harga & Promo', icon: DollarSign },
                { id: 'options', label: '4. Ukuran & Bumbu', icon: Layers },
                { id: 'stock', label: '5. Stok & Status', icon: Package },
                { id: 'promotion', label: '6. Mood & Promosi', icon: Sparkles },
                { id: 'seo', label: '7. SEO Google', icon: Globe },
              ].map((tab) => {
                const Icon = tab.icon
                const isActive = editorActiveTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setEditorActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full transition whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? 'bg-[#8BC137] text-[#183F2E] shadow-sm font-black'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Form Content Body */}
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* TAB 1: BASIC DETAILS */}
              {editorActiveTab === 'basic' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-white/80 block mb-1">
                        Nama Produk <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editProductModal.name || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          const autoSlug = val
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-|-$/g, '')
                          setEditProductModal({
                            ...editProductModal,
                            name: val,
                            slug: editProductModal.slug ? editProductModal.slug : autoSlug,
                          })
                        }}
                        placeholder="Contoh: Rujak Merem Melek Personal"
                        className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm font-medium focus:border-[#8BC137] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-white/80 block mb-1">Kategori</label>
                      <select
                        value={editProductModal.category_id || 'asinan'}
                        onChange={(e) => setEditProductModal({ ...editProductModal, category_id: e.target.value })}
                        className="w-full rounded-xl p-3 bg-[#0d2e20] border border-white/10 text-white text-sm font-medium outline-none focus:border-[#8BC137]"
                      >
                        <option value="asinan">Asinan Buah Segar</option>
                        <option value="rujak">Rujak Buah Segar</option>
                        <option value="minuman">Minuman Tropis</option>
                        <option value="tambahan">Ekstra Bumbu & Kerupuk</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-white/80 block mb-1">SKU Produk</label>
                      <input
                        type="text"
                        value={editProductModal.sku || ''}
                        onChange={(e) => setEditProductModal({ ...editProductModal, sku: e.target.value })}
                        placeholder="AMM-RJK-01"
                        className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white font-mono placeholder:text-white/30 text-sm outline-none focus:border-[#8BC137]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-white/80 block mb-1">Slug URL</label>
                      <div className="flex items-center rounded-xl bg-white/5 border border-white/10 overflow-hidden text-sm">
                        <span className="px-3 py-3 text-white/40 bg-white/5 font-mono text-xs">/menu/</span>
                        <input
                          type="text"
                          value={editProductModal.slug || ''}
                          onChange={(e) => setEditProductModal({ ...editProductModal, slug: e.target.value })}
                          placeholder="rujak-merem-melek-personal"
                          className="flex-1 bg-transparent p-3 text-white font-mono placeholder:text-white/30 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-white/80 block mb-1">
                      Deskripsi Singkat (Katalog & Banner)
                    </label>
                    <input
                      type="text"
                      value={editProductModal.short_description || ''}
                      onChange={(e) => setEditProductModal({ ...editProductModal, short_description: e.target.value })}
                      placeholder="1-2 kalimat ringkas untuk kartu produk di etalase"
                      className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm outline-none focus:border-[#8BC137]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-white/80 block mb-1">
                      Deskripsi Lengkap (Komposisi & Penyajian)
                    </label>
                    <textarea
                      rows={3}
                      value={editProductModal.full_description || editProductModal.description || ''}
                      onChange={(e) =>
                        setEditProductModal({
                          ...editProductModal,
                          full_description: e.target.value,
                          description: e.target.value,
                        })
                      }
                      placeholder="Jelaskan perpaduan buah segar, varian bumbu, cara konsumsi, dan daya tahan..."
                      className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm outline-none focus:border-[#8BC137]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="text-xs font-bold text-white/80 block mb-1">Urutan Tampilan</label>
                      <input
                        type="number"
                        min="1"
                        value={editProductModal.display_order ?? 1}
                        onChange={(e) =>
                          setEditProductModal({ ...editProductModal, display_order: Number(e.target.value) })
                        }
                        className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white font-mono text-sm outline-none focus:border-[#8BC137]"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center gap-4 pt-4 sm:pt-6">
                      <label className="flex items-center gap-2 cursor-pointer bg-white/5 border border-white/10 px-3.5 py-2.5 rounded-xl hover:bg-white/10 transition">
                        <input
                          type="checkbox"
                          checked={Boolean(editProductModal.is_signature)}
                          onChange={(e) =>
                            setEditProductModal({ ...editProductModal, is_signature: e.target.checked })
                          }
                          className="accent-[#FFD83D] w-4 h-4 rounded"
                        />
                        <span className="text-xs font-bold text-white">⭐ Menu Signature AMM</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer bg-white/5 border border-white/10 px-3.5 py-2.5 rounded-xl hover:bg-white/10 transition">
                        <input
                          type="checkbox"
                          checked={Boolean(editProductModal.is_bestseller)}
                          onChange={(e) =>
                            setEditProductModal({ ...editProductModal, is_bestseller: e.target.checked })
                          }
                          className="accent-[#FF5954] w-4 h-4 rounded"
                        />
                        <span className="text-xs font-bold text-white">🔥 Menu Terlaris</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: IMAGERY & GALLERY */}
              {editorActiveTab === 'images' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Main Photo Section */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[#8BC137]" /> Foto Utama Produk
                    </h4>

                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      <div className="relative group w-36 h-36 rounded-2xl overflow-hidden bg-black/40 border border-white/15 flex-shrink-0 flex items-center justify-center">
                        <img
                          src={editProductModal.image_url || '/menu-photos/rujak-buah-personal.webp'}
                          alt={editProductModal.name || 'Produk'}
                          className="w-full h-full object-cover"
                        />
                        {uploadingProductPhoto && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold">
                            Mengunggah...
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 flex-1 w-full">
                        <div>
                          <label className="text-xs font-bold text-white/80 block mb-1">
                            Unggah Foto Utama (JPG, PNG, WebP maks 5MB)
                          </label>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleUploadProductImage(file, false)
                            }}
                            className="block w-full text-xs text-white/70 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#8BC137] file:text-[#183F2E] hover:file:bg-[#7ab02d] cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-white/80 block mb-1">Atau URL Foto Langsung</label>
                          <input
                            type="text"
                            value={editProductModal.image_url || ''}
                            onChange={(e) => setEditProductModal({ ...editProductModal, image_url: e.target.value })}
                            placeholder="/menu-photos/rujak-buah-personal.webp"
                            className="w-full rounded-xl p-2.5 bg-white/5 border border-white/10 text-white font-mono text-xs outline-none focus:border-[#8BC137]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Image Gallery */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-black text-white flex items-center gap-2">
                          <Layers className="w-4 h-4 text-[#FFD83D]" /> Galeri Foto Pendukung
                        </h4>
                        <p className="text-xs text-white/50">Foto sudut lain, porsi, atau kemasan yang tampil pada halaman detail.</p>
                      </div>
                      <label className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Tambah Foto Galeri</span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleUploadProductImage(file, true)
                          }}
                        />
                      </label>
                    </div>

                    {(!editProductModal.gallery_images || editProductModal.gallery_images.length === 0) ? (
                      <p className="text-xs text-white/40 italic py-4 text-center border border-dashed border-white/10 rounded-xl">
                        Belum ada foto galeri pendukung. Klik tombol di atas untuk menambah foto.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {editProductModal.gallery_images.map((img: any, idx: number) => {
                          const url = typeof img === 'string' ? img : img.url
                          const alt = typeof img === 'string' ? '' : img.alt
                          return (
                            <div key={idx} className="relative group rounded-xl bg-black/40 border border-white/10 p-2 space-y-2">
                              <img src={url} alt={alt || 'Galeri'} className="w-full h-24 rounded-lg object-cover" />
                              <input
                                type="text"
                                placeholder="Teks Alt Foto"
                                value={alt || ''}
                                onChange={(e) => {
                                  const updated = [...editProductModal.gallery_images]
                                  updated[idx] = { url, alt: e.target.value }
                                  setEditProductModal({ ...editProductModal, gallery_images: updated })
                                }}
                                className="w-full text-[11px] p-1.5 rounded-lg bg-white/5 border border-white/10 text-white outline-none"
                              />
                              <div className="flex items-center justify-between pt-1">
                                <div className="flex gap-1">
                                  {idx > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...editProductModal.gallery_images]
                                        const temp = updated[idx]
                                        updated[idx] = updated[idx - 1]
                                        updated[idx - 1] = temp
                                        setEditProductModal({ ...editProductModal, gallery_images: updated })
                                      }}
                                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/70 text-[10px]"
                                    >
                                      ◀
                                    </button>
                                  )}
                                  {idx < editProductModal.gallery_images.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...editProductModal.gallery_images]
                                        const temp = updated[idx]
                                        updated[idx] = updated[idx + 1]
                                        updated[idx + 1] = temp
                                        setEditProductModal({ ...editProductModal, gallery_images: updated })
                                      }}
                                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/70 text-[10px]"
                                    >
                                      ▶
                                    </button>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = editProductModal.gallery_images.filter((_: any, i: number) => i !== idx)
                                    setEditProductModal({ ...editProductModal, gallery_images: updated })
                                  }}
                                  className="p-1 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-xs"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: PRICING & VARIANTS */}
              {editorActiveTab === 'pricing' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-white/80 block mb-1">
                        Harga Dasar / Regular (Rp) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="500"
                        value={editProductModal.base_price ?? 35000}
                        onChange={(e) => setEditProductModal({ ...editProductModal, base_price: Number(e.target.value) })}
                        className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white font-mono text-base font-bold outline-none focus:border-[#8BC137]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-white/80 block mb-1">
                        Harga Promo Khusus (Rp, Opsional)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={editProductModal.promo_price ?? ''}
                        onChange={(e) =>
                          setEditProductModal({
                            ...editProductModal,
                            promo_price: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        placeholder="Kosongkan jika tidak ada promo"
                        className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-emerald-400 font-mono text-base font-bold outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  {/* Promo Schedule Window */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-white/90 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#FFD83D]" /> Periode Jadwal Promo Otomatis
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] text-white/60 block mb-1">Mulai Promo (WIB)</label>
                        <input
                          type="datetime-local"
                          value={editProductModal.promo_start_at ? editProductModal.promo_start_at.slice(0, 16) : ''}
                          onChange={(e) =>
                            setEditProductModal({ ...editProductModal, promo_start_at: e.target.value })
                          }
                          className="w-full rounded-xl p-2.5 bg-black/30 border border-white/10 text-white font-mono text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-white/60 block mb-1">Berakhir Promo (WIB)</label>
                        <input
                          type="datetime-local"
                          value={editProductModal.promo_end_at ? editProductModal.promo_end_at.slice(0, 16) : ''}
                          onChange={(e) => setEditProductModal({ ...editProductModal, promo_end_at: e.target.value })}
                          className="w-full rounded-xl p-2.5 bg-black/30 border border-white/10 text-white font-mono text-xs outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Size-Specific Pricing Overrides */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-white/90 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#8BC137]" /> Harga Khusus per Ukuran (Size-Specific Pricing)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {['PERSONAL', 'SHARING', 'MEGA'].map((sizeKey) => {
                        const currentPricing = editProductModal.size_pricing || {}
                        const val = currentPricing[sizeKey] ?? ''
                        return (
                          <div key={sizeKey} className="bg-black/20 p-3 rounded-xl border border-white/10">
                            <label className="text-[11px] font-bold text-white/70 block mb-1 uppercase">
                              Porsi {sizeKey} (Rp)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="500"
                              placeholder={
                                sizeKey === 'PERSONAL' ? '71500' : sizeKey === 'SHARING' ? '137500' : '265000'
                              }
                              value={val}
                              onChange={(e) => {
                                const updatedPricing = {
                                  ...currentPricing,
                                  [sizeKey]: e.target.value ? Number(e.target.value) : undefined,
                                }
                                setEditProductModal({ ...editProductModal, size_pricing: updatedPricing })
                              }}
                              className="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white font-mono text-xs font-bold outline-none"
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: OPTIONS & CUSTOMIZATION */}
              {editorActiveTab === 'options' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Active Available Sizes */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-white/90 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#8BC137]" /> Ukuran yang Diaktifkan untuk Menu Ini
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { id: 'PERSONAL', label: 'Personal (1 Porsi / ~400g)' },
                        { id: 'SHARING', label: 'Sharing (2-3 Porsi / ~850g)' },
                        { id: 'MEGA', label: 'Mega (4-6 Porsi / ~1.6kg)' },
                      ].map((sz) => {
                        const activeSizes = Array.isArray(editProductModal.available_sizes)
                          ? editProductModal.available_sizes
                          : ['PERSONAL', 'SHARING', 'MEGA']
                        const isChecked = activeSizes.includes(sz.id)

                        return (
                          <label
                            key={sz.id}
                            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer transition ${
                              isChecked
                                ? 'bg-[#8BC137]/20 border-[#8BC137] text-white font-bold'
                                : 'bg-white/5 border-white/10 text-white/50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const nextSizes = e.target.checked
                                  ? [...activeSizes, sz.id]
                                  : activeSizes.filter((s: string) => s !== sz.id)
                                setEditProductModal({ ...editProductModal, available_sizes: nextSizes })
                              }}
                              className="accent-[#8BC137] w-4 h-4 rounded"
                            />
                            <span className="text-xs">{sz.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* Seasoning Selection Checklist (Per-Product Availability) */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white/90 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#8BC137]" /> Pilihan Bumbu yang Diizinkan untuk Menu Ini
                      </h4>
                      <span className="text-[10px] text-white/50">
                        {Array.isArray(editProductModal.customization_options?.available_seasoning_ids) &&
                        editProductModal.customization_options.available_seasoning_ids.length > 0
                          ? `${editProductModal.customization_options.available_seasoning_ids.length} bumbu aktif khusus`
                          : 'Semua bumbu aktif diizinkan'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {seasoningsList.map((s: any) => {
                        const selectedIds: string[] = Array.isArray(
                          editProductModal.customization_options?.available_seasoning_ids
                        )
                          ? editProductModal.customization_options.available_seasoning_ids
                          : []
                        const isChecked = selectedIds.length === 0 || selectedIds.includes(s.id)

                        return (
                          <label
                            key={s.id}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                              isChecked
                                ? 'bg-[#8BC137]/15 border-[#8BC137]/60 text-white font-semibold'
                                : 'bg-white/5 border-white/10 text-white/40'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(s.id)}
                              onChange={(e) => {
                                const current = editProductModal.customization_options || {}
                                const currentList = Array.isArray(current.available_seasoning_ids)
                                  ? current.available_seasoning_ids
                                  : []
                                const nextIds = e.target.checked
                                  ? [...currentList, s.id]
                                  : currentList.filter((id: string) => id !== s.id)
                                setEditProductModal({
                                  ...editProductModal,
                                  customization_options: { ...current, available_seasoning_ids: nextIds },
                                })
                              }}
                              className="accent-[#8BC137] w-4 h-4 rounded"
                            />
                            <div className="truncate flex-1">
                              <span className="block truncate">{s.name}</span>
                              <span className="text-[10px] text-white/40 font-mono">
                                {s.extra_price > 0 ? `+Rp ${s.extra_price.toLocaleString('id-ID')}` : 'Gratis'}
                              </span>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* Seasoning & Customization Rules */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                    <h4 className="text-xs font-bold text-white/90 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#FFD83D]" /> Aturan Kustomisasi Bumbu & Buah
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-white/80 block mb-1">
                          Jatah Bumbu Gratis Termasuk
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          value={editProductModal.customization_options?.allowed_seasonings ?? 2}
                          onChange={(e) => {
                            const current = editProductModal.customization_options || {}
                            setEditProductModal({
                              ...editProductModal,
                              customization_options: { ...current, allowed_seasonings: Number(e.target.value) },
                            })
                          }}
                          className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white font-mono text-sm outline-none"
                        />
                        <span className="text-[10px] text-white/40 mt-1 block">
                          Bumbu tambahan di luar kuota akan dikenakan biaya ekstra otomatis.
                        </span>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-white/80 block mb-1">
                          Minimal Bumbu yang Wajib Dipilih
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          value={editProductModal.customization_options?.min_seasonings ?? 1}
                          onChange={(e) => {
                            const current = editProductModal.customization_options || {}
                            setEditProductModal({
                              ...editProductModal,
                              customization_options: { ...current, min_seasonings: Number(e.target.value) },
                            })
                          }}
                          className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white font-mono text-sm outline-none"
                        />
                        <span className="text-[10px] text-white/40 mt-1 block">
                          Jumlah minimum bumbu yang harus dipilih pelanggan.
                        </span>
                      </div>

                      <div className="sm:col-span-2 space-y-3 pt-1">
                        <label className="flex items-center gap-2.5 cursor-pointer bg-black/20 p-3 rounded-xl border border-white/10">
                          <input
                            type="checkbox"
                            checked={editProductModal.customization_options?.is_required ?? true}
                            onChange={(e) => {
                              const current = editProductModal.customization_options || {}
                              setEditProductModal({
                                ...editProductModal,
                                customization_options: { ...current, is_required: e.target.checked },
                              })
                            }}
                            className="accent-[#8BC137] w-4 h-4 rounded"
                          />
                          <span className="text-xs text-white">Wajib Memilih Bumbu Sebelum Ditambahkan ke Keranjang</span>
                        </label>

                        <label className="flex items-center gap-2.5 cursor-pointer bg-black/20 p-3 rounded-xl border border-white/10">
                          <input
                            type="checkbox"
                            checked={editProductModal.customization_options?.allow_duplicates ?? true}
                            onChange={(e) => {
                              const current = editProductModal.customization_options || {}
                              setEditProductModal({
                                ...editProductModal,
                                customization_options: { ...current, allow_duplicates: e.target.checked },
                              })
                            }}
                            className="accent-[#8BC137] w-4 h-4 rounded"
                          />
                          <span className="text-xs text-white">Boleh Pilih Varian Bumbu yang Sama (Duplikat)</span>
                        </label>

                        <label className="flex items-center gap-2.5 cursor-pointer bg-black/20 p-3 rounded-xl border border-white/10">
                          <input
                            type="checkbox"
                            checked={editProductModal.customization_options?.allow_fruit_notes ?? true}
                            onChange={(e) => {
                              const current = editProductModal.customization_options || {}
                              setEditProductModal({
                                ...editProductModal,
                                customization_options: { ...current, allow_fruit_notes: e.target.checked },
                              })
                            }}
                            className="accent-[#8BC137] w-4 h-4 rounded"
                          />
                          <span className="text-xs text-white">Izinkan Catatan Buah (cth: tanpa nanas, banyak mangga)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: STOCK & AVAILABILITY */}
              {editorActiveTab === 'stock' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <Package className="w-4 h-4 text-[#8BC137]" /> 4 Status Ketersediaan Menu
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        {
                          id: 'AVAILABLE',
                          title: '🟢 Tersedia (Bisa Dipesan)',
                          desc: 'Tampil di menu dan pelanggan dapat menambahkannya ke keranjang normal.',
                          badgeColor: 'border-emerald-500/50 bg-emerald-950/40 text-[#8BC137]',
                        },
                        {
                          id: 'OUT_OF_STOCK',
                          title: '🔴 Habis (Tampil, Tak Bisa Dibeli)',
                          desc: 'Tampil di katalog dengan label Habis/Sold Out, tombol beli dinonaktifkan.',
                          badgeColor: 'border-rose-500/50 bg-rose-950/40 text-rose-300',
                        },
                        {
                          id: 'TEMP_UNAVAILABLE',
                          title: '🟠 Tidak Tersedia Sementara',
                          desc: 'Tutup sementara karena keterbatasan bahan musiman atau antrean dapur.',
                          badgeColor: 'border-amber-500/50 bg-amber-950/40 text-amber-300',
                        },
                        {
                          id: 'HIDDEN',
                          title: '⚪ Disembunyikan dari Toko',
                          desc: 'Dihilangkan sepenuhnya dari etalase pelanggan. Riwayat invoice tetap aman.',
                          badgeColor: 'border-white/20 bg-slate-900/60 text-white/50',
                        },
                      ].map((statusOpt) => {
                        const isSelected = (editProductModal.availability_status || 'AVAILABLE') === statusOpt.id
                        return (
                          <div
                            key={statusOpt.id}
                            onClick={() =>
                              setEditProductModal({
                                ...editProductModal,
                                availability_status: statusOpt.id,
                                is_available: statusOpt.id === 'AVAILABLE',
                              })
                            }
                            className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                              isSelected
                                ? `${statusOpt.badgeColor} ring-2 ring-white/20 shadow-lg`
                                : 'bg-black/20 border-white/10 hover:bg-white/5 text-white/60'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-xs text-white">{statusOpt.title}</span>
                              <input
                                type="radio"
                                name="availability_choice"
                                checked={isSelected}
                                onChange={() => {}}
                                className="accent-[#8BC137]"
                              />
                            </div>
                            <p className="text-[11px] text-white/50">{statusOpt.desc}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-white/80 block mb-1">
                        Jumlah Stok Saat Ini (Unit)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editProductModal.stock ?? 999}
                        onChange={(e) => setEditProductModal({ ...editProductModal, stock: Number(e.target.value) })}
                        className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white font-mono text-sm outline-none focus:border-[#8BC137]"
                      />
                      <span className="text-[10px] text-white/40 mt-1 block">
                        Isi 999 jika stok harian segar selalu disiapkan sesuai kapasitas.
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-white/80 block mb-1">
                        Batas Peringatan Stok Rendah (Low-Stock Alert)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editProductModal.low_stock_threshold ?? 10}
                        onChange={(e) =>
                          setEditProductModal({ ...editProductModal, low_stock_threshold: Number(e.target.value) })
                        }
                        className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white font-mono text-sm outline-none focus:border-[#8BC137]"
                      />
                      <span className="text-[10px] text-white/40 mt-1 block">
                        Admin akan mendapat peringatan saat sisa stok di bawah batas ini.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: PROMOTION & VISIBILITY */}
              {editorActiveTab === 'promotion' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#FFD83D]" /> Mood Rasa & Pengalaman Kuliner
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { id: 'SEGAR', label: '🍋 Segar Asam Manis', color: 'from-amber-500/20 to-yellow-500/20' },
                        { id: 'PEDAS', label: '🌶️ Pedas Mantap', color: 'from-rose-500/20 to-orange-500/20' },
                        { id: 'GURIH', label: '🥜 Gurih Nikmat', color: 'from-amber-600/20 to-yellow-600/20' },
                        { id: 'MANIS', label: '🍯 Manis Legit', color: 'from-yellow-500/20 to-orange-400/20' },
                      ].map((m) => {
                        const isSelected = (editProductModal.mood || 'SEGAR') === m.id
                        return (
                          <div
                            key={m.id}
                            onClick={() => setEditProductModal({ ...editProductModal, mood: m.id })}
                            className={`p-3 rounded-2xl border cursor-pointer text-center transition ${
                              isSelected
                                ? 'border-[#FFD83D] bg-gradient-to-br ' + m.color + ' text-white font-bold ring-1 ring-[#FFD83D]'
                                : 'border-white/10 bg-black/20 text-white/50 hover:bg-white/5'
                            }`}
                          >
                            <span className="text-xs">{m.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-white/90">Lencana & Rekomendasi Kasir</h4>
                    <label className="flex items-center gap-2.5 cursor-pointer bg-black/20 p-3 rounded-xl border border-white/10">
                      <input
                        type="checkbox"
                        checked={Boolean(editProductModal.is_featured)}
                        onChange={(e) =>
                          setEditProductModal({ ...editProductModal, is_featured: e.target.checked })
                        }
                        className="accent-[#FFD83D] w-4 h-4 rounded"
                      />
                      <div>
                        <span className="text-xs font-bold text-white block">⭐ Rekomendasi Kasir AMM (Featured)</span>
                        <span className="text-[11px] text-white/50">
                          Tampil di bagian atas aplikasi saat pelanggan membuka menu untuk pertama kali.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 7: SEO SETTINGS WITH LIVE GOOGLE PREVIEW */}
              {editorActiveTab === 'seo' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-white/80">
                          SEO Meta Title (Maks 60 Karakter Disarankan)
                        </label>
                        <span className="text-[10px] text-white/40 font-mono">
                          {(editProductModal.seo_title || '').length} / 60
                        </span>
                      </div>
                      <input
                        type="text"
                        value={editProductModal.seo_title || ''}
                        onChange={(e) => setEditProductModal({ ...editProductModal, seo_title: e.target.value })}
                        placeholder={editProductModal.name ? `${editProductModal.name} | Asinan Merem Melek Official` : ''}
                        className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm outline-none focus:border-[#8BC137]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-white/80">
                          SEO Meta Description (Maks 160 Karakter Disarankan)
                        </label>
                        <span className="text-[10px] text-white/40 font-mono">
                          {(editProductModal.seo_description || '').length} / 160
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        value={editProductModal.seo_description || ''}
                        onChange={(e) => setEditProductModal({ ...editProductModal, seo_description: e.target.value })}
                        placeholder="Pesan rujak dan asinan buah segar khas Asinan Merem Melek dengan kuah pedas asam manis autentik..."
                        className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm outline-none focus:border-[#8BC137]"
                      />
                    </div>
                  </div>

                  {/* Google Search Snippet Preview Mockup */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs font-bold">
                      <Globe className="w-4 h-4 text-[#8BC137]" /> Pratinjau Tampilan di Google Search
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-md text-slate-800 space-y-1 max-w-xl font-sans">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-4 h-4 rounded-full bg-[#183F2E] flex items-center justify-center text-[9px] font-black text-[#8BC137]">
                          A
                        </div>
                        <span className="font-medium">Asinan Merem Melek</span>
                        <span className="text-slate-400">›</span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          https://asinanmeremmelek.site/menu/{editProductModal.slug || 'produk'}
                        </span>
                      </div>
                      <h5 className="text-blue-700 hover:underline font-medium text-base line-clamp-1 cursor-pointer">
                        {editProductModal.seo_title ||
                          (editProductModal.name
                            ? `${editProductModal.name} - Asinan Merem Melek`
                            : 'Asinan & Rujak Buah Segar | Asinan Merem Melek')}
                      </h5>
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {editProductModal.seo_description ||
                          editProductModal.short_description ||
                          'Nikmati sensasi asinan dan rujak buah segar khas Asinan Merem Melek dengan racikan bumbu khas pedas asam manis yang bikin melek!'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/70 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 p-4 sm:p-5 mt-4">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setProductPreviewModal(true)}
                    className="px-4 py-2.5 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition flex-1 sm:flex-initial shadow-sm"
                  >
                    <Eye className="w-4 h-4 text-[#8BC137]" />
                    <span>Pratinjau Pelanggan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditProductModal({
                        ...editProductModal,
                        availability_status: 'OUT_OF_STOCK',
                        is_available: false,
                      })
                      showToast('Status diubah ke Habis (OUT_OF_STOCK)')
                    }}
                    className="px-4 py-2.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 transition flex-1 sm:flex-initial"
                  >
                    <Package className="w-4 h-4" />
                    <span>Tandai Habis</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setEditProductModal(null)}
                    className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={savingProduct || uploadingProductPhoto}
                    className="px-6 py-2.5 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingProduct ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCT LIVE PREVIEW MODAL */}
      {productPreviewModal && editProductModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#FFF8E8] rounded-3xl max-w-sm w-full p-5 text-[#183F2E] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#183F2E]/10">
              <span className="text-xs font-black uppercase tracking-wider text-[#183F2E]/60 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#8BC137]" /> Pratinjau Tampilan Pelanggan
              </span>
              <button
                type="button"
                onClick={() => setProductPreviewModal(false)}
                className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product Card Mockup */}
            <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-[#183F2E]/10">
              <div className="relative h-44 bg-slate-100 overflow-hidden">
                <img
                  src={editProductModal.image_url || '/menu-photos/rujak-buah-personal.webp'}
                  alt={editProductModal.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                  {editProductModal.is_signature && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FFD83D] text-[#183F2E] shadow">
                      ⭐ Signature
                    </span>
                  )}
                  {editProductModal.is_bestseller && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FF5954] text-white shadow">
                      🔥 Terlaris
                    </span>
                  )}
                </div>

                {editProductModal.availability_status === 'OUT_OF_STOCK' && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                    <span className="px-3 py-1 rounded-xl bg-rose-600 text-white font-black text-xs tracking-wider uppercase shadow-lg">
                      Stok Habis
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-black text-sm text-[#183F2E] leading-tight">
                    {editProductModal.name || 'Nama Produk'}
                  </h4>
                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-sm text-[#183F2E]">
                      Rp {(editProductModal.promo_price || editProductModal.base_price || 0).toLocaleString('id-ID')}
                    </div>
                    {editProductModal.promo_price && (
                      <div className="text-[10px] line-through text-slate-400">
                        Rp {Number(editProductModal.base_price).toLocaleString('id-ID')}
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#183F2E]/70 line-clamp-2">
                  {editProductModal.short_description ||
                    editProductModal.full_description ||
                    'Buah segar pilihan dengan racikan bumbu khas Asinan Merem Melek.'}
                </p>

                {/* Size Pills */}
                <div className="flex gap-1.5 pt-1">
                  {(editProductModal.available_sizes || ['PERSONAL', 'SHARING', 'MEGA']).map((sz: string) => (
                    <span
                      key={sz}
                      className="px-2 py-0.5 rounded-lg bg-[#FFF8E8] border border-[#183F2E]/10 text-[9px] font-bold text-[#183F2E]/80"
                    >
                      {sz}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={editProductModal.availability_status === 'OUT_OF_STOCK'}
                  className={`w-full py-2.5 rounded-xl font-black text-xs mt-2 transition ${
                    editProductModal.availability_status === 'OUT_OF_STOCK'
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] shadow-sm'
                  }`}
                >
                  {editProductModal.availability_status === 'OUT_OF_STOCK' ? 'Stok Habis' : '+ Tambah ke Keranjang'}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-center text-[#183F2E]/50">
              Pratinjau mensimulasikan kartu menu di perangkat mobile pelanggan.
            </p>
          </div>
        </div>
      )}

      {/* Master Seasonings Manager Modal */}
      {showSeasoningManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
                  🌶️
                </div>
                <div>
                  <h3 className="text-base font-black text-[#183F2E]">Master Bumbu & Racikan Asinan</h3>
                  <p className="text-xs text-slate-500">Kelola ketersediaan bumbu di etalase dan penyesuaian harga ekstra.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSeasoningModalForm({
                      name: '',
                      description: '',
                      extraPrice: 0,
                      sortOrder: seasoningsList.length + 1,
                      isAvailable: 1,
                    })
                  }
                  className="px-3.5 py-1.5 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black text-xs flex items-center gap-1 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Bumbu
                </button>
                <button
                  type="button"
                  onClick={() => setShowSeasoningManager(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Seasonings List */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3 divide-y divide-slate-100">
              {seasoningsList.map((s: any) => (
                <div key={s.id} className="pt-3 first:pt-0 flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#183F2E] text-sm">{s.name}</span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          s.is_available === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {s.is_available === 1 ? '🟢 Tersedia' : '🔴 Habis'}
                      </span>
                      {s.extra_price > 0 ? (
                        <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                          +Rp {s.extra_price.toLocaleString('id-ID')}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Gratis (Standar)
                        </span>
                      )}
                    </div>
                    {s.description && <p className="text-slate-500 leading-relaxed text-[11px]">{s.description}</p>}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleSeasoning(s.id, s.is_available)}
                      className={`px-3 py-1.5 rounded-full font-bold text-[11px] transition ${
                        s.is_available === 1
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {s.is_available === 1 ? 'Tandai Habis' : 'Aktifkan'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSeasoningModalForm({
                          id: s.id,
                          name: s.name,
                          description: s.description || '',
                          extraPrice: s.extra_price || 0,
                          sortOrder: s.sort_order || 0,
                          isAvailable: s.is_available,
                        })
                      }
                      className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                      title="Edit Bumbu"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Seasoning Form Submodal (Add/Edit) */}
      {seasoningModalForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-[#183F2E]">
                {seasoningModalForm.id ? 'Edit Data Bumbu' : 'Tambah Bumbu Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setSeasoningModalForm(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveSeasoning} className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Nama Bumbu / Racikan *</label>
                <input
                  type="text"
                  required
                  value={seasoningModalForm.name}
                  onChange={(e) => setSeasoningModalForm({ ...seasoningModalForm, name: e.target.value })}
                  placeholder="Contoh: Bumbu Bangkok Pedas Gurih"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-[#8BC137]/30"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Deskripsi Singkat Rasa</label>
                <textarea
                  rows={2}
                  value={seasoningModalForm.description}
                  onChange={(e) => setSeasoningModalForm({ ...seasoningModalForm, description: e.target.value })}
                  placeholder="Contoh: Gula pasir, bubuk cabai khas Thailand, terasi bakar, garam."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-[#8BC137]/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Harga Ekstra (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={seasoningModalForm.extraPrice}
                    onChange={(e) =>
                      setSeasoningModalForm({ ...seasoningModalForm, extraPrice: Number(e.target.value) })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Urutan Tampil (Sort)</label>
                  <input
                    type="number"
                    value={seasoningModalForm.sortOrder}
                    onChange={(e) =>
                      setSeasoningModalForm({ ...seasoningModalForm, sortOrder: Number(e.target.value) })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSeasoningModalForm(null)}
                  className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black transition shadow-sm"
                >
                  Simpan Bumbu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Schedule Exception Modal */}
      {showAddExceptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-[#183F2E]">Tambah Hari Libur / Pengecualian Jadwal</h3>
              <button
                type="button"
                onClick={() => setShowAddExceptionModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Pilih Cabang Outlet *</label>
                <select
                  value={exceptionForm.branch_id}
                  onChange={(e) => setExceptionForm({ ...exceptionForm, branch_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-[#8BC137]/30"
                >
                  <option value="greenlake">Greenlake City (Tangerang)</option>
                  <option value="kelapagading">Kelapa Gading (Jakarta Utara)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Tanggal Pengecualian *</label>
                <input
                  type="date"
                  required
                  value={exceptionForm.date}
                  onChange={(e) => setExceptionForm({ ...exceptionForm, date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none font-mono"
                />
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exceptionForm.is_closed === 1}
                  onChange={(e) => setExceptionForm({ ...exceptionForm, is_closed: e.target.checked ? 1 : 0 })}
                  className="accent-[#8BC137] w-4 h-4 rounded"
                />
                <span className="font-bold text-slate-800">Tutup Seharian (Libur Penuh)</span>
              </label>

              {exceptionForm.is_closed === 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Buka Jam</label>
                    <input
                      type="time"
                      value={exceptionForm.open_time}
                      onChange={(e) => setExceptionForm({ ...exceptionForm, open_time: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Tutup Jam</label>
                    <input
                      type="time"
                      value={exceptionForm.close_time}
                      onChange={(e) => setExceptionForm({ ...exceptionForm, close_time: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-700 font-bold block mb-1">Alasan / Catatan Publik</label>
                <input
                  type="text"
                  value={exceptionForm.reason}
                  onChange={(e) => setExceptionForm({ ...exceptionForm, reason: e.target.value })}
                  placeholder="Contoh: Libur Bersama Hari Raya Idul Fitri"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddExceptionModal(false)}
                  className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveException}
                  className="px-5 py-2 rounded-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black transition shadow-sm"
                >
                  Simpan Jadwal Libur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
