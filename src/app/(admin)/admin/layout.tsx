import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Asinan Merem Melek',
  description: 'Admin Control Panel',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-layout font-sans bg-[#F8FAF6] min-h-screen text-slate-900">
      {children}
    </div>
  );
}
