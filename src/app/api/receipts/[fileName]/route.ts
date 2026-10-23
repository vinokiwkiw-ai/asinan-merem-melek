import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'

const RECEIPTS_DIR = path.resolve(process.cwd(), 'data/receipts')

export async function GET(req: NextRequest, { params }: { params: { fileName: string } }) {
  try {
    const { fileName } = params

    // Prevent directory traversal
    const safeName = path.basename(fileName)
    const filePath = path.join(RECEIPTS_DIR, safeName)

    if (!fs.existsSync(filePath)) {
      return new NextResponse('File bukti penerimaan tidak ditemukan.', { status: 404 })
    }

    const fileBuffer = fs.readFileSync(filePath)
    const ext = path.extname(safeName).toLowerCase()
    const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=86400',
      },
    })
  } catch (error: any) {
    return new NextResponse('Gagal memuat foto bukti penerimaan.', { status: 500 })
  }
}
