import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '../api';
import {
  Branch,
  Category,
  MenuItem,
  BumbuVariant,
  PromoBanner,
  CartItem,
  Order,
  OrderStatus,
  PaymentStatus,
  OrderStatusLog,
} from '../types';

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'greenlake',
    name: 'Asinan Merem Melek - Greenlake City',
    address: 'Rukan Crown Block C No. 12, Green Lake City, Cipondoh, Tangerang',
    gmaps_url: 'https://share.google/Uk8u2ZZUvZ1Bvr38b',
    whatsapp_number: '628118281220',
    is_open: true,
    open_hours: '09:00 - 20:00 WIB',
    locationName: 'Tangerang',
  },
  {
    id: 'kelapagading',
    name: 'Asinan Merem Melek - Kelapa Gading',
    address: 'Jl. Boulevard Raya Block WB2 No. 8, Kelapa Gading, Jakarta Utara',
    gmaps_url: 'https://share.google/Wzy7o0z1kWsF1Ao0G',
    whatsapp_number: '628118281220',
    is_open: true,
    open_hours: '10:00 - 21:00 WIB',
    locationName: 'Jakarta',
  },
]

// OFFICIAL CATEGORIES MATCHING ASINANMEREMMELEK.SITE
export const INITIAL_CATEGORIES: Category[] = [
  { id: 'asinan', name: '🥭 Asinan', sort_order: 1 },
  { id: 'rujak-buah', name: '🌶️ Aneka Rujak Buah', sort_order: 2 },
  { id: 'mangga-paket', name: '🎁 Mangga & Paketan', sort_order: 3 },
  { id: 'musiman', name: '⭐ Musiman', sort_order: 4 },
  { id: 'bumbu', name: '🥣 Bumbu Rujak', sort_order: 5 },
]

// OFFICIAL BUMBU VARIANTS
export const INITIAL_BUMBU_VARIANTS: BumbuVariant[] = [
  {
    id: 'bumbu-bangkok',
    name: 'Bumbu Rujak Bangkok Tabur',
    extra_price: 0,
    description: 'Varian favorit viral! Taburan gula aren, garam & cabai kasar khas Bangkok.',
  },
  {
    id: 'bumbu-kiamboy',
    name: 'Kuah Asinan Kiamboy Merah Alami',
    extra_price: 0,
    description: 'Kuah kiamboy asam manis pedas murni dari sari buah tanpa cuka & tanpa pengawet.',
  },
  {
    id: 'bumbu-bebeg',
    name: 'Bumbu Rujak Bebeg Tradisional',
    extra_price: 0,
    description: 'Bumbu uleg tumbuk tradisional manis pedas asam buah.',
  },
  {
    id: 'bumbu-kacang',
    name: 'Bumbu Rujak Kacang Aren',
    extra_price: 2000,
    description: 'Bumbu uleg kental pedas gurih legit dari gula aren murni & kacang sangrai.',
  },
  {
    id: 'bumbu-asamboi',
    name: 'Bumbu Rujak Asamboi Segar',
    extra_price: 2000,
    description: 'Bumbu tabur rasa asam manis gurih pedas khas racikan Merem Melek.',
  },
]

// EXACT OFFICIAL PRODUCTS & PRICES FROM ASINANMEREMMELEK.SITE JS BUNDLE (ZERO AI GENERATED IMAGES)
export const INITIAL_MENU_ITEMS: MenuItem[] = [
  // ASINAN CATEGORY
  {
    id: 'gl-asinan-kiamboy-buah-mix',
    category_id: 'asinan',
    name: 'Asinan Kiamboy Buah Mix',
    description: 'Campuran buah tropis pilihan (mangga, jambu mutiara, salak, nanas) dengan kuah kiamboy alami tanpa cuka & tanpa pengawet.',
    base_price: 71500,
    image_url: '', // Clean non-generated UI icon fallback
    is_available: true,
    is_signature: true,
  },
  {
    id: 'gl-asinan-lengkeng-mangga',
    category_id: 'asinan',
    name: 'Asinan Lengkeng Mangga',
    description: 'Manis buah lengkeng masak dipadu mangga krispi dan jambu mutiara disiram kuah merah kiamboy segar.',
    base_price: 71500,
    image_url: '',
    is_available: true,
    is_signature: true,
  },
  {
    id: 'gl-asinan-mangga-kipas',
    category_id: 'asinan',
    name: 'Asinan Mangga Kipas',
    description: 'Mangga muda diiris tipis melebar bagai kipas, krispi renyah disiram kuah asam manis pedas.',
    base_price: 71500,
    image_url: '',
    is_available: true,
    is_signature: true,
  },
  {
    id: 'gl-asinan-mangga-pelem',
    category_id: 'asinan',
    name: 'Asinan Mangga Pelem',
    description: 'Mangga pelem harum dipadu kuah rempah asinan alami tanpa cuka sintetis.',
    base_price: 71500,
    image_url: '',
    is_available: true,
    is_signature: false,
  },
  {
    id: 'gl-acar-jambu-air-merah',
    category_id: 'asinan',
    name: 'Acar Jambu Air Merah',
    description: 'Jambu air merah segar pilihan direndam kuah acar manis asam pedas alami.',
    base_price: 71500,
    image_url: '',
    is_available: true,
    is_signature: false,
  },
  {
    id: 'kg-rujak-mix-jadoel',
    category_id: 'asinan',
    name: 'Rujak Mix Jadoel',
    description: 'Rujak campuran buah klasik jadoel dipadu kuah dan bumbu uleg khas Merem Melek.',
    base_price: 71500,
    image_url: '',
    is_available: true,
    is_signature: false,
  },

  // BUMBU RUJAK CATEGORY
  {
    id: 'gl-bumbu-bangkok',
    category_id: 'bumbu',
    name: 'Bumbu Rujak Bangkok (Pouch)',
    description: 'Bumbu rujak Bangkok asli racikan Merem Melek. Taburan gula aren, garam & cabai kasar.',
    base_price: 38500,
    image_url: '',
    is_available: true,
    is_signature: true,
  },
  {
    id: 'gl-bumbu-asamboi',
    category_id: 'bumbu',
    name: 'Bumbu Rujak Asamboi',
    description: 'Bumbu tabur asam gurih manis khas Merem Melek.',
    base_price: 38500,
    image_url: '',
    is_available: true,
    is_signature: false,
  },
  {
    id: 'gl-bumbu-bebeg',
    category_id: 'bumbu',
    name: 'Bumbu Rujak Bebeg',
    description: 'Bumbu rujak uleg tumbuk manis pedas asam.',
    base_price: 38500,
    image_url: '',
    is_available: true,
    is_signature: false,
  },
  {
    id: 'gl-bumbu-kacang',
    category_id: 'bumbu',
    name: 'Bumbu Rujak Kacang',
    description: 'Bumbu rujak uleg kental dari gula aren asli & kacang sangrai harum.',
    base_price: 38500,
    image_url: '',
    is_available: true,
    is_signature: false,
  },
  {
    id: 'gl-bumbu-cabe-garam-terasi',
    category_id: 'bumbu',
    name: 'Bumbu Rujak Cabe Garam Terasi',
    description: 'Bumbu tabur cabe garam dengan aroma terasi sangrai gurih pedas.',
    base_price: 27500,
    image_url: '',
    is_available: true,
    is_signature: false,
  },
  {
    id: 'gl-bumbu-cabe-garam',
    category_id: 'bumbu',
    name: 'Bumbu Rujak Cabe Garam',
    description: 'Bumbu tabur cabe garam krispi pedas asin gurih.',
    base_price: 27500,
    image_url: '',
    is_available: true,
    is_signature: false,
  },
  {
    id: 'gl-extra-cabe-bubuk',
    category_id: 'bumbu',
    name: 'Extra Cabe Bubuk',
    description: 'Tambahan cabe bubuk murni untuk tingkat kepedasan ekstra.',
    base_price: 9900,
    image_url: '',
    is_available: true,
    is_signature: false,
  },
  {
    id: 'gl-paket-3-bumbu',
    category_id: 'bumbu',
    name: 'Paket 3 Bumbu Best Seller (Bangkok, Asamboi, Bebeg)',
    description: 'Paket 3 Pouch bumbu terlaris Merem Melek!',
    base_price: 110000,
    image_url: '',
    is_available: true,
    is_signature: true,
  },
  {
    id: 'gl-aneka-bumbu-6',
    category_id: 'bumbu',
    name: 'Aneka Bumbu Rujak (Isi 6 Toples)',
    description: 'Komplit! 6 Toples aneka varian bumbu rujak Merem Melek.',
    base_price: 165000,
    image_url: '',
    is_available: true,
    is_signature: true,
  },

  // ANEKA RUJAK BUAH CATEGORY
  {
    id: 'gl-rujak-personal',
    category_id: 'rujak-buah',
    name: 'Rujak Buah Personal',
    description: 'Porsi personal buah-buahan segar potong dipadu bumbu pilihan.',
    base_price: 71500,
    image_url: '',
    is_available: true,
    is_signature: false,
  },
  {
    id: 'gl-rujak-sharing',
    category_id: 'rujak-buah',
    name: 'Rujak Buah Sharing',
    description: 'Porsi sedang cocok untuk 2-3 orang.',
    base_price: 108900,
    image_url: '',
    is_available: true,
    is_signature: true,
  },
  {
    id: 'gl-rujak-mega',
    category_id: 'rujak-buah',
    name: 'Rujak Buah Mega',
    description: 'Porsi besar jumbo untuk keluarga / kumpul rame-rame.',
    base_price: 185900,
    image_url: '',
    is_available: true,
    is_signature: true,
  },
  {
    id: 'gl-rujak-mangga-kampung',
    category_id: 'rujak-buah',
    name: 'Rujak Mangga Kampung',
    description: 'Mangga muda iris tradisional dipadu bumbu uleg aren.',
    base_price: 55000,
    image_url: '',
    is_available: true,
    is_signature: false,
  },
  {
    id: 'gl-mangga-kriuk-asamboi',
    category_id: 'rujak-buah',
    name: 'Mangga Kriuk Bumbu Asamboi',
    description: 'Mangga krispi renyah ditabur bumbu asamboi segar.',
    base_price: 71500,
    image_url: '',
    is_available: true,
    is_signature: true,
  },

  // MANGGA & PAKETAN CATEGORY
  {
    id: 'gl-mangga-utuh',
    category_id: 'mangga-paket',
    name: 'Mangga Utuh',
    description: 'Buah mangga muda segar utuh pilihan.',
    base_price: 71500,
    image_url: '',
    is_available: true,
    is_signature: false,
  },
  {
    id: 'gl-mangga-kiojay-utuh',
    category_id: 'mangga-paket',
    name: 'Mangga Kiojay Utuh',
    description: 'Mangga Kiojay jumbo renyah gurih manis utuh.',
    base_price: 66000,
    image_url: '',
    is_available: true,
    is_signature: false,
  },
  {
    id: 'gl-mangga-kiojay-bumbu',
    category_id: 'mangga-paket',
    name: 'Mangga Kiojay + Bumbu (Bangkok / Asamboi / Bebeg / Kacang)',
    description: 'Mangga Kiojay super krispi lengkap dengan varian bumbu favorit Anda.',
    base_price: 88000,
    image_url: '',
    is_available: true,
    is_signature: true,
  },
  {
    id: 'gl-paket-mangga-bangkok-asamboi',
    category_id: 'mangga-paket',
    name: 'Paket Mangga Muda + Bumbu Rujak Bangkok & Asamboi',
    description: 'Paket kombinasi mangga muda krispi dengan 2 bumbu favorit (Bangkok & Asamboi).',
    base_price: 137500,
    image_url: '',
    is_available: true,
    is_signature: true,
  },
  {
    id: 'gl-paket-mangga-lengkap',
    category_id: 'mangga-paket',
    name: 'Paket Mangga Muda + Aneka Bumbu Rujak Lengkap',
    description: 'Paket hemat komplit mangga muda dengan seluruh aneka bumbu rujak pilihan.',
    base_price: 218900,
    image_url: '',
    is_available: true,
    is_signature: true,
  },

  // MUSIMAN CATEGORY
  {
    id: 'gl-gandaria-utuh-1kg',
    category_id: 'musiman',
    name: 'Gandaria Utuh 1 kg',
    description: 'Buah gandaria segar utuh 1kg (Musiman).',
    base_price: 176000,
    image_url: '',
    is_available: true,
    is_signature: false,
  },
  {
    id: 'gl-asinan-kiamboy-rambutan-mangga',
    category_id: 'musiman',
    name: 'Asinan Kiamboy Rambutan Mangga (Musiman)',
    description: 'Musiman! Rambutan manis dipadu mangga muda krispi dan kuah kiamboy.',
    base_price: 88000,
    image_url: '',
    is_available: true,
    is_signature: true,
  },
  {
    id: 'gl-asinan-kiamboy-rambutan',
    category_id: 'musiman',
    name: 'Asinan Kiamboy Rambutan (Musiman)',
    description: 'Buah rambutan segar disiram kuah kiamboy asam manis pedas.',
    base_price: 93500,
    image_url: '',
    is_available: true,
    is_signature: false,
  },
  {
    id: 'gl-bebeg-gandaria',
    category_id: 'musiman',
    name: 'Bebeg Gandaria',
    description: 'Rujak tumbuk buah gandaria langka aromatik asam pedas.',
    base_price: 44000,
    image_url: '',
    is_available: true,
    is_signature: true,
  },
  {
    id: 'gl-bebeg-ceremai',
    category_id: 'musiman',
    name: 'Bebeg Ceremai',
    description: 'Rujak tumbuk buah ceremai segar asam melek.',
    base_price: 38500,
    image_url: '',
    is_available: true,
    is_signature: false,
  },
  {
    id: 'gl-asinan-ceremai-kuah',
    category_id: 'musiman',
    name: 'Asinan Ceremai Kuah',
    description: 'Buah ceremai disiram kuah asam pedas alami.',
    base_price: 71500,
    image_url: '',
    is_available: true,
    is_signature: false,
  },
  {
    id: 'gl-bebeg-buni',
    category_id: 'musiman',
    name: 'Bebeg Buni',
    description: 'Rujak tumbuk buah buni segar musiman.',
    base_price: 38500,
    image_url: '',
    is_available: true,
    is_signature: false,
  },
  {
    id: 'gl-gowok-bumbu-bangkok',
    category_id: 'musiman',
    name: 'Gowok Bumbu Bangkok',
    description: 'Buah gowok krispi langka dipadu bumbu rujak Bangkok.',
    base_price: 71500,
    image_url: '',
    is_available: true,
    is_signature: false,
  },
]

// PROMO BANNERS MATCHING OFFICIAL PROMOTIONS
export const INITIAL_PROMO_BANNERS: PromoBanner[] = [
  {
    id: 'banner-1',
    title: 'Spesial Bundling Cabang Baru Kelapa Gading!',
    subtitle: 'Pasti Fresh! Bebas Pengawet dan Pemanis Buatan.',
    image_url: '',
    cta_label: 'Tampilkan Menu',
    cta_link: '#menu',
    bg_color: '#0b3826',
    text_color: '#F5E6A3',
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'banner-2',
    title: 'Paket 3 Bumbu Best Seller Hemat Rp 110.000',
    subtitle: 'Bumbu Bangkok, Asamboi & Bebeg Kemasan Pouch Siap Tabur.',
    image_url: '',
    cta_label: 'Pesan Paket Bumbu',
    cta_link: '#menu',
    bg_color: '#10462f',
    text_color: '#B7E4C7',
    is_active: true,
    sort_order: 2,
  },
]

// INITIAL ORDERS SEED DATA FOR TRACKING TESTING
export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    order_code: 'AMM-260911-0042',
    branch_id: 'greenlake',
    branch_name: 'Asinan Merem Melek - Greenlake City',
    customer_name: 'Dei',
    customer_phone: '081234567890',
    delivery_type: 'pickup',
    notes: 'Cabai dipisah ya kak',
    subtotal: 143000,
    total: 143000,
    payment_status: 'paid',
    order_status: 'diverifikasi',
    midtrans_order_id: 'MIDTRANS-AMM-260911-0042',
    midtrans_transaction_id: 'TRX-99887766',
    payment_expired_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    items: [
      {
        id: 'item-1',
        order_id: 'ord-1001',
        menu_item_id: 'gl-asinan-kiamboy-buah-mix',
        menu_name: 'Asinan Kiamboy Buah Mix',
        bumbu_name: 'Kuah Asinan Kiamboy Merah Alami',
        qty: 1,
        price_each: 71500,
      },
      {
        id: 'item-2',
        order_id: 'ord-1001',
        menu_item_id: 'gl-asinan-lengkeng-mangga',
        menu_name: 'Asinan Lengkeng Mangga',
        bumbu_name: 'Kuah Asinan Kiamboy Merah Alami',
        qty: 1,
        price_each: 71500,
      },
    ],
    status_log: [
      {
        id: 'log-1',
        order_id: 'ord-1001',
        status: 'menunggu_pembayaran',
        note: 'Pesanan berhasil dibuat',
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
      {
        id: 'log-2',
        order_id: 'ord-1001',
        status: 'diverifikasi',
        note: 'Pembayaran transfer telah diverifikasi oleh admin.',
        created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      },
    ],
  },
]


// ZUSTAND STORE
interface AppStore {
  branches: Branch[];
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  categories: Category[];
  menuItems: MenuItem[];
  bumbuVariants: BumbuVariant[];
  promoBanners: PromoBanner[];
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addToCart: (menuItem: MenuItem, selectedBumbu?: BumbuVariant, qty?: number, notes?: string, seasonings?: any[]) => void;
  updateCartQty: (cartItemId: string, qty: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  createOrder: (
    customerName: string,
    customerPhone: string,
    deliveryType: 'pickup' | 'delivery',
    deliveryAddress?: string,
    district?: string,
    city?: string,
    zipcode?: string,
    notes?: string
  ) => Promise<Order>;
  updateOrderStatus: (
    orderId: string,
    newOrderStatus: OrderStatus,
    newPaymentStatus?: PaymentStatus,
    logNote?: string
  ) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      branches: INITIAL_BRANCHES,
  selectedBranchId: INITIAL_BRANCHES[0].id,
  setSelectedBranchId: (id) => set({ selectedBranchId: id }),
  categories: INITIAL_CATEGORIES,
  menuItems: INITIAL_MENU_ITEMS,
  bumbuVariants: INITIAL_BUMBU_VARIANTS,
  promoBanners: INITIAL_PROMO_BANNERS,
  cart: [],
  get cartCount() {
    return get().cart.reduce((sum, item) => sum + item.qty, 0);
  },
  get cartSubtotal() {
    return get().cart.reduce((sum, item) => sum + item.totalPrice, 0);
  },
  orders: INITIAL_ORDERS,
  isLoading: false,
  error: null,
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  addToCart: (menuItem, selectedBumbu, qty = 1, notes = '', seasonings) => {
    let extraPrice = selectedBumbu ? selectedBumbu.extra_price : 0;
    let seasoningSuffix = selectedBumbu ? selectedBumbu.id : 'nobumbu';

    if (seasonings && seasonings.length > 0) {
      const seasoningExtra = seasonings.reduce(
        (acc: number, s: any) => acc + (s.isExtra ? (s.extraPrice || 0) * (s.qty || 1) : 0),
        0
      );
      extraPrice += seasoningExtra;
      seasoningSuffix = seasonings.map((s: any) => `${s.id}x${s.qty}`).join('-');
    }

    const cartItemId = `${menuItem.id}_${seasoningSuffix}_${notes.trim()}`;
    const unitPrice = menuItem.base_price + extraPrice;

    set((state) => {
      const existingIndex = state.cart.findIndex((item) => item.id === cartItemId);
      if (existingIndex > -1) {
        const updated = [...state.cart];
        const existing = updated[existingIndex];
        const newQty = existing.qty + qty;
        updated[existingIndex] = {
          ...existing,
          qty: newQty,
          totalPrice: newQty * unitPrice,
        };
        return { cart: updated };
      } else {
        return {
          cart: [
            ...state.cart,
            {
              id: cartItemId,
              menuItem,
              selectedBumbu,
              qty,
              notes,
              unitPrice,
              totalPrice: qty * unitPrice,
              seasonings,
            },
          ],
        };
      }
    });
  },

  updateCartQty: (cartItemId, qty) => {
    if (qty <= 0) {
      get().removeFromCart(cartItemId);
      return;
    }
    set((state) => ({
      cart: state.cart.map((item) =>
        item.id === cartItemId
          ? { ...item, qty, totalPrice: qty * item.unitPrice }
          : item
      ),
    }));
  },

  removeFromCart: (cartItemId) => {
    set((state) => ({ cart: state.cart.filter((item) => item.id !== cartItemId) }));
  },

  clearCart: () => set({ cart: [] }),

  createOrder: async (
    customerName,
    customerPhone,
    deliveryType,
    deliveryAddress = '',
    district = '',
    city = '',
    zipcode = '',
    notes = ''
  ) => {
    const state = get();
    const branch = state.branches.find((b) => b.id === state.selectedBranchId) || state.branches[0];
    
    const newOrder = await api.createOrder({
      branch_id: branch.id,
      branch_name: branch.name,
      customer_name: customerName,
      customer_phone: customerPhone,
      delivery_type: deliveryType,
      delivery_address: `${deliveryAddress}, ${district}, ${city}, ${zipcode}`.trim(),
      notes,
      subtotal: state.cartSubtotal,
      total: state.cartSubtotal + (deliveryType === 'delivery' ? 15000 : 0),
      items: state.cart.map((c) => ({
        id: 'item-' + Math.random().toString(36).substring(2, 9),
        order_id: '',
        menu_item_id: c.menuItem.id,
        menu_name: c.menuItem.name,
        bumbu_name: c.selectedBumbu?.name,
        qty: c.qty,
        price_each: c.unitPrice,
        notes: c.notes,
      })),
    });

    set((state) => ({ orders: [newOrder, ...state.orders] }));
    get().clearCart();
    return newOrder;
  },

  updateOrderStatus: (orderId, newOrderStatus, newPaymentStatus, logNote) => {
    set((state) => ({
      orders: state.orders.map((ord) => {
        if (ord.id === orderId || ord.order_code === orderId) {
          const nextPaymentStatus = newPaymentStatus || ord.payment_status;
          const newLog: OrderStatusLog = {
            id: 'log-' + Math.random().toString(36).substring(2, 9),
            order_id: ord.id,
            status: newOrderStatus,
            note: logNote || `Status diubah menjadi ${newOrderStatus.replace('_', ' ').toUpperCase()}`,
            created_at: new Date().toISOString(),
          };
          return {
            ...ord,
            order_status: newOrderStatus,
            payment_status: nextPaymentStatus,
            status_log: [...ord.status_log, newLog],
          };
        }
        return ord;
      }),
    }));
  },
}),
{
  name: 'amm-app-storage',
  partialize: (state) => ({ cart: state.cart, selectedBranchId: state.selectedBranchId }), // Only persist cart and branch
}
)
);
