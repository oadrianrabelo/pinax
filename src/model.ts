import { openDB } from 'idb'

export type Kind = 'compra' | 'leitura' | 'video' | 'colecao' | 'outro'

export interface Item {
  id: string
  url: string
  kind: Kind
  createdAt: number
  title?: string
  description?: string
  image?: string
  site?: string
  favicon?: string
  price?: string
  note?: string
  remindAt?: number
  notifiedAt?: number
  doneAt?: number
  loading?: boolean
}

// Cada categoria tem um sigilo grego — a inicial da palavra que a define.
export const KINDS: Record<Kind, { sigil: string; label: string; word: string; meaning: string }> = {
  compra:  { sigil: 'χ', label: 'Desejos',  word: 'χρῆμα',   meaning: 'coisa útil, um bem' },
  leitura: { sigil: 'λ', label: 'Leituras', word: 'λόγος',   meaning: 'palavra, razão' },
  video:   { sigil: 'θ', label: 'Visões',   word: 'θέα',     meaning: 'visão, espetáculo (raiz de “teatro”)' },
  colecao: { sigil: 'σ', label: 'Coleções', word: 'συλλογή', meaning: 'reunião, coleta' },
  outro:   { sigil: 'ξ', label: 'Outros',   word: 'ξένος',   meaning: 'o estrangeiro, o diferente' },
}

const RULES: [Kind, RegExp][] = [
  ['video', /(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|twitch\.tv|netflix\.com|instagram\.com\/reel)/i],
  ['colecao', /(liinks\.co|linktr\.ee|beacons\.ai|lnk\.bio|bio\.link|carrd\.co|campsite\.bio|pinterest\.[a-z.]+\/[^/]+\/[^/]+)/i],
  ['compra', /(amazon\.|mercadolivre|mercadolibre|shopee|aliexpress|magazineluiza|magalu|americanas|etsy\.com|shein|temu\.com|kabum|casasbahia|\/produto|\/product|\/p\/|\/dp\/|\/item)/i],
  ['leitura', /(medium\.com|substack\.com|wikipedia\.org|\/blog\/|\/artigo|\/article|\/noticia|\/news|\/\d{4}\/\d{2}\/)/i],
]

export function guessKind(url: string, ogType?: string, price?: string): Kind {
  for (const [k, re] of RULES) if (re.test(url)) return k
  if (price || /product/i.test(ogType ?? '')) return 'compra'
  if (/video/i.test(ogType ?? '')) return 'video'
  if (/article/i.test(ogType ?? '')) return 'leitura'
  return 'outro'
}

export const URL_RE = /https?:\/\/[^\s<>"'()]+/i
export function extractUrl(text?: string | null): string | null {
  if (!text) return null
  const m = text.match(URL_RE)?.[0]
  if (m) return m.replace(/[.,;:!?]+$/, '')
  const t = text.trim()
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t)) return 'https://' + t
  return null
}

export function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

// Forma canônica pra detectar duplicados (ignora http/https, www, barra final e parâmetros de rastreio)
export function canon(url: string) {
  try {
    const u = new URL(url)
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|si$|igsh)/.test(k)) u.searchParams.delete(k)
    return (u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '') + u.search).toLowerCase()
  } catch { return url }
}

export const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url } }

// ——— Persistência local (IndexedDB) ———
const db = openDB('kairos', 1, { upgrade: (d) => d.createObjectStore('items', { keyPath: 'id' }) })
export const store = {
  all: async () => ((await (await db).getAll('items')) as Item[]).sort((a, b) => b.createdAt - a.createdAt),
  put: async (i: Item) => { await (await db).put('items', i) },
  del: async (id: string) => { await (await db).delete('items', id) },
}

// ——— Lembretes ———
const at = (d: Date, h: number) => { const x = new Date(d); x.setHours(h, 0, 0, 0); return x }
const plusDays = (n: number, h = 9) => { const d = new Date(); d.setDate(d.getDate() + n); return at(d, h).getTime() }

export const REMINDERS: { label: string; when: () => number }[] = [
  { label: 'hoje à noite', when: () => (new Date().getHours() < 19 ? at(new Date(), 20).getTime() : plusDays(1)) },
  { label: 'amanhã', when: () => plusDays(1) },
  { label: 'em 2 dias', when: () => plusDays(2) },
  { label: 'no fim de semana', when: () => { const d = new Date(); const n = (6 - d.getDay() + 7) % 7 || 7; return plusDays(n, 10) } },
  { label: 'em 1 semana', when: () => plusDays(7) },
  { label: 'em 1 mês', when: () => plusDays(30) },
]

const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
export function relative(ts: number) {
  const diff = ts - Date.now()
  const abs = Math.abs(diff)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [['month', 2592e6], ['week', 6048e5], ['day', 864e5], ['hour', 36e5], ['minute', 6e4]]
  for (const [u, ms] of units) if (abs >= ms) return rtf.format(Math.round(diff / ms), u)
  return 'agora'
}

export const isDue = (i: Item) => !i.doneAt && !!i.remindAt && i.remindAt <= Date.now()

// Arquivo .ics: o lembrete vai pro calendário nativo (celular ou desktop) e toca mesmo com o app fechado.
export function downloadIcs(i: Item) {
  const t = i.remindAt ?? plusDays(1)
  const f = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const esc = (s: string) => s.replace(/[\\,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n')
  const title = `${KINDS[i.kind].sigil} ${i.title || host(i.url)}`
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kairos//PT-BR', 'BEGIN:VEVENT',
    `UID:${i.id}@kairos`, `DTSTAMP:${f(Date.now())}`, `DTSTART:${f(t)}`, `DTEND:${f(t + 15 * 6e4)}`,
    `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc((i.note ? i.note + '\n\n' : '') + i.url)}`, `URL:${i.url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  a.download = 'kairos-lembrete.ics'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// ——— Prévia (thumbnail, título, preço) ———
export async function loadPreview(url: string): Promise<Partial<Item> & { type?: string }> {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/)?.[1]
  let data: any = {}
  try {
    const r = await fetch('/api/preview?url=' + encodeURIComponent(url))
    if (r.ok) data = await r.json()
  } catch {}
  if (!data.title || !data.image) {
    try {
      const r = await fetch('https://api.microlink.io/?url=' + encodeURIComponent(url))
      const j = (await r.json()).data ?? {}
      data = {
        title: data.title || j.title, description: data.description || j.description,
        image: data.image || j.image?.url || j.screenshot?.url, site: data.site || j.publisher,
        favicon: data.favicon || j.logo?.url, price: data.price, type: data.type,
      }
    } catch {}
  }
  if (yt) data.image = `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`
  return data
}
