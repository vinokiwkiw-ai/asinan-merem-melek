import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { AdminSessionService } from '@/lib/auth/adminSessionService'

export async function POST(req: NextRequest) {
  try {
    const auth = AdminSessionService.verifyAdminRequest(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file foto yang dipilih.' }, { status: 400 })
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Harap unggah file foto berformat JPG, PNG, atau WebP.' },
        { status: 400 }
      )
    }

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Ukuran file terlalu besar. Maksimal ukuran file foto adalah 5MB.' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    }
    const ext = extMap[file.type] || '.webp'
    const randomSuffix = crypto.randomBytes(6).toString('hex')
    const fileName = `product_${Date.now()}_${randomSuffix}${ext}`

    const uploadDir = path.resolve(process.cwd(), 'public', 'menu-photos')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const filePath = path.join(uploadDir, fileName)
    fs.writeFileSync(filePath, buffer)

    const publicUrl = `/menu-photos/${fileName}`

    return NextResponse.json({
      success: true,
      message: 'Foto produk berhasil diunggah.',
      url: publicUrl,
      fileName,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Gagal mengunggah foto produk.' },
      { status: 500 }
    )
  }
}
