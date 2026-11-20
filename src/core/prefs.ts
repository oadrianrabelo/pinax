import { useSyncExternalStore } from 'react'
import { fontById, loadFont, stack, FONTS, type Role } from './fonts'

// ——— Pigmentos ———
// Cada paleta é feita de pigmentos que existiram de verdade na época que ela evoca.
export interface Pigment { name: string; hex: string; note: string }
export interface Palette {
  name: string
  dark: boolean
  ink: Pigment      // fundo
  ink2: string      // superfície
  ink3: string      // superfície funda
  paper: Pigment    // texto
  paperDim: string
  muted: string
  gold: Pigment     // destaque (botões, rubricas)
  onGold: string
  rose: Pigment     // segundo destaque
  glow: [string, string, string]
  pattern?: string
}

const pg = (name: string, hex: string, note: string): Pigment => ({ name, hex, note })
const fibers = (c: string) => `repeating-linear-gradient(0deg, ${c} 0 1px, transparent 1px 7px), repeating-linear-gradient(90deg, ${c} 0 1px, transparent 1px 23px)`
const lines = (c: string) => `repeating-linear-gradient(transparent 0 31px, ${c} 31px 32px)`
const tesserae = (c: string) => `radial-gradient(${c} 1px, transparent 1.5px) 0 0 / 9px 9px`

export const PALETTES: Record<string, Palette> = {
  biblos: {
    name: 'Púrpura de Tiro', dark: true,
    ink: pg('Púrpura escura', '#1d0f14', 'Tingida de múrex, um caramujo do mar. Valia mais que ouro.'),
    ink2: '#29151e', ink3: '#381d2a',
    paper: pg('Linho cru', '#f0e4cc', 'O tecido que os fenícios levavam pelo Mediterrâneo.'), paperDim: '#c9b39d', muted: '#8f7581',
    gold: pg('Cedro do Líbano', '#c98c4b', 'A madeira dos navios e dos templos.'), onGold: '#1d0f14',
    rose: pg('Púrpura de Tiro', '#a3346c', 'Dela vem o nome “Fenícia”: terra da púrpura.'),
    glow: ['#a3346c38', '#c98c4b1f', '#5b1f4a33'],
  },
  delfos: {
    name: 'Noite de Delfos', dark: true,
    ink: pg('Negro de fumo', '#15100c', 'Fuligem de lamparina — o preto mais antigo que existe.'),
    ink2: '#1f1812', ink3: '#2b2119',
    paper: pg('Osso', '#efe0c2', 'O branco quente do marfim e do osso polido.'), paperDim: '#bba98a', muted: '#857560',
    gold: pg('Bronze de Delfos', '#d4a24c', 'O metal das trípodes onde a Pítia se sentava.'), onGold: '#15100c',
    rose: pg('Ocre vermelho', '#b4513f', 'O laranja-tijolo dos vasos de figuras vermelhas.'),
    glow: ['#b4513f2e', '#d4a24c1f', '#5a2a4a33'],
  },
  alexandria: {
    name: 'Papiro', dark: false,
    ink: pg('Papiro', '#e8d9b0', 'Folhas de junco do Nilo, prensadas em cruz.'),
    ink2: '#f1e6c6', ink3: '#dccb9b',
    paper: pg('Tinta de carbono', '#29200f', 'Fuligem, goma arábica e água.'), paperDim: '#5a4a2c', muted: '#8d7b52',
    gold: pg('Azul egípcio', '#1f5fa8', 'O primeiro pigmento sintético da história, c. 2500 a.C.'), onGold: '#f1e6c6',
    rose: pg('Ocre vermelho', '#b5532f', 'Terra com óxido de ferro, usada nas rubricas.'),
    glow: ['#1f5fa814', '#c9a24d26', '#b5532f14'], pattern: fibers('#8d7b5214'),
  },
  jerusalem: {
    name: 'Pedra de Jerusalém', dark: false,
    ink: pg('Calcário meleke', '#ece0c8', 'A pedra clara que fica dourada ao pôr do sol.'),
    ink2: '#f5ecdb', ink3: '#e0d0b0',
    paper: pg('Tinta de nogueira', '#1b2440', 'Escura e azulada, dos rolos copiados à mão.'), paperDim: '#46506b', muted: '#8d846f',
    gold: pg('Lápis-lazúli', '#2747a6', 'Pedra azul vinda do Afeganistão, moída em pó.'), onGold: '#f5ecdb',
    rose: pg('Ouro do Templo', '#b8892c', 'Folha de ouro sobre cedro.'),
    glow: ['#2747a614', '#d4b06a40', '#b8892c1a'],
  },
  pompeia: {
    name: 'Vermelho Pompeiano', dark: true,
    ink: pg('Negro de afresco', '#1a1311', 'O fundo preto das paredes da Vila dos Mistérios.'),
    ink2: '#24191a', ink3: '#33221f',
    paper: pg('Cal', '#f0dfc0', 'Reboco de cal e pó de mármore.'), paperDim: '#c2ab8a', muted: '#8c7a64',
    gold: pg('Cinábrio', '#c0382c', 'Sulfeto de mercúrio: o vermelho caríssimo de Pompeia.'), onGold: '#f7e9d2',
    rose: pg('Ocre amarelo', '#d9a441', 'Terra amarela da Toscana e da Campânia.'),
    glow: ['#c0382c33', '#d9a4411f', '#6b2a1f26'],
  },
  marmore: {
    name: 'Mármore de Carrara', dark: false,
    ink: pg('Mármore', '#ecebe6', 'De Carrara, o mesmo da Coluna de Trajano.'),
    ink2: '#f8f7f3', ink3: '#dedcd4',
    paper: pg('Sombra entalhada', '#22201d', 'A sombra que o cinzel deixa no sulco da letra.'), paperDim: '#4c4842', muted: '#8a867e',
    gold: pg('Mínio', '#8e2f2a', 'O vermelho que pintava o fundo das letras gravadas.'), onGold: '#ffffff',
    rose: pg('Verde-terra', '#5d6b4a', 'Argila esverdeada de Verona.'),
    glow: ['#8e2f2a12', '#9aa4b233', '#5d6b4a14'],
  },
  bizancio: {
    name: 'Mosaico de Bizâncio', dark: true,
    ink: pg('Púrpura imperial', '#160f1c', 'Só o imperador podia vestir. Os filhos “nascidos na púrpura”.'),
    ink2: '#21162a', ink3: '#2e2038',
    paper: pg('Pergaminho', '#f1e3c4', 'Pele de cabra, alisada com pedra-pomes.'), paperDim: '#c4b08c', muted: '#8b7a8c',
    gold: pg('Tessela de ouro', '#e0b54a', 'Folha de ouro presa entre dois vidros.'), onGold: '#160f1c',
    rose: pg('Pórfiro', '#8a2a5e', 'A pedra vermelho-púrpura dos sarcófagos imperiais.'),
    glow: ['#8a2a5e40', '#e0b54a26', '#1f4a7a26'], pattern: tesserae('#e0b54a10'),
  },
  bagda: {
    name: 'Casa da Sabedoria', dark: true,
    ink: pg('Índigo', '#0e1a22', 'Anil da Índia, a cor do céu às três da manhã.'),
    ink2: '#142430', ink3: '#1c3140',
    paper: pg('Papel de Samarcanda', '#f3e7cf', 'O papel chegou ao Islã em 751 e mudou tudo.'), paperDim: '#b9c2bb', muted: '#6f8a8f',
    gold: pg('Latão de astrolábio', '#d3a54a', 'Liga de cobre e zinco dos instrumentos de al-Fazari.'), onGold: '#0e1a22',
    rose: pg('Turquesa', '#2fa39a', 'Pedra de Nishapur, nos azulejos das cúpulas.'),
    glow: ['#2fa39a26', '#d3a54a1f', '#1d3f7a33'],
  },
  pergaminho: {
    name: 'Scriptorium', dark: false,
    ink: pg('Velino', '#efe3c8', 'Pergaminho fino de bezerro.'),
    ink2: '#f7eedb', ink3: '#e4d4b2',
    paper: pg('Tinta ferrogálica', '#2b1d12', 'Galhas de carvalho e sulfato de ferro. Escurece com os séculos.'), paperDim: '#5c4630', muted: '#8a7458',
    gold: pg('Vermelhão', '#a3261b', 'O vermelho das rubricas — de onde vem a palavra “rubrica”.'), onGold: '#f7eedb',
    rose: pg('Ultramar', '#1f4e8f', 'Lápis-lazúli moído; reservado para o manto da Virgem.'),
    glow: ['#a3261b14', '#c9a06233', '#1f4e8f14'],
  },
  mainz: {
    name: 'Prelo de Gutenberg', dark: false,
    ink: pg('Papel de trapo', '#f1e8d4', 'Feito de linho velho batido em pasta.'),
    ink2: '#faf4e6', ink3: '#e2d6bc',
    paper: pg('Tinta a óleo', '#141210', 'Gutenberg inventou também a tinta: fuligem com óleo de linhaça.'), paperDim: '#45403a', muted: '#8a8273',
    gold: pg('Rubro de Mainz', '#b0221c', 'As iniciais pintadas à mão depois da impressão.'), onGold: '#faf4e6',
    rose: pg('Azul de azurita', '#2d5b8c', 'Mineral de cobre, mais barato que o ultramar.'),
    glow: ['#b0221c0f', '#00000008', '#2d5b8c0f'],
  },
  toscana: {
    name: 'Bottega Florentina', dark: true,
    ink: pg('Terra de sombra', '#17140e', 'Argila escura da Úmbria.'),
    ink2: '#211d15', ink3: '#2e2a1f',
    paper: pg('Gesso', '#efe7d2', 'Base de gesso e cola de coelho das têmperas.'), paperDim: '#b8b099', muted: '#7f7d6a',
    gold: pg('Terra de Siena', '#d08a3c', 'Queimada, fica cor de telha toscana.'), onGold: '#17140e',
    rose: pg('Verde-terra', '#7d8a4a', 'Por baixo dos rostos, para a pele parecer viva.'),
    glow: ['#6d7f3a33', '#d08a3c1f', '#c0613a1f'],
  },
  bodoni: {
    name: 'Parma', dark: false,
    ink: pg('Papel vergé', '#f4efe4', 'Com as marcas da tela de arame da forma.'),
    ink2: '#fbf8f1', ink3: '#e8e0cf',
    paper: pg('Negro de Bodoni', '#111111', 'Preto denso para hastes finíssimas.'), paperDim: '#3d3a35', muted: '#8b857a',
    gold: pg('Vermelho Parma', '#d1121b', 'O vermelho dos frontispícios do Manuale Tipografico.'), onGold: '#ffffff',
    rose: pg('Negro de Bodoni', '#111111', '—'),
    glow: ['#d1121b0d', '#00000008', '#d1121b08'],
  },
  brutal: {
    name: 'Concreto', dark: true,
    ink: pg('Concreto aparente', '#121212', 'Béton brut — de onde vem “brutalismo”.'),
    ink2: '#1a1a1a', ink3: '#262626',
    paper: pg('Giz', '#f2f2ee', '—'), paperDim: '#b5b5ad', muted: '#76766f',
    gold: pg('Verde sinal', '#c6ff3d', 'Tinta de demarcação de obra.'), onGold: '#0b0b0b',
    rose: pg('Laranja segurança', '#ff5c39', '—'),
    glow: ['#c6ff3d14', '#ffffff08', '#ff5c3914'],
  },
  neon: {
    name: 'Neon', dark: true,
    ink: pg('Asfalto molhado', '#08061a', '—'),
    ink2: '#110d2b', ink3: '#1c1642',
    paper: pg('Néon branco', '#f1ecff', '—'), paperDim: '#b2a9d6', muted: '#7a70a8',
    gold: pg('Néon rosa', '#ff4fd8', 'Gás neônio com fósforo.'), onGold: '#08061a',
    rose: pg('Argônio', '#38e8ff', 'O azul do argônio com mercúrio.'),
    glow: ['#ff4fd833', '#38e8ff26', '#7a4fff33'],
  },
  caderno: {
    name: 'Caderno', dark: false,
    ink: pg('Papel pautado', '#fbf8ef', '—'),
    ink2: '#fffdf7', ink3: '#efe9d8',
    paper: pg('Caneta azul', '#1c2a4a', 'A BIC de sempre.'), paperDim: '#3e4d6e', muted: '#8f97a8',
    gold: pg('Caneta vermelha', '#e2463b', 'A da correção.'), onGold: '#ffffff',
    rose: pg('Marca-texto', '#2f6fd6', '—'),
    glow: ['#00000000', '#00000000', '#00000000'], pattern: lines('#2f6fd61f'),
  },
  abismo: {
    name: 'Abismo', dark: true,
    ink: pg('Fossa abissal', '#03090d', '—'),
    ink2: '#08141b', ink3: '#0f2029',
    paper: pg('Espuma', '#d8ece9', '—'), paperDim: '#94b3b0', muted: '#5d7b7a',
    gold: pg('Luciferina', '#5ce1c6', 'A molécula que faz os bichos do fundo do mar brilharem.'), onGold: '#03090d',
    rose: pg('Água-viva', '#7aa7ff', '—'),
    glow: ['#1d8f8a33', '#5ce1c614', '#2b4cff1f'],
  },
}

// ——— Alfabetos do feitiço (a animação das letras) ———
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => String.fromCodePoint(from + i))
export type ScriptKind = 'grego' | 'semitico' | 'latim'
export const SCRIPTS: Record<string, { label: string; glyphs: string[]; font: string; kind: ScriptKind }> = {
  grego:    { label: 'grego',    kind: 'grego',    glyphs: [...'αβγδεζηθικλμνξοπρστυφχψω'], font: 'gfs-didot' },
  fenicio:  { label: 'fenício',  kind: 'semitico', glyphs: range(0x10900, 0x10915), font: 'noto-sans-phoenician' },
  hebraico: { label: 'hebraico', kind: 'semitico', glyphs: [...'אבגדהוזחטיכלמנסעפצקרשת'], font: 'frank-ruhl-libre' },
  aramaico: { label: 'aramaico', kind: 'semitico', glyphs: range(0x10840, 0x10855), font: 'noto-sans-imperial-aramaic' },
  arabe:    { label: 'árabe',    kind: 'semitico', glyphs: [...'ابجدهوزحطيكلمنسعفصقرشت'], font: 'amiri' },
  latim:    { label: 'latim',    kind: 'latim',    glyphs: [...'ABCDEFGHIKLMNOPQRSTVX'], font: 'cinzel' },
}

// Cada letra latina tem uma irmã nos alfabetos antigos. Os semíticos (fenício, hebraico,
// aramaico, árabe abjad) seguem a mesma ordem de 22 letras: alef, bet, gimel, dalet…
const GREGO: Record<string, string> = { a: 'α', b: 'β', c: 'κ', d: 'δ', e: 'ε', f: 'φ', g: 'γ', h: 'η', i: 'ι', j: 'ι', k: 'κ', l: 'λ', m: 'μ', n: 'ν', o: 'ο', p: 'π', q: 'κ', r: 'ρ', s: 'σ', t: 'τ', u: 'υ', v: 'β', w: 'ω', x: 'ξ', y: 'υ', z: 'ζ' }
const SEMITA: Record<string, number> = { a: 0, b: 1, c: 2, g: 2, d: 3, e: 4, f: 5, u: 5, v: 5, w: 5, z: 6, h: 7, i: 9, j: 9, y: 9, k: 10, l: 11, m: 12, n: 13, x: 14, o: 15, p: 16, q: 18, r: 19, s: 20, t: 21 }
export function counterpart(ch: string, script: { glyphs: string[]; kind: ScriptKind }) {
  const base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (!/[a-z]/.test(base)) return ch
  if (script.kind === 'grego') { const g = GREGO[base]; return ch !== ch.toLowerCase() ? g.toUpperCase() : g }
  if (script.kind === 'semitico') return script.glyphs[SEMITA[base]] ?? ch
  return base.toUpperCase()
}

// ——— Eras: a linha do tempo de temas ———
export interface Era {
  name: string; year: string; place: string; story: string
  palette: string; display: string; body: string; mono: string; sigil: string
  script: keyof typeof SCRIPTS
  radius?: number; grain?: boolean; italicTitle?: boolean; cardFont?: 'display' | 'body'
}
export const ERAS: Record<string, Era> = {
  biblos:      { name: 'Biblos', year: 'c. 1000 a.C.', place: 'Fenícia', story: 'Onde nasceu o alfabeto: 22 letras que viraram o grego, o hebraico, o aramaico e o latim.', palette: 'biblos', display: 'marcellus', body: 'gentium-book-plus', mono: 'red-hat-mono', sigil: 'gentium-book-plus', script: 'fenicio', italicTitle: false },
  delfos:      { name: 'Delfos', year: 'c. 600 a.C.', place: 'Grécia', story: 'O oráculo respondia em enigmas, à luz de lamparinas, no centro do mundo.', palette: 'delfos', display: 'instrument-serif', body: 'alegreya', mono: 'xanh-mono', sigil: 'gfs-didot', script: 'grego' },
  alexandria:  { name: 'Alexandria', year: 'c. 250 a.C.', place: 'Egito', story: 'Meio milhão de rolos de papiro. Todo navio que atracava tinha seus livros copiados.', palette: 'alexandria', display: 'cormorant-unicase', body: 'gentium-book-plus', mono: 'courier-prime', sigil: 'gentium-book-plus', script: 'grego', italicTitle: false, radius: 2 },
  yerushalayim:{ name: 'Yerushalayim', year: 'c. 20 a.C.', place: 'Judeia', story: 'Pedra dourada, lápis-lazúli e rolos copiados letra por letra. O hebraico quadrado veio do aramaico.', palette: 'jerusalem', display: 'bellefair', body: 'frank-ruhl-libre', mono: 'red-hat-mono', sigil: 'gfs-didot', script: 'hebraico', italicTitle: false },
  pompeia:     { name: 'Pompeia', year: '79 d.C.', place: 'Campânia', story: 'Paredes vermelhas de cinábrio, grafites de amor e propaganda — congelados numa tarde.', palette: 'pompeia', display: 'rozha-one', body: 'spectral', mono: 'courier-prime', sigil: 'noto-serif-display', script: 'latim', italicTitle: false },
  roma:        { name: 'Roma', year: '113 d.C.', place: 'Fórum de Trajano', story: 'As letras da base da Coluna de Trajano ainda são o modelo das maiúsculas do mundo.', palette: 'marmore', display: 'cinzel', body: 'spectral', mono: 'martian-mono', sigil: 'noto-serif-display', script: 'latim', italicTitle: false, radius: 2 },
  bizancio:    { name: 'Bizâncio', year: '537', place: 'Constantinopla', story: 'Santa Sofia: uma cúpula que parecia flutuar sobre um anel de luz e ouro.', palette: 'bizancio', display: 'cinzel-decorative', body: 'eb-garamond', mono: 'red-hat-mono', sigil: 'gfs-neohellenic', script: 'grego', italicTitle: false },
  bagda:       { name: 'Bagdá', year: '830', place: 'Bayt al-Hikma', story: 'Na Casa da Sabedoria traduziam os gregos e aperfeiçoavam o astrolábio.', palette: 'bagda', display: 'reem-kufi', body: 'amiri', mono: 'spline-sans-mono', sigil: 'piazzolla', script: 'arabe', italicTitle: false },
  scriptorium: { name: 'Scriptorium', year: 'c. 1150', place: 'Abadia', story: 'Monges, velino e vermelhão. A primeira letra de cada capítulo era uma pequena pintura.', palette: 'pergaminho', display: 'im-fell-english', body: 'eb-garamond', mono: 'courier-prime', sigil: 'eb-garamond', script: 'grego', radius: 4 },
  mainz:       { name: 'Mainz', year: '1455', place: 'Oficina de Gutenberg', story: 'Tipos móveis, tinta a óleo e 180 Bíblias. As iniciais ainda eram pintadas à mão.', palette: 'mainz', display: 'unifrakturmaguntia', body: 'im-fell-english', mono: 'azeret-mono', sigil: 'gfs-neohellenic', script: 'latim', italicTitle: false, radius: 2, cardFont: 'body' },
  florenca:    { name: 'Florença', year: '1480', place: 'Bottega', story: 'Têmpera de ovo, terra de Siena e a perspectiva recém-inventada.', palette: 'toscana', display: 'italiana', body: 'petrona', mono: 'spline-sans-mono', sigil: 'piazzolla', script: 'latim', italicTitle: false },
  parma:       { name: 'Parma', year: '1818', place: 'Stamperia Bodoni', story: 'O Manuale Tipografico: 142 alfabetos romanos, preto e vermelho, contraste extremo.', palette: 'bodoni', display: 'bodoni-moda', body: 'sorts-mill-goudy', mono: 'xanh-mono', sigil: 'noto-serif-display', script: 'latim', radius: 0 },
  concreto:    { name: 'Concreto', year: '1968', place: 'Brutalismo', story: 'Concreto aparente, grids rígidos e um verde de canteiro de obras.', palette: 'brutal', display: 'unbounded', body: 'bricolage-grotesque', mono: 'fragment-mono', sigil: 'syne', script: 'latim', italicTitle: false, radius: 0, grain: false, cardFont: 'body' },
  neon:        { name: 'Neon', year: '1984', place: 'Letreiros', story: 'Gás, vidro curvado à mão e uma cidade que não dorme.', palette: 'neon', display: 'monoton', body: 'darker-grotesque', mono: 'major-mono-display', sigil: 'advent-pro', script: 'grego', italicTitle: false, cardFont: 'body' },
  caderno:     { name: 'Caderno', year: 'hoje', place: 'Sua mesa', story: 'Pauta azul, caneta BIC e a letra de quem anota rápido.', palette: 'caderno', display: 'homemade-apple', body: 'kalam', mono: 'courier-prime', sigil: 'comfortaa', script: 'latim', italicTitle: false, cardFont: 'body' },
  abismo:      { name: 'Abismo', year: 'amanhã', place: 'Fossa das Marianas', story: 'Onde a única luz é a que os próprios bichos fazem.', palette: 'abismo', display: 'gloock', body: 'atkinson-hyperlegible', mono: 'victor-mono', sigil: 'victor-mono', script: 'grego' },
}

export interface Prefs {
  era: string
  palette: string
  accent: string | null
  display: string; body: string; mono: string; sigil: string
  script: string            // 'era' = o alfabeto da era
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

export const DEFAULTS: Prefs = {
  era: 'delfos', palette: 'delfos', accent: null,
  display: 'instrument-serif', body: 'alegreya', mono: 'xanh-mono', sigil: 'gfs-didot', script: 'era',
  scale: 1, tilt: 0, density: 'confortável', radius: 4,
  grain: true, motion: true, oracle: true, astrolabe: true, italicTitle: true, cardFont: 'display',
  reminderHour: 9, title: 'Rete', subtitle: 'a rede de estrelas do ἀστρολάβος', updatedAt: 0,
}

const KEY = 'rete:prefs'
let current: Prefs = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    if (saved.tilt && !saved.straightened) { saved.tilt = 0; saved.straightened = true }
    delete saved.tape
    return { ...DEFAULTS, ...saved }
  } catch { return DEFAULTS }
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

export function applyEra(id: string) {
  const e = ERAS[id]
  setPrefs({
    era: id, palette: e.palette, accent: null, display: e.display, body: e.body, mono: e.mono, sigil: e.sigil,
    radius: e.radius ?? DEFAULTS.radius, grain: e.grain ?? DEFAULTS.grain,
    italicTitle: e.italicTitle ?? DEFAULTS.italicTitle, cardFont: e.cardFont ?? DEFAULTS.cardFont,
  })
}

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]
export function surprise() {
  const of = (r: Role) => FONTS.filter((x) => x.roles.includes(r)).map((x) => x.id)
  setPrefs({
    era: 'acaso', palette: pick(Object.keys(PALETTES)), accent: null,
    display: pick(of('display')), body: pick(of('body')), mono: pick(of('mono')), sigil: pick(of('sigil')),
    script: pick(Object.keys(SCRIPTS)), italicTitle: Math.random() < 0.5, cardFont: pick(['display', 'body'] as const),
    radius: pick([0, 4, 8, 14]),
  })
}

/** O alfabeto em uso no feitiço. */
export function activeScript(p: Prefs = current) {
  const key = p.script === 'era' ? ERAS[p.era]?.script ?? 'grego' : p.script
  return SCRIPTS[key] ?? SCRIPTS.grego
}

export function apply(p: Prefs) {
  const pal = PALETTES[p.palette] ?? PALETTES.delfos
  const s = document.documentElement.style
  const vars: Record<string, string> = {
    '--ink': pal.ink.hex, '--ink-2': pal.ink2, '--ink-3': pal.ink3, '--paper': pal.paper.hex, '--paper-dim': pal.paperDim,
    '--muted': pal.muted, '--gold': p.accent ?? pal.gold.hex, '--on-gold': p.accent ? pickOn(p.accent) : pal.onGold, '--rose': pal.rose.hex,
    '--glow-1': pal.glow[0], '--glow-2': pal.glow[1], '--glow-3': pal.glow[2], '--pattern': pal.pattern ?? 'none',
    '--shadow': pal.dark ? 'rgba(0,0,0,.6)' : 'rgba(70,50,25,.2)',
    '--tilt-k': String(p.tilt), '--radius': p.radius + 'px', '--title-style': p.italicTitle ? 'italic' : 'normal',
    '--col': { arejado: '300px', 'confortável': '240px', compacto: '180px' }[p.density],
    '--gap': { arejado: '36px', 'confortável': '26px', compacto: '14px' }[p.density],
  }
  for (const r of ['display', 'body', 'mono', 'sigil'] as Role[]) {
    const font = fontById(p[r as 'display']); loadFont(font)
    vars['--' + r] = stack(font, r)
  }
  const sc = fontById(activeScript(p).font); loadFont(sc)
  vars['--spell'] = stack(sc, 'spell')
  vars['--card'] = p.cardFont === 'body' ? vars['--body'] : vars['--display']
  for (const [k, v] of Object.entries(vars)) s.setProperty(k, v)
  s.fontSize = `${16 * p.scale}px`
  s.colorScheme = pal.dark ? 'dark' : 'light'
  document.documentElement.classList.toggle('no-grain', !p.grain)
  document.documentElement.classList.toggle('still', !p.motion)
  document.documentElement.dataset.dark = String(pal.dark)
}

function pickOn(hex: string) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#111111' : '#ffffff'
}

apply(current)
