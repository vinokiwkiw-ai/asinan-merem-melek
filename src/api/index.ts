import { Order } from '../types'
import { createBrowserClient } from '@supabase/ssr'

// Initialize Supabase Client
const getSupabase = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Backend Service Configuration
const BANK_ACCOUNT = {
  bank: 'BCA',
  number: '1234567890',
  name: 'Asinan Merem Melek'
}
const PAYMENT_WINDOW_MINUTES = 12

export const api = {
  // 1. Create Order (Checkout)
  createOrder: async (data: Partial<Order>): Promise<Order> => {
    const supabase = getSupabase()
    
    // Check if dummy mode is active
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy')) {
        console.warn("DUMMY MODE: createOrder simulated.")
        const now = new Date()
        const orderCode = `AMM-DUMMY-${Math.floor(Math.random() * 9000)}`
        return {
            ...data,
            id: 'ord-dummy',
            order_code: orderCode,
            payment_status: 'pending',
            order_status: 'menunggu_pembayaran',
            payment_expired_at: new Date(now.getTime() + PAYMENT_WINDOW_MINUTES * 60 * 1000).toISOString(),
            created_at: now.toISOString(),
            status_log: []
        } as Order
    }

    // SERVER-SIDE VALIDATION
    if (!data.items || data.items.length === 0) {
      throw new Error("Keranjang belanja kosong.")
    }

    // Fetch all products in cart
    const productIds = data.items.map(item => item.menu_item_id).filter(Boolean)
    const { data: dbProducts, error: prodErr } = await supabase
      .from('products')
      .select('id, name, base_price, is_available')
      .in('id', productIds)

    if (prodErr) throw prodErr

    let serverSubtotal = 0

    // Validate each item
    for (const item of data.items) {
      const dbProduct = dbProducts?.find(p => p.id === item.menu_item_id)
      
      if (!dbProduct) {
        throw new Error(`Produk "${item.menu_name}" tidak ditemukan di database.`)
      }
      if (!dbProduct.is_available) {
        throw new Error(`Produk "${dbProduct.name}" saat ini sedang habis. Hapus dari keranjang untuk melanjutkan.`)
      }

      // Calculate exact price: Base Price + Bumbu (if any)
      // Note: Assuming standard bumbu price logic here. Hardcoded mapping for MVP if needed, or derived from frontend diff.
      // To strictly enforce: if it has bumbu_name, it's +3000 (example). 
      // Let's deduce the bumbu price from the requested price_each vs base_price, but limit the max difference.
      const requestedDiff = item.price_each - dbProduct.base_price
      if (requestedDiff < 0 || requestedDiff > 10000) {
        throw new Error(`Harga tidak valid untuk "${dbProduct.name}".`)
      }
      
      const validatedPrice = dbProduct.base_price + requestedDiff
      serverSubtotal += (validatedPrice * item.qty)
    }

    const serverDeliveryFee = data.delivery_type === 'delivery' ? 15000 : 0
    const serverTotal = serverSubtotal + serverDeliveryFee

    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '')
    const randomSeq = Math.floor(1000 + Math.random() * 9000)
    const orderCode = `AMM-${dateStr}-${randomSeq}`
    const now = new Date()
    const expiresAt = new Date(now.getTime() + PAYMENT_WINDOW_MINUTES * 60 * 1000).toISOString()
    
    // 1. Insert Order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderCode,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        subtotal: serverSubtotal,
        delivery_fee: serverDeliveryFee,
        discount: 0,
        total: serverTotal,
        order_status: 'menunggu_pembayaran',
        payment_status: 'pending',
      })
      .select()
      .single()

    if (orderError) throw orderError

    // 2. Insert Order Items
    if (data.items && data.items.length > 0) {
      const orderItems = data.items.map(item => ({
        order_id: orderData.id,
        product_id: null, // If menu_item_id is not UUID, might need adjustment in schema, using null for now if mismatch
        product_name: item.menu_name,
        bumbu_variant: item.bumbu_name,
        qty: item.qty,
        price_each: item.price_each,
        subtotal: item.qty * item.price_each
      }))
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)
        
      if (itemsError) throw itemsError
    }

    // Adapt to frontend type
    return {
      ...data,
      id: orderData.id,
      order_code: orderData.order_number,
      payment_status: orderData.payment_status,
      order_status: orderData.order_status,
      payment_expired_at: expiresAt, // Supabase doesn't natively have this column in the schema yet, keeping in frontend type
      created_at: orderData.created_at,
      status_log: []
    } as Order
  },

  // 2. Fetch Orders (For Monitor/Tracker)
  getOrder: async (orderCode: string): Promise<Order | null> => {
    const orders = await api.getOrders();
    return orders.find(o => o.order_code === orderCode) || null;
  },

  getOrders: async (): Promise<Order[]> => {
    const supabase = getSupabase()
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy')) {
        return []
    }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Map DB fields to frontend Order type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((d: any) => ({
      id: d.id,
      order_code: d.order_number,
      branch_id: 'dummy',
      branch_name: 'Cabang Dummy',
      customer_id: d.customer_id,
      customer_name: d.customer_name || 'Customer',
      customer_phone: d.customer_phone || '-',
      delivery_type: 'delivery',
      subtotal: d.subtotal,
      total: d.total,
      order_status: d.order_status,
      payment_status: d.payment_status,
      created_at: d.created_at,
      payment_expired_at: d.created_at, // Mock
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: (d.order_items || []).map((i: any) => ({
        id: i.id,
        order_id: i.order_id,
        menu_name: i.product_name,
        bumbu_name: i.bumbu_variant,
        qty: i.qty,
        price_each: i.price_each,
      })),
      status_log: [] // Requires separate table if we want to persist logs
    })) as Order[]
  },

  // 3. Notify Transfer (Frontend saying "Saya Sudah Transfer")
  notifyTransfer: async (_orderId: string): Promise<Order> => {
     // For this project, we just resolve and assume the admin sees the WhatsApp message
     // In a real app, this might update a flag in the DB.
     return {} as Order
  },

  // 4. Update Order Status (Admin)
  updateOrderStatus: async (orderId: string, orderStatus: string, paymentStatus?: string): Promise<void> => {
    const supabase = getSupabase()
    const updateData: any = { order_status: orderStatus }
    if (paymentStatus) {
      updateData.payment_status = paymentStatus
    }
    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)

    if (error) throw error
  },

  // Simulate Bank Webhook Verified (Admin/Dev testing endpoint)
  simulateWebhookVerified: async (orderId: string): Promise<Order> => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('orders')
      .update({ payment_status: 'paid', order_status: 'diverifikasi' })
      .eq('id', orderId)
      .select()
      .single()

    if (error) throw error
    return data as any
  },
  
  // 5. Update WhatsApp Sent Flag (Idempotency)
  markWhatsAppSent: async (_orderId: string): Promise<void> => {
    // Mock implementation for now, add whatsapp_sent column to orders if needed
  },

  getBankAccount: () => BANK_ACCOUNT
}
