// Catálogo tipográfico. Toda spec foi verificada contra o Google Fonts.
// `greek`/`hebrew`: a fonte tem os glifos (senão o navegador cai num fallback).

export type Role = 'display' | 'body' | 'mono' | 'sigil' | 'spell'
export type Cat = 'serifa' | 'sans' | 'mono' | 'script' | 'display' | 'gótica'

export interface Font {
  id: string
  family: string
  spec: string
  cat: Cat
  roles: Role[]
  note: string
  greek?: boolean
  hebrew?: boolean
}

const f = (family: string, spec: string, cat: Cat, roles: Role[], note: string, extra: Partial<Font> = {}): Font =>
  ({ id: family.toLowerCase().replace(/\s+/g, '-'), family, spec, cat, roles, note, ...extra })

export const FONTS: Font[] = [
  // — serifas de título —
  f('Instrument Serif', 'Instrument+Serif:ital@0;1', 'serifa', ['display'], 'Condensada e elegante; o itálico é a alma do Kairos.'),
  f('Fraunces', 'Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900', 'serifa', ['display', 'body'], '“Old style” macia, com cara de rótulo antigo de farmácia.'),
  f('Bodoni Moda', 'Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900', 'serifa', ['display'], 'Homenagem a Giambattista Bodoni, tipógrafo de Parma (1740).'),
  f('Cinzel', 'Cinzel:wght@400..900', 'serifa', ['display'], 'Capitulares das inscrições romanas em pedra. Latim puro.'),
  f('Cinzel Decorative', 'Cinzel+Decorative:wght@400;700;900', 'display', ['display'], 'Cinzel com floreios de manuscrito.'),
  f('IM Fell English', 'IM+Fell+English:ital@0;1', 'serifa', ['display', 'body'], 'Tipos do bispo Fell, Oxford, séc. XVII — tinta borrada inclusa.'),
  f('Italiana', 'Italiana', 'serifa', ['display'], 'Fina, alta, de vitrine de alfaiataria em Milão.'),
  f('Libre Caslon Display', 'Libre+Caslon+Display', 'serifa', ['display'], 'O Caslon usado na Declaração de Independência dos EUA.'),
  f('Gloock', 'Gloock', 'serifa', ['display'], 'Contraste altíssimo, quase escultural. Pouca gente usa.'),
  f('Young Serif', 'Young+Serif', 'serifa', ['display'], 'Robusta e calorosa, de livro infantil antigo.'),
  f('Playfair Display SC', 'Playfair+Display+SC:ital@0;1', 'serifa', ['display'], 'Versaletes: tudo em maiúsculas pequenas, ar de convite.'),
  f('Rozha One', 'Rozha+One', 'serifa', ['display'], 'Peso de pôster, com hastes finíssimas. Também escreve devanágari.'),
  f('Bellefair', 'Bellefair', 'serifa', ['display'], 'Serifa delicada desenhada para latim e hebraico juntos.', { hebrew: true }),
  f('Suez One', 'Suez+One', 'serifa', ['display'], 'Hebraico pesado e moderno, de Tel Aviv.', { hebrew: true }),
  f('Frank Ruhl Libre', 'Frank+Ruhl+Libre:wght@300..900', 'serifa', ['display', 'body', 'spell'], 'A fonte clássica dos jornais e livros em hebraico desde 1910.', { hebrew: true }),
  f('David Libre', 'David+Libre:wght@400;500;700', 'serifa', ['display', 'body'], 'Baseada no David de Ismar David, Jerusalém, 1950.', { hebrew: true }),
  // — gótica / script / display —
  f('UnifrakturMaguntia', 'UnifrakturMaguntia', 'gótica', ['display'], 'Fraktur de Mainz — a cidade de Gutenberg.'),
  f('Pirata One', 'Pirata+One', 'gótica', ['display'], 'Blackletter com espírito de rótulo de rum.'),
  f('Pinyon Script', 'Pinyon+Script', 'script', ['display'], 'Caligrafia de convite de casamento, à pena.'),
  f('Homemade Apple', 'Homemade+Apple', 'script', ['display'], 'Letra cursiva de quem escreve rápido num caderno.'),
  f('Caveat', 'Caveat:wght@400..700', 'script', ['display', 'body'], 'Anotação à mão, legível. Ótima para notas.'),
  f('Kalam', 'Kalam:wght@300;400;700', 'script', ['body'], 'Caneta hidrocor, do estúdio indiano ITF.'),
  f('Monoton', 'Monoton', 'display', ['display'], 'Letreiro de neon dos anos 30, em linhas paralelas.'),
  f('Bungee Shade', 'Bungee+Shade', 'display', ['display'], 'Letreiro urbano com sombra 3D.'),
  f('Rubik Glitch', 'Rubik+Glitch', 'display', ['display'], 'Rubik com defeito de VHS.'),
  f('Bagel Fat One', 'Bagel+Fat+One', 'display', ['display'], 'Gorda, redonda, de padaria coreana.'),
  f('Major Mono Display', 'Major+Mono+Display', 'mono', ['display', 'mono'], 'Geométrica, mistura caixa-alta e baixa de propósito.'),
  f('Unbounded', 'Unbounded:wght@200..900', 'display', ['display'], 'Larga e expansiva, nascida em projeto aberto de cripto.'),
  f('Syne', 'Syne:wght@400..800', 'display', ['display', 'body', 'sigil'], 'Da galeria Synesthésies, Paris. Fica mais larga quanto mais pesada.', { greek: true }),
  // — sans de texto —
  f('Geist', 'Geist:wght@100..900', 'sans', ['body'], 'Grotesca suíça contemporânea, nítida em telas.'),
  f('Hanken Grotesk', 'Hanken+Grotesk:ital,wght@0,100..900;1,100..900', 'sans', ['body'], 'Sans neutra e amigável, ótima em tamanhos pequenos.'),
  f('Bricolage Grotesque', 'Bricolage+Grotesque:opsz,wght@12..96,200..800', 'sans', ['display', 'body'], 'Grotesca francesa com tinta “vazando” nos títulos.'),
  f('Instrument Sans', 'Instrument+Sans:ital,wght@0,400..700;1,400..700', 'sans', ['body'], 'Irmã sans da Instrument Serif.'),
  f('Schibsted Grotesk', 'Schibsted+Grotesk:ital,wght@0,400..900;1,400..900', 'sans', ['body'], 'Feita para jornais noruegueses.'),
  f('Familjen Grotesk', 'Familjen+Grotesk:ital,wght@0,400..700;1,400..700', 'sans', ['body'], 'Sueca, com um “g” de dois andares charmoso.'),
  f('Darker Grotesque', 'Darker+Grotesque:wght@300..900', 'sans', ['display', 'body'], 'Alta e estreita, de cartaz de cinema indie.'),
  f('Atkinson Hyperlegible', 'Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700', 'sans', ['body'], 'Criada pelo Instituto Braille para máxima legibilidade.'),
  f('Commissioner', 'Commissioner:wght@100..900', 'sans', ['body', 'sigil'], 'Sans com alfabeto grego bem desenhado.', { greek: true }),
  // — serifas de texto —
  f('Spectral', 'Spectral:ital,wght@0,300;0,400;0,600;1,400', 'serifa', ['body'], 'Serifa da Production Type feita para ler em tela.'),
  f('Cormorant Garamond', 'Cormorant+Garamond:ital,wght@0,300..700;1,300..700', 'serifa', ['display', 'body'], 'Garamond de olho grande, quase de exibição.'),
  f('Petrona', 'Petrona:ital,wght@0,100..900;1,100..900', 'serifa', ['body'], 'Serifa contemporânea com itálico cheio de caráter.'),
  f('Newsreader', 'Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800', 'serifa', ['body'], 'Para leitura longa de notícias; tem tamanho óptico.'),
  f('Literata', 'Literata:ital,opsz,wght@0,7..72,200..900;1,7..72,200..900', 'serifa', ['body', 'sigil'], 'A fonte do Google Play Livros. Escreve grego.', { greek: true }),
  f('Alegreya', 'Alegreya:ital,wght@0,400..900;1,400..900', 'serifa', ['body', 'sigil'], 'Caligráfica, argentina, premiada. Grego lindo.', { greek: true }),
  // — gregas (sigilos) —
  f('GFS Didot', 'GFS+Didot', 'serifa', ['sigil', 'display'], 'Da Greek Font Society: o grego tipográfico clássico de Atenas.', { greek: true }),
  f('GFS Neohellenic', 'GFS+Neohellenic:ital,wght@0,400;0,700;1,400', 'sans', ['sigil', 'body'], 'Grego moderno, desenhado em 1927 por Victor Scholderer.', { greek: true }),
  f('Noto Serif Display', 'Noto+Serif+Display:ital,wght@0,100..900;1,100..900', 'serifa', ['sigil', 'display'], 'Alto contraste com grego e cirílico completos.', { greek: true }),
  f('Piazzolla', 'Piazzolla:ital,opsz,wght@0,8..30,100..900;1,8..30,100..900', 'serifa', ['sigil', 'body'], 'Argentina, compacta, com grego afiado.', { greek: true }),
  f('Advent Pro', 'Advent+Pro:ital,wght@0,100..900;1,100..900', 'sans', ['sigil', 'display'], 'Fina e técnica, de ficção científica.', { greek: true }),
  f('Comfortaa', 'Comfortaa:wght@300..700', 'sans', ['sigil', 'display'], 'Arredondada e geométrica.', { greek: true }),
  f('Didact Gothic', 'Didact+Gothic', 'sans', ['sigil', 'body'], 'Feita para alfabetização: letras como se ensina a escrever.', { greek: true }),
  // — mono —
  f('Geist Mono', 'Geist+Mono:wght@100..900', 'mono', ['mono'], 'Monoespaçada limpa da Vercel.'),
  f('Martian Mono', 'Martian+Mono:wght@100..800', 'mono', ['mono'], 'Larga, de painel de nave espacial.'),
  f('Fragment Mono', 'Fragment+Mono:ital@0;1', 'mono', ['mono'], 'Helvetica transformada em mono. Discreta e elegante.'),
  f('Xanh Mono', 'Xanh+Mono:ital@0;1', 'mono', ['mono', 'display'], 'Mono com serifa e itálico — de máquina de escrever poética.'),
  f('Courier Prime', 'Courier+Prime:ital,wght@0,400;0,700;1,400;1,700', 'mono', ['mono'], 'A Courier dos roteiros de cinema, refeita direito.'),
  f('Red Hat Mono', 'Red+Hat+Mono:wght@300..700', 'mono', ['mono'], 'Mono humanista, macia.'),
  f('Spline Sans Mono', 'Spline+Sans+Mono:wght@300..700', 'mono', ['mono'], 'Mono com curvas amigáveis.'),
  f('Syne Mono', 'Syne+Mono', 'mono', ['mono'], 'Esquisita e artística, da família Syne.'),
  f('Azeret Mono', 'Azeret+Mono:wght@100..900', 'mono', ['mono'], 'Mono polonesa com ar de terminal antigo.'),
  f('Victor Mono', 'Victor+Mono:ital,wght@0,100..700;1,100..700', 'mono', ['mono', 'sigil'], 'Itálico cursivo dentro de uma mono. E tem grego!', { greek: true }),
  // — acrescentadas com as eras —
  f('Marcellus', 'Marcellus', 'serifa', ['display'], 'Capitulares gravadas, inspiradas em inscrições gregas e romanas.'),
  f('Uncial Antiqua', 'Uncial+Antiqua', 'display', ['display'], 'A escrita uncial dos manuscritos irlandeses, séc. V–VIII.'),
  f('Grenze Gotisch', 'Grenze+Gotisch:wght@100..900', 'gótica', ['display'], 'Gótica de fronteira: metade fraktur, metade romana.'),
  f('Cormorant Unicase', 'Cormorant+Unicase:wght@300;400;500;600;700', 'serifa', ['display'], 'Maiúsculas e minúsculas na mesma altura, como nas inscrições antigas.'),
  f('Forum', 'Forum', 'serifa', ['display'], 'Romana clássica, de fórum e de arco do triunfo.'),
  f('Linden Hill', 'Linden+Hill:ital@0;1', 'serifa', ['display', 'body'], 'Releitura das letras de Frederic Goudy, 1930.'),
  f('Sorts Mill Goudy', 'Sorts+Mill+Goudy:ital@0;1', 'serifa', ['display', 'body'], 'Goudy Old Style revivida, com itálico de livro antigo.'),
  f('Old Standard TT', 'Old+Standard+TT:ital,wght@0,400;0,700;1,400', 'serifa', ['body'], 'O “moderno” dos livros científicos do séc. XIX.'),
  f('EB Garamond', 'EB+Garamond:ital,wght@0,400..800;1,400..800', 'serifa', ['display', 'body', 'sigil'], 'Garamond de 1592, com grego desenhado à mão.', { greek: true }),
  f('Gentium Book Plus', 'Gentium+Book+Plus:ital,wght@0,400;0,700;1,400', 'serifa', ['body', 'sigil'], 'Feita para estudiosos: grego antigo com todos os acentos.', { greek: true }),
  f('Reem Kufi', 'Reem+Kufi:wght@400..700', 'display', ['display'], 'Cúfica geométrica, a escrita dos primeiros Alcorões.'),
  f('Amiri', 'Amiri:ital,wght@0,400;0,700;1,400', 'serifa', ['body', 'spell'], 'Naskh clássico, baseado na tipografia do Cairo de 1905.'),
  f('Noto Sans Phoenician', 'Noto+Sans+Phoenician', 'display', ['spell'], 'O alfabeto fenício — pai do grego, do hebraico e do latim.'),
  f('Noto Sans Imperial Aramaic', 'Noto+Sans+Imperial+Aramaic', 'display', ['spell'], 'Aramaico imperial, a língua comum do Império Persa.'),
]

const FALLBACK: Record<Cat, string> = {
  serifa: 'Georgia, serif', sans: 'system-ui, sans-serif', mono: 'ui-monospace, monospace',
  script: 'cursive', display: 'system-ui, sans-serif', gótica: 'serif',
}

// Qualquer família do Google Fonts pode ser usada digitando o nome: id "gf:Nome"
export function fontById(id: string): Font {
  const known = FONTS.find((x) => x.id === id)
  if (known) return known
  const family = id.startsWith('gf:') ? id.slice(3) : 'Geist'
  return { id, family, spec: family.trim().replace(/\s+/g, '+'), cat: 'sans', roles: ['display', 'body', 'mono', 'sigil', 'spell'], note: 'Escolhida por você no Google Fonts.' }
}

export const stack = (font: Font, role: Role) =>
  `"${font.family}", ${role === 'sigil' || role === 'spell' ? '"GFS Didot", ' : ''}${role === 'mono' ? FALLBACK.mono : FALLBACK[font.cat]}`

// Fontes pedidas no mesmo instante saem num único <link> (um só recálculo de estilo).
const loaded = new Set<string>()
const queue = new Map<string, Set<string>>() // texto do recorte → specs
let scheduled = false
function flush() {
  scheduled = false
  for (const [text, specs] of queue) {
    const known = [...specs].filter((sp) => FONTS.some((f) => f.spec === sp))
    const custom = [...specs].filter((sp) => !known.includes(sp))
    // fontes digitadas à mão vão sozinhas: um nome errado não derruba as outras
    for (const group of [known, ...custom.map((c) => [c])]) {
      if (!group.length) continue
      const l = document.createElement('link')
      l.rel = 'stylesheet'
      l.href = 'https://fonts.googleapis.com/css2?' + group.map((sp) => 'family=' + sp).join('&') + (text ? '&text=' + encodeURIComponent(text) : '') + '&display=swap'
      document.head.appendChild(l)
    }
  }
  queue.clear()
}
export function loadFont(font: Font, text?: string) {
  const key = font.spec + (text ?? '')
  if (loaded.has(key) || loaded.has(font.spec)) return
  loaded.add(key)
  const t = text ?? ''
  if (!queue.has(t)) queue.set(t, new Set())
  queue.get(t)!.add(font.spec)
  if (!scheduled) { scheduled = true; queueMicrotask(flush) }
}
