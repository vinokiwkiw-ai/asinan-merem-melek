export type MoodType = 'PEDAS' | 'SEGAR' | 'MANIS' | 'ASAM' | 'GURIH'

export interface Branch {
  id: string
  name: string
  address: string
  gmaps_url: string
  whatsapp_number: string
  is_open: boolean
  open_hours: string
  locationName: string
}

export interface Category {
  id: string
  name: string
  sort_order: number
}

export interface MenuItem {
  id: string
  category_id: string
  name: string
  description: string
  base_price: number
  photoKey?: string
  image_url?: string
  is_available: boolean
  is_signature: boolean
  mood?: MoodType
  availability_status?: string
  customization_options?: any
}

export interface BumbuVariant {
  id: string
  name: string
  extra_price: number
  description: string
}

export interface PromoBanner {
  id: string
  title: string
  subtitle: string
  image_url?: string
  cta_label: string
  cta_link: string
  bg_color: string
  text_color: string
  is_active: boolean
  sort_order: number
}

export interface CartItem {
  id: string
  menuItem: MenuItem
  selectedBumbu?: BumbuVariant
  qty: number
  notes: string
  unitPrice: number
  totalPrice: number
  seasonings?: any[]
}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired'

export type OrderStatus =
  | 'menunggu_pembayaran'
  | 'diverifikasi'
  | 'diproses'
  | 'siap_diambil'
  | 'dikirim'
  | 'selesai'
  | 'dibatalkan'

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  menu_name: string
  bumbu_name?: string
  qty: number
  price_each: number
  notes?: string
}

export interface OrderStatusLog {
  id: string
  order_id: string
  status: OrderStatus
  note?: string
  created_at: string
}

export interface Order {
  id: string
  order_code: string
  branch_id: string
  branch_name: string
  customer_name: string
  customer_phone: string
  delivery_type: 'pickup' | 'delivery'
  delivery_address?: string
  notes?: string
  subtotal: number
  total: number
  payment_status: PaymentStatus
  order_status: OrderStatus
  midtrans_order_id?: string
  midtrans_transaction_id?: string
  payment_expired_at: string
  created_at: string
  items: OrderItem[]
  whatsapp_sent?: boolean
  whatsapp_sent_at?: string
  status_log: OrderStatusLog[]
}
