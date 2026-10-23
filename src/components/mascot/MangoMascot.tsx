'use client'

import React from 'react'

export type MascotState =
  | 'idle'
  | 'loading'
  | 'empty_cart'
  | 'payment_success'
  | 'tracking'
  | 'reward'
  | 'preparing'
  | 'packing'
  | 'waiting_courier'
  | 'in_transit'
  | 'delivered'

interface MangoMascotProps {
  state?: MascotState
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  message?: string
  showSpeechBubble?: boolean
}

export const MangoMascot: React.FC<MangoMascotProps> = ({
  state = 'idle',
  size = 'md',
  className = '',
  message,
  showSpeechBubble = false,
}) => {
  const sizeMap = {
    sm: 'w-16 h-16',
    md: 'w-28 h-28',
    lg: 'w-40 h-40',
    xl: 'w-56 h-56',
  }

  const defaultMessages: Record<MascotState, string> = {
    idle: 'Hai Bestie! Seger-seger ngerujak yuk! 🥭',
    loading: 'Tunggu bentar ya, lagi diracik bumbu mantapnya... ✨',
    empty_cart: 'Keranjang kamu masih sepi nih! Masukin rujak favoritmu yuk~ 🧺',
    payment_success: 'Hore! Pembayaranmu sukses diverifikasi! Siap dikirim! 🎉',
    tracking: 'Pesananmu lagi meluncur nih, siap bikin merem melek! 🛵💨',
    reward: 'Selamat! Kamu dapat poin membership Asinan Merem Melek! ⭐👑',
    preparing: 'Pesananmu lagi diracik kitchen dengan buah tropis segar & bumbu mantap! 👨‍🍳🥭',
    packing: 'Buah & bumbu sudah siap, dikemas higienis dengan segel AMM! 📦🌿',
    waiting_courier: 'Paket siap di meja penjemputan, memanggil kurir ekspedisi... 🛵✨',
    in_transit: 'Kurir sedang meluncur cepat menuju alamat kamu! Siap-siap merem melek! 🛵💨',
    delivered: 'Pesanan telah tiba di lokasi Anda! Selamat menikmati sensasi pedas segarnya! 🎉🥭',
  }

  const speechText = message || defaultMessages[state] || defaultMessages.idle

  return (
    <div className={`inline-flex flex-col items-center justify-center select-none ${className}`}>
      {showSpeechBubble && (
        <div className="relative mb-2 px-3.5 py-1.5 bg-white text-[#183F2E] text-xs font-bold rounded-2xl shadow-lg border border-[#8BC137]/30 max-w-xs text-center animate-bounce-subtle">
          {speechText}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-[#8BC137]/30 rotate-45" />
        </div>
      )}

      <div className={`relative ${sizeMap[size]} transition-transform duration-300`}>
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-md overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="mangoSkin" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD83D" />
              <stop offset="65%" stopColor="#8BC137" />
              <stop offset="100%" stopColor="#4A851A" />
            </linearGradient>

            <linearGradient id="mangoGlow" x1="30%" y1="20%" x2="80%" y2="80%">
              <stop offset="0%" stopColor="#FFF275" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FFD83D" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8BC137" />
              <stop offset="100%" stopColor="#183F2E" />
            </linearGradient>

            <radialGradient id="blushGrad">
              <stop offset="0%" stopColor="#FF5954" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FF5954" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Celebration Aura for delivered / payment_success */}
          {(state === 'payment_success' || state === 'delivered') && (
            <g className="animate-spin-slow origin-center opacity-80">
              <circle cx="100" cy="100" r="95" fill="none" stroke="#FFD83D" strokeWidth="2" strokeDasharray="6 8" />
              <circle cx="100" cy="100" r="85" fill="none" stroke="#8BC137" strokeWidth="1.5" strokeDasharray="4 6" />
            </g>
          )}

          {/* Reward Stars */}
          {state === 'reward' && (
            <g className="animate-pulse origin-center">
              <polygon
                points="100,10 108,35 135,35 113,50 122,75 100,60 78,75 87,50 65,35 92,35"
                fill="#FFD83D"
                opacity="0.3"
                transform="scale(2) translate(-50,-35)"
              />
            </g>
          )}

          {/* Main Mango Body Group with dynamic bounce */}
          <g
            className={`origin-bottom transition-all duration-300 ${
              state === 'loading'
                ? 'animate-mango-wobble'
                : state === 'payment_success' || state === 'delivered'
                ? 'animate-mango-jump'
                : state === 'tracking' || state === 'in_transit'
                ? 'animate-mango-scooter'
                : state === 'preparing'
                ? 'animate-bounce-subtle'
                : 'animate-mango-breathe'
            }`}
          >
            {/* Ground Shadow */}
            <ellipse cx="100" cy="175" rx="55" ry="12" fill="#183F2E" opacity="0.25" />

            {/* Stem & Leaves */}
            <path d="M100 48 Q98 25 106 18" stroke="#5D3A1A" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path
              d="M104 26 C125 15 145 28 140 46 C120 48 108 38 104 26 Z"
              fill="url(#leafGrad)"
              className="drop-shadow-sm"
            />
            <path
              d="M98 32 C82 22 70 30 75 42 C88 44 95 38 98 32 Z"
              fill="url(#leafGrad)"
              opacity="0.9"
            />

            {/* Mango Character Silhouette */}
            <path
              d="M98 42 C145 42 165 78 165 115 C165 155 132 170 98 170 C58 170 42 145 42 110 C42 70 65 42 98 42 Z"
              fill="url(#mangoSkin)"
              stroke="#183F2E"
              strokeWidth="3.5"
            />

            {/* Soft Belly Glow */}
            <ellipse cx="88" cy="105" rx="42" ry="48" fill="url(#mangoGlow)" />

            {/* Cheerful Blushes */}
            <ellipse cx="68" cy="118" rx="10" ry="7" fill="url(#blushGrad)" />
            <ellipse cx="132" cy="118" rx="10" ry="7" fill="url(#blushGrad)" />

            {/* Facial Expressions Per State */}
            {state === 'empty_cart' ? (
              <g>
                <circle cx="78" cy="106" r="6" fill="#183F2E" />
                <circle cx="122" cy="106" r="6" fill="#183F2E" />
                <circle cx="80" cy="104" r="2" fill="#FFFFFF" />
                <circle cx="124" cy="104" r="2" fill="#FFFFFF" />
                <path d="M72 96 Q78 99 84 97" stroke="#183F2E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M116 97 Q122 99 128 96" stroke="#183F2E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <ellipse cx="100" cy="126" rx="5" ry="7" fill="#FF5954" stroke="#183F2E" strokeWidth="2" />
              </g>
            ) : state === 'payment_success' || state === 'delivered' ? (
              <g>
                <path d="M70 108 Q80 98 88 108" stroke="#183F2E" strokeWidth="4" strokeLinecap="round" fill="none" />
                <path d="M112 108 Q120 98 130 108" stroke="#183F2E" strokeWidth="4" strokeLinecap="round" fill="none" />
                <path
                  d="M84 120 Q100 144 116 120 Z"
                  fill="#FF5954"
                  stroke="#183F2E"
                  strokeWidth="3"
                />
                <path d="M92 122 Q100 130 108 122" fill="#FFF8E8" />
              </g>
            ) : state === 'preparing' ? (
              <g>
                <circle cx="78" cy="106" r="6.5" fill="#183F2E" />
                <circle cx="80" cy="103" r="2.5" fill="#FFFFFF" />
                <circle cx="122" cy="106" r="6.5" fill="#183F2E" />
                <circle cx="124" cy="103" r="2.5" fill="#FFFFFF" />
                <path d="M88 120 Q100 134 112 120" stroke="#183F2E" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M95 124 C95 130 105 130 105 124 Z" fill="#FF5954" />
              </g>
            ) : state === 'waiting_courier' ? (
              <g>
                <circle cx="76" cy="106" r="6" fill="#183F2E" />
                <circle cx="78" cy="103" r="2" fill="#FFFFFF" />
                <circle cx="124" cy="106" r="6" fill="#183F2E" />
                <circle cx="126" cy="103" r="2" fill="#FFFFFF" />
                <path d="M88 122 Q100 130 112 122" stroke="#183F2E" strokeWidth="3" strokeLinecap="round" fill="none" />
              </g>
            ) : (
              <g>
                <circle cx="78" cy="106" r="6.5" fill="#183F2E" />
                <circle cx="80" cy="103" r="2.5" fill="#FFFFFF" />
                <circle cx="76" cy="108" r="1" fill="#FFFFFF" />
                <circle cx="122" cy="106" r="6.5" fill="#183F2E" />
                <circle cx="124" cy="103" r="2.5" fill="#FFFFFF" />
                <circle cx="120" cy="108" r="1" fill="#FFFFFF" />
                <path
                  d="M86 122 Q100 138 114 122"
                  stroke="#183F2E"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>
            )}

            {/* Accessory 1: Chef Hat & Kitchen Spoon for 'preparing' */}
            {state === 'preparing' && (
              <g className="drop-shadow-md">
                {/* Chef Hat */}
                <path
                  d="M75 52 C65 35 75 18 95 20 C100 12 115 12 120 22 C135 20 145 35 135 52 Z"
                  fill="#FFF8E8"
                  stroke="#183F2E"
                  strokeWidth="3"
                />
                <rect x="76" y="48" width="58" height="12" rx="4" fill="#8BC137" stroke="#183F2E" strokeWidth="2.5" />
                {/* Mixing Spoon */}
                <path d="M142 95 L168 125" stroke="#8B5A2B" strokeWidth="5" strokeLinecap="round" />
                <ellipse cx="170" cy="127" rx="8" ry="6" fill="#D4A373" stroke="#8B5A2B" strokeWidth="2" />
                {/* Fresh seasoning splash drops */}
                <circle cx="160" cy="110" r="3" fill="#FF5954" />
                <circle cx="175" cy="115" r="2.5" fill="#FFD83D" />
              </g>
            )}

            {/* Accessory 2: AMM Packaging Box for 'packing' */}
            {state === 'packing' && (
              <g className="drop-shadow-md">
                <rect x="65" y="130" width="70" height="42" rx="8" fill="#D4A373" stroke="#183F2E" strokeWidth="3" />
                {/* Green AMM Seal Ribbon */}
                <rect x="94" y="130" width="12" height="42" fill="#8BC137" stroke="#183F2E" strokeWidth="2" />
                <circle cx="100" cy="148" r="6" fill="#FFD83D" stroke="#183F2E" strokeWidth="1.5" />
                {/* Box tape seams */}
                <line x1="65" y1="140" x2="135" y2="140" stroke="#BC8A5F" strokeWidth="1.5" strokeDasharray="3 3" />
              </g>
            )}

            {/* Accessory 3: Wristwatch & Takeaway Bag for 'waiting_courier' */}
            {state === 'waiting_courier' && (
              <g className="drop-shadow-md">
                {/* Packed Paper Bag on left */}
                <path d="M30 135 L40 170 L70 170 L75 135 Z" fill="#E6BA82" stroke="#183F2E" strokeWidth="2.5" />
                <path d="M42 135 C42 125 62 125 62 135" stroke="#183F2E" strokeWidth="2.5" fill="none" />
                <rect x="46" y="145" width="12" height="12" rx="3" fill="#8BC137" />
                {/* Wristwatch on right arm */}
                <rect x="142" y="125" width="10" height="14" rx="2" fill="#FF5954" stroke="#183F2E" strokeWidth="1.5" />
                <circle cx="147" cy="132" r="5" fill="#FFF8E8" stroke="#183F2E" strokeWidth="1.5" />
                <line x1="147" y1="132" x2="147" y2="129" stroke="#183F2E" strokeWidth="1.5" />
                <line x1="147" y1="132" x2="150" y2="132" stroke="#183F2E" strokeWidth="1.5" />
              </g>
            )}

            {/* Accessory 4: Scooter Helmet & Wind Lines for 'tracking' & 'in_transit' */}
            {(state === 'tracking' || state === 'in_transit') && (
              <g className="drop-shadow-sm">
                <path
                  d="M65 58 C65 42 135 42 135 58 L148 64 C150 67 140 70 128 66 L65 58 Z"
                  fill="#183F2E"
                  stroke="#0C251B"
                  strokeWidth="2"
                />
                <ellipse cx="100" cy="54" rx="34" ry="12" fill="#8BC137" />
                <circle cx="100" cy="54" r="6" fill="#FFD83D" />
                <circle cx="100" cy="54" r="3" fill="#FF5954" />
                {/* Wind motion lines */}
                <path d="M30 110 L10 110" stroke="#8BC137" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
                <path d="M25 125 L12 125" stroke="#FFD83D" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
                <path d="M32 140 L16 140" stroke="#FF5954" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
              </g>
            )}

            {/* Accessory 5: Party Hat & Confetti for 'delivered' */}
            {state === 'delivered' && (
              <g className="drop-shadow-md">
                <polygon points="100,16 82,50 118,50" fill="#FF5954" stroke="#183F2E" strokeWidth="2.5" />
                <circle cx="100" cy="16" r="5" fill="#FFD83D" />
                <circle cx="92" cy="35" r="3" fill="#8BC137" />
                <circle cx="108" cy="40" r="3" fill="#FFF8E8" />
                {/* Floating Confetti */}
                <circle cx="45" cy="45" r="4" fill="#FF5954" />
                <circle cx="155" cy="40" r="4.5" fill="#FFD83D" />
                <rect x="35" y="75" width="6" height="6" fill="#8BC137" transform="rotate(25 35 75)" />
                <rect x="160" y="80" width="7" height="7" fill="#FF5954" transform="rotate(45 160 80)" />
              </g>
            )}

            {/* Accessory 6: Crown for 'reward' */}
            {state === 'reward' && (
              <g className="drop-shadow-md">
                <polygon
                  points="70,55 80,32 92,48 100,24 108,48 120,32 130,55"
                  fill="#FFD83D"
                  stroke="#183F2E"
                  strokeWidth="2.5"
                />
                <circle cx="80" cy="32" r="3" fill="#FF5954" />
                <circle cx="100" cy="24" r="4" fill="#8BC137" />
                <circle cx="120" cy="32" r="3" fill="#FF5954" />
                <circle cx="100" cy="46" r="3" fill="#FFF8E8" />
              </g>
            )}

            {/* Hands */}
            <circle cx="50" cy="130" r="8" fill="#FFD83D" stroke="#183F2E" strokeWidth="2.5" />
            <circle cx="148" cy="130" r="8" fill="#FFD83D" stroke="#183F2E" strokeWidth="2.5" />
          </g>
        </svg>
      </div>
    </div>
  )
}

