import { useSyncExternalStore } from 'react'
import { fontById, loadFont, stack, FONTS, type Role } from './fonts'

export interface Palette {
  name: string
  dark: boolean
  ink: string; ink2: string; ink3: string
  paper: string; paperDim: string; muted: string
  gold: string; onGold: string; rose: string
  glow: [string, string, string]
  pattern?: string
}

const lines = (c: string) => `repeating-linear-gradient(transparent 0 31px, ${c} 31px 32px)`

export const PALETTES: Record<string, Palette> = {
  delfos:    { name: 'Noite de Delfos', dark: true, ink: '#0c0a12', ink2: '#15111f', ink3: '#1f1930', paper: '#f3e6cf', paperDim: '#b9ad9a', muted: '#7d7489', gold: '#e8c27a', onGold: '#0c0a12', rose: '#e98f8a', glow: ['#8c5adc38', '#e8c27a1a', '#e98f8a1a'] },
  pergaminho:{ name: 'Pergaminho', dark: false, ink: '#efe3c8', ink2: '#f7eedb', ink3: '#e4d4b2', paper: '#2b1d12', paperDim: '#5c4630', muted: '#8a7458', gold: '#a3261b', onGold: '#f7eedb', rose: '#1f4e5f', glow: ['#a3261b14', '#c9a06233', '#1f4e5f14'] },
  marmore:   { name: 'Mármore de Carrara', dark: false, ink: '#ecebe7', ink2: '#f8f7f4', ink3: '#dedcd5', paper: '#1d1f24', paperDim: '#4b4f58', muted: '#8a8d94', gold: '#b5552f', onGold: '#ffffff', rose: '#6d7f5a', glow: ['#b5552f14', '#9aa4b233', '#6d7f5a14'] },
  jerusalem: { name: 'Pedra de Jerusalém', dark: false, ink: '#ede2cf', ink2: '#f6eee0', ink3: '#e0d2b8', paper: '#14213d', paperDim: '#3f4c69', muted: '#8a8270', gold: '#1f3fa3', onGold: '#f6eee0', rose: '#b88a2b', glow: ['#1f3fa314', '#d4b06a40', '#b88a2b1a'] },
  bodoni:    { name: 'Parma', dark: false, ink: '#f4efe4', ink2: '#fbf8f1', ink3: '#e8e0cf', paper: '#111111', paperDim: '#3d3a35', muted: '#8b857a', gold: '#d1121b', onGold: '#ffffff', rose: '#111111', glow: ['#d1121b0d', '#00000008', '#d1121b08'] },
  brutal:    { name: 'Concreto', dark: true, ink: '#0b0b0b', ink2: '#151515', ink3: '#222222', paper: '#f2f2ee', paperDim: '#b5b5ad', muted: '#76766f', gold: '#c6ff3d', onGold: '#0b0b0b', rose: '#ff5c39', glow: ['#c6ff3d14', '#ffffff08', '#ff5c3914'] },
  caderno:   { name: 'Caderno', dark: false, ink: '#fbf8ef', ink2: '#fffdf7', ink3: '#efe9d8', paper: '#1c2a4a', paperDim: '#3e4d6e', muted: '#8f97a8', gold: '#e2463b', onGold: '#ffffff', rose: '#2f6fd6', glow: ['#00000000', '#00000000', '#00000000'], pattern: lines('#2f6fd61f') },
  neon:      { name: 'Neon', dark: true, ink: '#08061a', ink2: '#110d2b', ink3: '#1c1642', paper: '#f1ecff', paperDim: '#b2a9d6', muted: '#7a70a8', gold: '#ff4fd8', onGold: '#08061a', rose: '#38e8ff', glow: ['#ff4fd833', '#38e8ff26', '#7a4fff33'] },
  toscana:   { name: 'Toscana', dark: true, ink: '#14160f', ink2: '#1d2017', ink3: '#2a2e21', paper: '#efe7d2', paperDim: '#b8b099', muted: '#7f7d6a', gold: '#d9a441', onGold: '#14160f', rose: '#c0613a', glow: ['#6d7f3a33', '#d9a4411f', '#c0613a1f'] },
  abismo:    { name: 'Abismo', dark: true, ink: '#03090d', ink2: '#08141b', ink3: '#0f2029', paper: '#d8ece9', paperDim: '#94b3b0', muted: '#5d7b7a', gold: '#5ce1c6', onGold: '#03090d', rose: '#7aa7ff', glow: ['#1d8f8a33', '#5ce1c614', '#2b4cff1f'] },
}

export interface Prefs {
  preset: string
  palette: string
  accent: string | null
  display: string; body: string; mono: string; sigil: string
  scale: number
  tilt: number
  density: 'arejado' | 'confortável' | 'compacto'
  radius: number
  grain: boolean
  motion: boolean
  oracle: boolean
  astrolabe: boolean
  italicTitle: boolean
  cardFont: 'display' | 'body'
  reminderHour: number
  title: string
  subtitle: string
  updatedAt: number
}

type Look = Pick<Prefs, 'palette' | 'display' | 'body' | 'mono' | 'sigil'> & Partial<Prefs>
export const PRESETS: Record<string, Look & { name: string; motto: string }> = {
  delfos:     { name: 'Delfos', motto: 'o oráculo à noite', palette: 'delfos', display: 'instrument-serif', body: 'geist', mono: 'geist-mono', sigil: 'gfs-didot' },
  scriptorium:{ name: 'Scriptorium', motto: 'monges, tinta e pergaminho', palette: 'pergaminho', display: 'im-fell-english', body: 'cormorant-garamond', mono: 'courier-prime', sigil: 'alegreya', radius: 4 },
  roma:       { name: 'Roma', motto: 'SPQR em mármore', palette: 'marmore', display: 'cinzel', body: 'spectral', mono: 'martian-mono', sigil: 'noto-serif-display', italicTitle: false, radius: 2 },
  yerushalayim:{ name: 'Yerushalayim', motto: 'pedra dourada e lápis-lazúli', palette: 'jerusalem', display: 'bellefair', body: 'frank-ruhl-libre', mono: 'red-hat-mono', sigil: 'gfs-didot', italicTitle: false },
  parma:      { name: 'Parma', motto: 'Bodoni, preto e vermelho', palette: 'bodoni', display: 'bodoni-moda', body: 'hanken-grotesk', mono: 'xanh-mono', sigil: 'noto-serif-display', radius: 0, tilt: 0 },
  concreto:   { name: 'Concreto', motto: 'brutalismo ácido', palette: 'brutal', display: 'unbounded', body: 'bricolage-grotesque', mono: 'fragment-mono', sigil: 'syne', italicTitle: false, radius: 0, tilt: 0, grain: false, cardFont: 'body' },
  caderno:    { name: 'Caderno', motto: 'anotado à mão', palette: 'caderno', display: 'homemade-apple', body: 'kalam', mono: 'courier-prime', sigil: 'comfortaa', italicTitle: false, tilt: 2, cardFont: 'body' },
  neon:       { name: 'Neon', motto: 'letreiro às 3 da manhã', palette: 'neon', display: 'monoton', body: 'darker-grotesque', mono: 'major-mono-display', sigil: 'advent-pro', italicTitle: false, cardFont: 'body' },
  toscana:    { name: 'Toscana', motto: 'oliveiras e terracota', palette: 'toscana', display: 'italiana', body: 'petrona', mono: 'spline-sans-mono', sigil: 'piazzolla', italicTitle: false },
  abismo:     { name: 'Abismo', motto: 'bioluminescência', palette: 'abismo', display: 'gloock', body: 'atkinson-hyperlegible', mono: 'victor-mono', sigil: 'victor-mono' },
  gotico:     { name: 'Mainz, 1455', motto: 'Gutenberg acordou', palette: 'pergaminho', display: 'unifrakturmaguntia', body: 'im-fell-english', mono: 'azeret-mono', sigil: 'gfs-neohellenic', italicTitle: false, radius: 2, cardFont: 'body' },
}

export const DEFAULTS: Prefs = {
  preset: 'delfos', palette: 'delfos', accent: null,
  display: 'instrument-serif', body: 'geist', mono: 'geist-mono', sigil: 'gfs-didot',
  scale: 1, tilt: 1, density: 'confortável', radius: 16,
  grain: true, motion: true, oracle: true, astrolabe: true, italicTitle: true,
  reminderHour: 9, title: 'Kairos', subtitle: 'καιρός · o momento oportuno', cardFont: 'display', updatedAt: 0,
}

const KEY = 'kairos:prefs'
let current: Prefs = (() => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return DEFAULTS }
})()
const subs = new Set<() => void>()

export const getPrefs = () => current
export function setPrefs(p: Partial<Prefs>, opts: { remote?: boolean } = {}) {
  current = { ...current, ...p, updatedAt: opts.remote ? p.updatedAt ?? current.updatedAt : Date.now() }
  try { localStorage.setItem(KEY, JSON.stringify(current)) } catch {}
  apply(current)
  subs.forEach((f) => f())
}
export function usePrefs() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, getPrefs)
}
export function applyPreset(id: string) {
  const { name: _n, motto: _m, ...look } = PRESETS[id]
  const base = { radius: DEFAULTS.radius, tilt: DEFAULTS.tilt, grain: DEFAULTS.grain, italicTitle: DEFAULTS.italicTitle, cardFont: DEFAULTS.cardFont }
  setPrefs({ ...base, ...look, preset: id, accent: null })
}

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]
export function surprise() {
  const of = (r: Role) => FONTS.filter((x) => x.roles.includes(r)).map((x) => x.id)
  setPrefs({
    preset: 'acaso', palette: pick(Object.keys(PALETTES)), accent: null,
    display: pick(of('display')), body: pick(of('body')), mono: pick(of('mono')), sigil: pick(of('sigil')),
    italicTitle: Math.random() < 0.5, cardFont: pick(['display', 'body'] as const), tilt: pick([0, 1, 1.5, 2]), radius: pick([0, 6, 16, 24]),
  })
}

export function apply(p: Prefs) {
  const pal = PALETTES[p.palette] ?? PALETTES.delfos
  const s = document.documentElement.style
  const vars: Record<string, string> = {
    '--ink': pal.ink, '--ink-2': pal.ink2, '--ink-3': pal.ink3, '--paper': pal.paper, '--paper-dim': pal.paperDim,
    '--muted': pal.muted, '--gold': p.accent ?? pal.gold, '--on-gold': p.accent ? pickOn(p.accent) : pal.onGold, '--rose': pal.rose,
    '--glow-1': pal.glow[0], '--glow-2': pal.glow[1], '--glow-3': pal.glow[2], '--pattern': pal.pattern ?? 'none',
    '--shadow': pal.dark ? 'rgba(0,0,0,.75)' : 'rgba(60,45,25,.22)',
    '--tilt-k': String(p.tilt), '--radius': p.radius + 'px', '--title-style': p.italicTitle ? 'italic' : 'normal',
    '--col': { arejado: '300px', 'confortável': '250px', compacto: '190px' }[p.density],
    '--gap': { arejado: '28px', 'confortável': '20px', compacto: '12px' }[p.density],
  }
  for (const r of ['display', 'body', 'mono', 'sigil'] as Role[]) {
    const font = fontById(p[r]); loadFont(font)
    vars['--' + r] = stack(font, r)
  }
  vars['--card'] = p.cardFont === 'body' ? vars['--body'] : vars['--display']
  for (const [k, v] of Object.entries(vars)) s.setProperty(k, v)
  s.fontSize = `${16 * p.scale}px`
  s.colorScheme = pal.dark ? 'dark' : 'light'
  document.documentElement.classList.toggle('no-grain', !p.grain)
  document.documentElement.classList.toggle('still', !p.motion)
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', pal.ink)
}

// texto legível sobre a cor de destaque escolhida
function pickOn(hex: string) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#111111' : '#ffffff'
}

apply(current)
