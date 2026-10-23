"use client";

import React, { useState, useEffect } from 'react'
import { CheckCircle2, Clock, XCircle, AlertTriangle, RefreshCw, Eye } from 'lucide-react'
import { Order, PaymentStatus } from '../types'
import { api } from '../api'

interface AdminMonitorProps {
  orders: Order[]
}

export const AdminMonitor: React.FC<AdminMonitorProps> = ({ orders }) => {
  const [filter, setFilter] = useState<PaymentStatus | 'all'>('all')

  const filteredOrders = orders.filter((o) => {
    if (filter === 'all') return true
    return o.payment_status === filter
  })

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return <span className="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3"/> TERVERIFIKASI</span>
      case 'pending':
        return <span className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 w-max"><Clock className="w-3 h-3"/> MENUNGGU</span>
      case 'failed':
        return <span className="bg-rose-500/20 text-rose-300 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 w-max"><AlertTriangle className="w-3 h-3"/> PERLU REVIEW</span>
      case 'expired':
        return <span className="bg-slate-500/20 text-slate-300 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 w-max"><XCircle className="w-3 h-3"/> EXPIRED</span>
      default:
        return <span className="bg-slate-500/20 text-slate-300 px-2 py-1 rounded text-[10px] font-bold">{(status as string).toUpperCase()}</span>
    }
  }

  // Simulator for Webhook (DEV ONLY)
  const handleSimulateWebhook = async (orderId: string) => {
    await api.simulateWebhookVerified(orderId)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Eye className="text-amber-400" /> Admin Payment Monitor
            </h2>
            <p className="text-xs text-slate-400">Pantau transaksi dan status pembayaran secara real-time.</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'paid', 'expired', 'failed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors ${
                  filter === f
                    ? 'bg-amber-500 text-brand-dark'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {f === 'all' ? 'Semua' : f === 'failed' ? 'Perlu Review' : f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/50 text-slate-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="px-4 py-3 rounded-tl-xl">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status Pembayaran</th>
                <th className="px-4 py-3">Waktu Dibuat</th>
                <th className="px-4 py-3 rounded-tr-xl">Aksi (Dev Simulator)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">
                    Tidak ada transaksi ditemukan.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-amber-300">{order.order_code}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{order.customer_name}</div>
                      <div className="text-[10px] text-slate-400">{order.customer_phone}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-200">
                      Rp {(order.total || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(order.payment_status)}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      {(order.payment_status === 'pending' || order.payment_status === 'expired') && (
                        <button
                          onClick={async () => {
                            await handleSimulateWebhook(order.id);
                            alert("Pesanan berhasil dikonfirmasi!");
                            window.location.reload();
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded flex items-center gap-1 text-[10px] font-bold"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Konfirmasi Pembayaran
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
