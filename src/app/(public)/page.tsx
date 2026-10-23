"use client"
import React, { useState, useEffect } from 'react';
import { HeroSection } from '@/components/hero/HeroSection';
import { BumbuSection } from '@/components/experience/BumbuSection';
import { AsinanSplashSection } from '@/components/experience/AsinanSplashSection';
import { ProductCollection } from '@/components/products/ProductCollection';
import { ProductDetailModal } from '@/components/products/ProductDetailModal';
import { BranchPicker } from '@/components/BranchPicker';
import { HomepageReviewsSection } from '@/components/reviews/HomepageReviewsSection';
import { useAppStore } from '@/store/useStore';
import { MenuItem } from '@/types';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { 
    branches = [], 
    selectedBranchId = '', 
    setSelectedBranchId = () => {},
    categories = [],
    menuItems = [],
    bumbuVariants = [],
    cartCount = 0,
    cartSubtotal = 0,
    addToCart,
  } = useAppStore() || {};
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleScrollToMenu = () => {
    const el = document.getElementById('menu');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      router.push('/menu');
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#F8FAF6] flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#8BC137]/20 animate-pulse flex items-center justify-center text-2xl">
          🥭
        </div>
        <div className="w-32 h-3 rounded-full bg-slate-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-fade-in">
      <HeroSection
        onSeeMenu={handleScrollToMenu}
        onNgerujakNow={handleScrollToMenu}
      />
      
      <BumbuSection />
      <AsinanSplashSection />

      <BranchPicker
        branches={branches}
        selectedBranchId={selectedBranchId}
        onSelectBranch={setSelectedBranchId}
      />

      <ProductCollection
        categories={categories}
        menuItems={menuItems}
        onSelectItem={(item) => setSelectedProduct(item)}
        cartCount={cartCount}
        cartSubtotal={cartSubtotal}
        onOpenCart={() => router.push('/cart')}
      />

      <HomepageReviewsSection />

      {selectedProduct && (
        <ProductDetailModal
          item={selectedProduct}
          bumbuVariants={bumbuVariants}
          onClose={() => setSelectedProduct(null)}
          onConfirm={(item, bumbu, qty, notes, seasonings) => {
            if (addToCart) {
              addToCart(item, bumbu, qty, notes, seasonings);
            }
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
}
