import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { AdminSessionService } from '@/lib/auth/adminSessionService'

const PROOFS_DIR = process.env.VERCEL ? path.join('/tmp', 'amm-data/proofs') : path.resolve(process.cwd(), 'data/proofs')

export async function GET(req: NextRequest, { params }: { params: { fileName: string } }) {
  try {
    const auth = AdminSessionService.verifyAdminRequest(req)
    if (!auth.authorized) {
      return new NextResponse('Akses ditolak. Sesi staf admin diperlukan.', { status: 401 })
    }

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
