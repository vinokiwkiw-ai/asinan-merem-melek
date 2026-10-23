import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'

const PROOFS_DIR = path.resolve(process.cwd(), 'data/proofs')

export async function GET(req: NextRequest, { params }: { params: { fileName: string } }) {
  try {
    const { fileName } = params

    // Prevent directory traversal
    const safeName = path.basename(fileName)
    const filePath = path.join(PROOFS_DIR, safeName)

    if (!fs.existsSync(filePath)) {
      return new NextResponse('File bukti tidak ditemukan.', { status: 404 })
    }

    const fileBuffer = fs.readFileSync(filePath)
    const ext = path.extname(safeName).toLowerCase()
    const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    })
  } catch (error: any) {
    return new NextResponse('Gagal memuat bukti pembayaran.', { status: 500 })
  }
}
