// Função serverless (Vercel/Netlify-compatível em estilo Node) — GET /api/preview?url=...
import { fetchPreview } from '../server/preview'

export default async function handler(req: any, res: any) {
  const url = new URL(req.url, 'http://x').searchParams.get('url')
  if (!url) return res.status(400).json({ error: 'url ausente' })
  try {
    const data = await fetchPreview(url)
    res.setHeader('cache-control', 's-maxage=86400, stale-while-revalidate=604800')
    res.status(200).json(data)
  } catch (e: any) {
    res.status(502).json({ error: String(e?.message ?? e) })
  }
}
