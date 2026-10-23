"use client"
import React, { useState } from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useAppStore } from '@/store/useStore'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { branches = [], cart = [] } = useAppStore() || {}
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || '')

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.totalPrice || 0), 0)

  return (
    <>
      <Navbar
        branches={branches}
        selectedBranchId={selectedBranchId}
        onSelectBranch={setSelectedBranchId}
        cartCount={cartCount}
        cartSubtotal={cartSubtotal}
      />
      <main className="min-h-screen">
        {children}
      </main>
      <Footer branches={branches} />
    </>
  )
}
