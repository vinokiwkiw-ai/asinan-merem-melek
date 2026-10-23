import { db } from '../db/index.ts'

export interface PricingItemInput {
  productId: string
  size?: 'PERSONAL' | 'SHARING' | 'MEGA' | 'STANDARD'
  qty: number
  seasoningSelections?: {
    seasoningId: string
    qty: number
  }[]
}

export interface PricingBreakdown {
  subtotal: number
  itemsDetail: {
    productId: string
    productName: string
    unitPrice: number
    size: string
    qty: number
    seasoningExtraPerUnit: number
    itemSubtotal: number
  }[]
  voucherDiscount: number
  voucherCode?: string
  voucherError?: string
  hasGiftPackaging: boolean
  giftPackagingFee: number
  hasGreetingCard: boolean
  greetingCardFee: number
  deliveryFee: number
  deliveryProvider?: string
  finalTotal: number
}

export class PricingService {
  /**
   * Authoritative integer IDR price calculation
   */
  static calculateTotal(params: {
    items: PricingItemInput[]
    voucherCode?: string
    hasGiftPackaging?: boolean
    hasGreetingCard?: boolean
    deliveryFee?: number
    deliveryProvider?: string
  }): PricingBreakdown {
    const {
      items,
      voucherCode,
      hasGiftPackaging = false,
      hasGreetingCard = false,
      deliveryFee = 0,
      deliveryProvider,
    } = params

    if (!items || items.length === 0) {
      throw new Error('Keranjang belanja kosong.')
    }

    // Retrieve active seasonings from DB for price check
    const seasoningsMap = new Map<string, { id: string; name: string; extra_price: number }>()
    const allSeasonings = db.query('SELECT id, name, extra_price FROM seasonings WHERE is_available = 1')
    allSeasonings.forEach((s) => seasoningsMap.set(s.id, s))

    // Retrieve settings for gift fees
    const packagingFeeSetting = db.queryOne<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      ['gift_packaging_fee']
    )
    const cardFeeSetting = db.queryOne<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      ['greeting_card_fee']
    )

    const giftPackagingFee = hasGiftPackaging ? parseInt(packagingFeeSetting?.value || '15000', 10) : 0
    const greetingCardFee = hasGreetingCard ? parseInt(cardFeeSetting?.value || '5000', 10) : 0

    let subtotal = 0
    const itemsDetail: PricingBreakdown['itemsDetail'] = []

    for (const item of items) {
      if (item.qty <= 0 || !Number.isInteger(item.qty)) {
        throw new Error('Kuantitas produk tidak valid.')
      }

      // Fetch authentic product from DB (never trust client base_price)
      const product = db.queryOne<{
        id: string
        name: string
        base_price: number
        is_available: number
        availability_status?: string
      }>(
        'SELECT id, name, base_price, is_available, availability_status FROM products WHERE id = ?',
        [item.productId]
      )

      if (!product) {
        throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`)
      }

      const status = product.availability_status || (product.is_available ? 'AVAILABLE' : 'OUT_OF_STOCK')
      if (status === 'HIDDEN') {
        throw new Error(`Produk "${product.name}" tidak ditemukan.`)
      }
      if (status === 'TEMP_UNAVAILABLE') {
        throw new Error(`Produk "${product.name}" saat ini tidak tersedia sementara.`)
      }
      if (status === 'OUT_OF_STOCK' || !product.is_available) {
        throw new Error(`Produk "${product.name}" saat ini sedang habis.`)
      }

      // Calculate extra seasoning costs
      let seasoningExtraPerUnit = 0
      if (item.seasoningSelections && item.seasoningSelections.length > 0) {
        for (const sel of item.seasoningSelections) {
          const s = seasoningsMap.get(sel.seasoningId)
          if (s && s.extra_price > 0) {
            seasoningExtraPerUnit += Math.max(0, sel.qty) * s.extra_price
          }
        }
      }

      const unitTotal = product.base_price + seasoningExtraPerUnit
      const itemSubtotal = unitTotal * item.qty
      subtotal += itemSubtotal

      itemsDetail.push({
        productId: product.id,
        productName: product.name,
        unitPrice: product.base_price,
        size: item.size || 'STANDARD',
        qty: item.qty,
        seasoningExtraPerUnit,
        itemSubtotal,
      })
    }

    // Voucher verification
    let voucherDiscount = 0
    let voucherError: string | undefined

    if (voucherCode && voucherCode.trim()) {
      const code = voucherCode.trim().toUpperCase()
      const nowStr = new Date().toISOString()
      const voucher = db.queryOne<{
        id: string
        code: string
        discount_type: 'PERCENT' | 'FIXED'
        discount_value: number
        min_spend: number
        max_discount: number
        usage_limit: number
        times_used: number
        start_date: string
        end_date: string
        is_active: number
      }>('SELECT * FROM vouchers WHERE code = ?', [code])

      if (!voucher) {
        voucherError = `Kode voucher "${code}" tidak ditemukan.`
      } else if (!voucher.is_active) {
        voucherError = `Kode voucher "${code}" sudah tidak aktif.`
      } else if (voucher.times_used >= voucher.usage_limit) {
        voucherError = `Batas pemakaian voucher "${code}" sudah habis.`
      } else if (voucher.start_date && nowStr < voucher.start_date) {
        voucherError = `Voucher "${code}" belum dapat digunakan.`
      } else if (voucher.end_date && nowStr > voucher.end_date) {
        voucherError = `Voucher "${code}" sudah kedaluwarsa.`
      } else if (subtotal < voucher.min_spend) {
        voucherError = `Minimal pembelanjaan untuk voucher ini adalah Rp ${voucher.min_spend.toLocaleString('id-ID')}.`
      } else {
        // Valid voucher
        if (voucher.discount_type === 'PERCENT') {
          let calculated = Math.floor((subtotal * voucher.discount_value) / 100)
          if (voucher.max_discount > 0 && calculated > voucher.max_discount) {
            calculated = voucher.max_discount
          }
          voucherDiscount = calculated
        } else {
          voucherDiscount = voucher.discount_value
        }

        // Voucher cannot exceed subtotal
        if (voucherDiscount > subtotal) {
          voucherDiscount = subtotal
        }
      }
    }

    const verifiedDeliveryFee = Math.max(0, Math.floor(deliveryFee))
    const finalTotal = Math.max(
      0,
      subtotal - voucherDiscount + giftPackagingFee + greetingCardFee + verifiedDeliveryFee
    )

    return {
      subtotal,
      itemsDetail,
      voucherDiscount,
      voucherCode: voucherDiscount > 0 ? voucherCode?.toUpperCase() : undefined,
      voucherError,
      hasGiftPackaging,
      giftPackagingFee,
      hasGreetingCard,
      greetingCardFee,
      deliveryFee: verifiedDeliveryFee,
      deliveryProvider,
      finalTotal,
    }
  }
}
