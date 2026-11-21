import { openDB } from 'idb'
import { fetchPreview } from './native'

export type Kind = 'compra' | 'leitura' | 'video' | 'imagem' | 'colecao' | 'outro'

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
  // foto, vídeo ou arquivo recebido pelo "Compartilhar" (fica guardado no aparelho)
  media?: { path: string; mime: string; name: string; size: number }
  // sincronização
  updatedAt?: number   // relógio do "último a escrever vence"
  deletedAt?: number   // lápide: apagar também precisa viajar entre aparelhos
  dirty?: boolean      // mudou aqui e ainda não subiu pra nuvem
}

// Cada categoria é uma constelação, com o sigilo grego da palavra que a define.
export const KINDS: Record<Kind, { sigil: string; label: string; one: string; word: string; meaning: string }> = {
  compra:  { sigil: 'χ', label: 'Desejos',  one: 'um desejo',     word: 'χρῆμα',   meaning: 'coisa útil, um bem' },
  leitura: { sigil: 'λ', label: 'Leituras', one: 'uma leitura',   word: 'λόγος',   meaning: 'palavra, razão' },
  video:   { sigil: 'θ', label: 'Visões',   one: 'uma visão',     word: 'θέα',     meaning: 'visão, espetáculo (raiz de “teatro”)' },
  imagem:  { sigil: 'ε', label: 'Imagens',  one: 'uma imagem',    word: 'εἰκών',   meaning: 'imagem, retrato (origem de “ícone”)' },
  colecao: { sigil: 'σ', label: 'Coleções', one: 'uma coleção',   word: 'συλλογή', meaning: 'reunião, coleta' },
  outro:   { sigil: 'ξ', label: 'Outros',   one: 'outra coisa',   word: 'ξένος',   meaning: 'o estrangeiro, o diferente' },
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

export const host = (url: string) => { if (!url) return ''; try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url } }

/** De onde a coisa veio, para mostrar no lugar do domínio. */
export function origin(i: Item) {
  if (!i.media) return i.site || host(i.url) || 'nota'
  const m = i.media.mime
  return m.startsWith('image/') ? 'foto' : m.startsWith('video/') ? 'vídeo' : m === 'application/pdf' ? 'pdf' : 'arquivo'
}

/** Nome do item quando ele não tem título. */
export function label(i: Item) {
  return i.title || (i.media ? i.media.name : host(i.url)) || 'sem título'
}

export function mediaKind(mime: string): Kind {
  if (mime.startsWith('image/')) return 'imagem'
  if (mime.startsWith('video/')) return 'video'
  if (mime === 'application/pdf' || mime.startsWith('text/')) return 'leitura'
  return 'outro'
}

// ——— Persistência local (IndexedDB) ———
const db = openDB('rete', 1, { upgrade: (d) => d.createObjectStore('items', { keyPath: 'id' }) })
export const store = {
  raw: async () => (await (await db).getAll('items')) as Item[],
  all: async () => (await store.raw()).filter((i) => !i.deletedAt).sort((a, b) => b.createdAt - a.createdAt),
  get: async (id: string) => (await (await db).get('items', id)) as Item | undefined,
  put: async (i: Item) => { await (await db).put('items', i) },
  // mudança local: carimba a hora e marca pra subir
  touch: (i: Item): Item => ({ ...i, updatedAt: Math.max(Date.now(), (i.updatedAt ?? 0) + 1), dirty: true }),
}

// ——— Lembretes ———
const at = (d: Date, h: number) => { const x = new Date(d); x.setHours(h, 0, 0, 0); return x }
const plusDays = (n: number, h = 9) => { const d = new Date(); d.setDate(d.getDate() + n); return at(d, h).getTime() }

// `h` = hora preferida do dia para lembretes (ajustável no Ateliê)
export const REMINDERS: { label: string; when: (h: number) => number }[] = [
  { label: 'hoje à noite', when: (h) => (new Date().getHours() < 19 ? at(new Date(), 20).getTime() : plusDays(1, h)) },
  { label: 'amanhã', when: (h) => plusDays(1, h) },
  { label: 'em 2 dias', when: (h) => plusDays(2, h) },
  { label: 'no fim de semana', when: (h) => { const d = new Date(); const n = (6 - d.getDay() + 7) % 7 || 7; return plusDays(n, Math.max(h, 10)) } },
  { label: 'em 1 semana', when: (h) => plusDays(7, h) },
  { label: 'em 1 mês', when: (h) => plusDays(30, h) },
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
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rete//PT-BR', 'BEGIN:VEVENT',
    `UID:${i.id}@rete`, `DTSTAMP:${f(Date.now())}`, `DTSTART:${f(t)}`, `DTEND:${f(t + 15 * 6e4)}`,
    `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc((i.note ? i.note + '\n\n' : '') + i.url)}`, `URL:${i.url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  a.download = 'rete-lembrete.ics'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// ——— Prévia (thumbnail, título, preço) ———
export async function loadPreview(url: string): Promise<Partial<Item> & { type?: string }> {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/)?.[1]
  let data: any = (await fetchPreview(url)) ?? {}
  if (!data.title || !data.image) {
    try {
      const r = await fetch('https://api.microlink.io/?url=' + encodeURIComponent(url))
      const j = (await r.json()).data ?? {}
      data = {
        title: data.title || j.title, description: data.description || j.description,
        image: data.image || j.image?.url, site: data.site || j.publisher,
        favicon: data.favicon || j.logo?.url, price: data.price, type: data.type,
      }
    } catch {}
  }
  if (yt) data.image = `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`
  return data
}
