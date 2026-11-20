// Extrai metadados (Open Graph / Twitter / HTML) de uma URL — o "raio-x" do link.
// Usado tanto pelo dev server do Vite quanto pela função serverless em /api/preview.

export interface Preview {
  title?: string
  description?: string
  image?: string
  site?: string
  favicon?: string
  price?: string
  type?: string
}

const PRIVATE_HOST = /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|.*\.local$|.*\.internal$)/i

const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim()

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {}
  const re = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g
  let m: RegExpExecArray | null
  while ((m = re.exec(tag))) out[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? ''
  return out
}

export function parseHtml(html: string, base: URL): Preview {
  const meta: Record<string, string> = {}
  for (const tag of html.match(/<meta\s[^>]*>/gi) ?? []) {
    const a = attrs(tag)
    const key = (a.property || a.name || a.itemprop || '').toLowerCase()
    if (key && a.content && !(key in meta)) meta[key] = decode(a.content)
  }
  let favicon: string | undefined
  for (const tag of html.match(/<link\s[^>]*>/gi) ?? []) {
    const a = attrs(tag)
    if (/(^|\s)(icon|apple-touch-icon)(\s|$)/i.test(a.rel ?? '') && a.href) {
      favicon = a.href
      if (/apple/i.test(a.rel)) break
    }
  }
  const abs = (u?: string) => {
    if (!u) return undefined
    try { return new URL(decode(u), base).href } catch { return undefined }
  }
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  const price = meta['product:price:amount'] || meta['og:price:amount']
  const currency = meta['product:price:currency'] || meta['og:price:currency']
  return {
    title: meta['og:title'] || meta['twitter:title'] || (titleTag ? decode(titleTag) : undefined),
    description: meta['og:description'] || meta['twitter:description'] || meta['description'],
    image: abs(meta['og:image'] || meta['og:image:url'] || meta['twitter:image'] || meta['twitter:image:src'] || meta['image']),
    site: meta['og:site_name'] || base.hostname.replace(/^www\./, ''),
    favicon: abs(favicon) || new URL('/favicon.ico', base).href,
    price: price ? `${currency ? currency + ' ' : ''}${price}` : undefined,
    type: meta['og:type'],
  }
}

export async function fetchPreview(raw: string): Promise<Preview> {
  const url = new URL(raw)
  if (!/^https?:$/.test(url.protocol)) throw new Error('protocolo inválido')
  if (PRIVATE_HOST.test(url.hostname)) throw new Error('host não permitido')
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; KairosPreview/0.1)',
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (!/html/i.test(res.headers.get('content-type') ?? '')) return { site: url.hostname }
  const html = (await res.text()).slice(0, 800_000)
  return parseHtml(html, new URL(res.url || url.href))
}
