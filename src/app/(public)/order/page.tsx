"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OrderPage() {
  const router = useRouter();
  const [orderCode, setOrderCode] = useState('');
  const [error, setError] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderCode.trim()) {
      setError('Masukkan nomor pesanan Anda.');
      return;
    }
    router.push(`/track/${orderCode.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAF6] pt-16 pb-24 px-4">
      <div className="max-w-xl mx-auto bg-white border border-slate-100 shadow-sm rounded-3xl p-8 sm:p-10 space-y-6 text-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#183F2E] mb-2">Lacak Status Pesanan</h1>
          <p className="text-xs text-slate-500">
            Masukkan kode unik pesanan Anda untuk memantau proses dapur & kurir pengantar.
          </p>
        </div>
        
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <input 
            type="text" 
            placeholder="Nomor Pesanan (contoh: AMM-XXXX-XXXX)" 
            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-5 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#183F2E] focus:ring-2 focus:ring-[#8BC137]/20 transition text-sm uppercase"
            value={orderCode}
            onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
          />
          <button type="submit" className="bg-[#8BC137] text-[#183F2E] font-black px-7 py-3.5 rounded-full hover:bg-[#7ab02d] transition shadow-md cursor-pointer text-sm">
            Lacak
          </button>
        </form>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-2xl text-center font-medium">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
