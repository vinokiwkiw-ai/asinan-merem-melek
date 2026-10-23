"use client";

import React, { useState } from 'react';
import { useAppStore } from '@/store/useStore';
import { ProductCollection } from '@/components/products/ProductCollection';
import { ProductDetailModal } from '@/components/products/ProductDetailModal';
import { MenuItem } from '@/types';
import { useRouter } from 'next/navigation';

export default function MenuPage() {
  const { 
    categories = [], 
    menuItems = [], 
    bumbuVariants = [],
    cartCount = 0,
    cartSubtotal = 0,
    addToCart
  } = useAppStore() || {};

  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F8FAF6] pt-8 pb-16">
      <ProductCollection
        categories={categories}
        menuItems={menuItems}
        onSelectItem={(item) => setSelectedProduct(item)}
        cartCount={cartCount}
        cartSubtotal={cartSubtotal}
        onOpenCart={() => router.push('/cart')}
      />

      {selectedProduct && (
        <ProductDetailModal
          item={selectedProduct}
          bumbuVariants={bumbuVariants}
          onClose={() => setSelectedProduct(null)}
          onConfirm={(item, bumbu, qty, notes, seasonings) => {
            addToCart(item, bumbu, qty, notes, seasonings);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
}
