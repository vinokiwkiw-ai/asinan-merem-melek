import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Asinan Merem Melek | Ahlinya Rujak Buah & Asinan Segar Indonesia',
  description:
    'Platform pemesanan online resmi Asinan Merem Melek. Asinan buah kiamboy segar alami tanpa cuka & aneka rujak buah dengan bumbu khas nusantara.',
  icons: {
    icon: '/favicon.ico',
    apple: '/logo-asinan-merem-melek.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body className="font-sans antialiased bg-[#F8FAF6] text-[#183F2E] selection:bg-[#8BC137] selection:text-[#183F2E]">
        {children}
      </body>
    </html>
  )
}
