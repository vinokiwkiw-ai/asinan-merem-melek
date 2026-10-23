import React from 'react'
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, MessageSquare } from 'lucide-react'
import { CartItem } from '../../types'
import { getProductPhotoUrl } from '../../data/officialData'

interface CartDrawerProps {
  isOpen: boolean
  cart: CartItem[]
  cartSubtotal: number
  onClose: () => void
  onUpdateQty: (id: string, qty: number) => void
  onRemoveItem: (id: string) => void
  onCheckout: () => void
  isPage?: boolean
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  cart,
  cartSubtotal,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onCheckout,
  isPage,
}) => {
  if (!isOpen && !isPage) return null

  const content = (
      <div className={`relative w-full ${isPage ? 'h-[600px] rounded-3xl overflow-hidden shadow-2xl' : 'max-w-md h-full shadow-2xl border-l border-slate-200'} bg-white flex flex-col text-slate-800`}>
        
        {/* Cart Drawer Header */}
        <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#8BC137] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-[#183F2E]">Keranjang Pesanan</h3>
              <p className="text-xs text-slate-500">{cart.length} Jenis Item Terpilih</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cart Drawer Content List */}
        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 mb-4 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm relative">
              <ShoppingBag className="w-8 h-8 text-slate-300 absolute" />
              <span className="text-3xl relative z-10 translate-x-2 translate-y-2">🥭</span>
            </div>
            <h4 className="text-lg font-black text-[#183F2E] mb-1">Keranjang Masih Kosong</h4>
            <p className="text-slate-500 text-xs mb-6 max-w-[250px] leading-relaxed">
              Yuk, mulai pilih menu Asinan atau Rujak favoritmu sekarang! Jangan lupa tambah bumbu spesialnya.
            </p>
            <button
              onClick={onClose}
              className="bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black px-7 py-3 rounded-full text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              Pilih Menu Sekarang
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {cart.map((item) => {
              const photoUrl = getProductPhotoUrl(item.menuItem.photoKey)

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-2 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl shrink-0 overflow-hidden shadow-sm">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={item.menuItem.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            ;(e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        '🥭'
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[#183F2E] truncate">
                        {item.menuItem.name}
                      </div>
                      {item.selectedBumbu && (
                        <div className="text-[10px] text-emerald-700 font-semibold">
                          {item.selectedBumbu.name}
                        </div>
                      )}
                      {item.notes && (
                        <div className="text-[10px] text-amber-700 italic">
                          Catatan: &ldquo;{item.notes}&rdquo;
                        </div>
                      )}
                      <div className="text-xs font-bold text-slate-700 mt-1 tabular-nums font-mono">
                        Rp {item.unitPrice.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full p-1 shadow-sm">
                      <button
                        onClick={() => onUpdateQty(item.id, item.qty - 1)}
                        className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-4 text-center text-[#183F2E]">{item.qty}</span>
                      <button
                        onClick={() => onUpdateQty(item.id, item.qty + 1)}
                        className="w-6 h-6 rounded-full bg-[#8BC137] text-[#183F2E] font-bold flex items-center justify-center hover:bg-[#7ab02d] transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Item Subtotal Row */}
                <div className="flex justify-between items-center text-[11px] px-2 pt-2 border-t border-slate-200/60">
                  <span className="text-slate-400">Subtotal produk:</span>
                  <span className="font-bold text-[#183F2E] font-mono">Rp {(item.unitPrice * item.qty).toLocaleString('id-ID')}</span>
                </div>
              </div>
              )
            })}
          </div>
        )}

        {/* Cart Drawer Footer */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-slate-100 bg-white space-y-3">
            <div className="space-y-1.5 border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Item</span>
                <span className="font-bold text-slate-800">{cart.reduce((sum, item) => sum + item.qty, 0)} item</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Subtotal Produk</span>
                <span className="font-mono font-bold text-slate-800">Rp {cartSubtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>*Ongkir & biaya tambahan akan dihitung saat checkout</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm pt-1">
              <span className="font-black text-[#183F2E]">Total Estimasi</span>
              <span className="font-black font-mono text-lg text-[#183F2E] tabular-nums">
                Rp {cartSubtotal.toLocaleString('id-ID')}
              </span>
            </div>

            <button
              onClick={onCheckout}
              className="w-full bg-[#8BC137] hover:bg-[#7ab02d] text-[#183F2E] font-black py-4 rounded-full shadow-md text-xs flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Lanjut Ke Checkout Pesanan</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        )}

      </div>
  )

  if (isPage) return content

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-fade-in">
      {content}
    </div>
  )
}
