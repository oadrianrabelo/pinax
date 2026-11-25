import { useEffect, useState } from 'react'
import { FONTS, fontById, loadFont, stack, type Cat, type Role } from '../core/fonts'
import { DEFAULTS, ERAS, PALETTES, SCRIPTS, activeScript, applyEra, setPrefs, surprise, usePrefs, type Prefs } from '../core/prefs'
import { loginOptions, signInEmail, signInGoogle, signOut, syncNow, useSync } from '../core/sync'
import { VERSION, applyUpdate, checkForUpdate, releases, useUpdate } from '../core/update'
import { relative, type Item } from '../core/model'
import { getAutostart, isDesktopApp, isNative, setAutostart } from '../core/native'
import { Choice, Notes, Scripts, Seal, useSheet } from './bits'
import { Spell } from './spell'

type Tab = 'eras' | 'letras' | 'pigmentos' | 'oficio' | 'conta' | 'sobre'
const TABS: [Tab, string, string][] = [['eras', 'I', 'Eras'], ['letras', 'II', 'Letras'], ['pigmentos', 'III', 'Pigmentos'], ['oficio', 'IV', 'Ofício'], ['conta', 'V', 'Conta'], ['sobre', 'VI', 'Sobre']]

export default function Atelier({ items, onClose, onImport }: { items: Item[]; onClose: () => void; onImport: (xs: Item[]) => void }) {
  const [tab, setTab] = useState<Tab>(() => { try { return (localStorage.getItem('rete:tab') as Tab) || 'eras' } catch { return 'eras' } })
  useEffect(() => { try { localStorage.setItem('rete:tab', tab) } catch {} }, [tab])
  // o painel começa a deslizar já no primeiro quadro; o conteúdo entra no seguinte
  const [shown, setShown] = useState(false)
  const sheet = useSheet<HTMLElement>(onClose)
  useEffect(() => { const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true))); return () => cancelAnimationFrame(r) }, [])
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [onClose])
  return (
    <div className="scrim" onClick={onClose}>
      <aside ref={sheet} className="sheet atelier" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Ateliê">
        <div className="grip" />
        <header className="atelier-head">
          <div>
            <p className="eyebrow">o ateliê</p>
            <Spell as="h2" text="Deixe do seu jeito" speed={0.6} />
          </div>
          <button className="ink close" onClick={onClose} aria-label="Fechar">fechar ✕</button>
        </header>
        <nav className="bookmarks">
          {TABS.map(([id, roman, label]) => (
            <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}><i>{roman}</i>{label}</button>
          ))}
        </nav>
        <div className="atelier-body">
          {!shown ? null : <>
          {tab === 'eras' && <Eras />}
          {tab === 'letras' && <Letters />}
          {tab === 'pigmentos' && <Pigments />}
          {tab === 'oficio' && <Craft />}
          {tab === 'conta' && <Account />}
          {tab === 'sobre' && <About items={items} onImport={onImport} />}
          </>}
        </div>
      </aside>
    </div>
  )
}

function Eras() {
  const p = usePrefs()
  const ids = Object.keys(ERAS)
  const [focus, setFocus] = useState(ERAS[p.era] ? p.era : 'delfos')
  const e = ERAS[focus]
  useEffect(() => { const all = Object.values(ERAS).map((x) => x.name + x.year).join(''); for (const x of Object.values(ERAS)) loadFont(fontById(x.display), all) }, [])
  useEffect(() => { loadFont(fontById(e.body)); loadFont(fontById(e.sigil)); loadFont(fontById(SCRIPTS[e.script].font)) }, [e])
  const pal = PALETTES[e.palette]
  return (
    <>
      <p className="aside">Atravesse a história. Cada era traz as letras, os pigmentos e o alfabeto do seu tempo.</p>
      <div className="timeline" role="listbox" aria-label="Linha do tempo">
        <div className="axis" />
        {ids.map((id) => {
          const x = ERAS[id], c = PALETTES[x.palette]
          return (
            <button key={id} role="option" aria-selected={p.era === id} className={'medal ' + (p.era === id ? 'on ' : '') + (focus === id ? 'focus' : '')}
              onMouseEnter={() => setFocus(id)} onFocus={() => setFocus(id)} onClick={() => { setFocus(id); applyEra(id) }}>
              <span className="coin" style={{ background: c.ink.hex, color: c.gold.hex, borderColor: c.gold.hex, fontFamily: stack(fontById(x.display), 'display') }}>{x.name[0]}</span>
              <span className="yr">{x.year}</span>
              <span className="nm" style={{ fontFamily: stack(fontById(x.display), 'display') }}>{x.name}</span>
            </button>
          )
        })}
        <button className={'medal ' + (p.era === 'acaso' ? 'on' : '')} onClick={surprise}>
          <span className="coin dice">⚄</span><span className="yr">qualquer dia</span><span className="nm">Acaso</span>
        </button>
      </div>

      <article className="era-card" style={{ background: pal.pattern ? `${pal.pattern}, ${pal.ink.hex}` : pal.ink.hex, color: pal.paper.hex }}>
        <p className="era-when" style={{ color: pal.gold.hex }}>{e.year} · {e.place}</p>
        <h3 style={{ fontFamily: stack(fontById(e.display), 'display'), fontStyle: e.italicTitle === false ? 'normal' : 'italic' }}>{e.name}</h3>
        <p style={{ fontFamily: stack(fontById(e.body), 'body') }}>{e.story}</p>
        <p className="era-glyphs" style={{ fontFamily: stack(fontById(SCRIPTS[e.script].font), 'spell'), color: pal.gold.hex }}>{SCRIPTS[e.script].glyphs.slice(0, 12).join(' ')}</p>
        <ul className="pigments">
          {[pal.ink, pal.paper, pal.gold, pal.rose].filter((x, i, a) => a.findIndex((y) => y.hex === x.hex) === i).map((pg) => (
            <li key={pg.hex}><i style={{ background: pg.hex }} /><b>{pg.name}</b>{pg.note !== '—' && <small>{pg.note}</small>}</li>
          ))}
        </ul>
        {p.era !== focus && <Seal small onClick={() => applyEra(focus)}>viver aqui</Seal>}
      </article>
    </>
  )
}

const ROLES: { role: Role | 'spell'; label: string; sample: string; hint: string }[] = [
  { role: 'display', label: 'títulos', sample: 'Pinax', hint: 'O nome do app, o oráculo e os títulos das folhas.' },
  { role: 'body', label: 'texto', sample: 'Guardar agora, viver depois.', hint: 'As frases, as notas e as descrições.' },
  { role: 'mono', label: 'rótulos', sample: 'EM 2 DIAS · 09:00', hint: 'Domínios, datas, preços — as letrinhas técnicas.' },
  { role: 'sigil', label: 'grego', sample: 'χ λ θ σ ξ · ἀστρολάβος', hint: 'Sigilos e trechos em grego. Só fontes que têm o alfabeto grego.' },
  { role: 'spell', label: 'feitiço', sample: '', hint: 'O alfabeto das letras que giram antes de formar uma palavra.' },
]
const CATS: Cat[] = ['serifa', 'sans', 'mono', 'script', 'display', 'gótica']

function Letters() {
  const p = usePrefs()
  const [role, setRole] = useState<Role | 'spell'>('display')
  const [cat, setCat] = useState<Cat | null>(null)
  const [custom, setCustom] = useState('')
  const r = ROLES.find((x) => x.role === role)!
  const list = role === 'spell' ? [] : FONTS.filter((f) => f.roles.includes(role as Role) && (!cat || f.cat === cat))
  useEffect(() => { const all = r.sample + list.map((f) => f.family).join(''); list.forEach((f) => loadFont(f, all)); if (role === 'spell') Object.values(SCRIPTS).forEach((s) => loadFont(fontById(s.font))) }, [role, cat]) // eslint-disable-line
  const cats = role === 'spell' ? [] : CATS.filter((c) => FONTS.some((f) => f.roles.includes(role as Role) && f.cat === c))
  return (
    <>
      <p className="sentence">Escolhendo a letra dos <Choice value={role} onChange={(v) => { setRole(v); setCat(null) }} options={ROLES.map((x) => [x.role, x.label])} />.</p>
      <p className="aside">{r.hint}</p>

      {role === 'spell' ? (
        <>
          <div className="specimens">
            <button className={'specimen ' + (p.script === 'era' ? 'on' : '')} onClick={() => setPrefs({ script: 'era' })}>
              <span className="sample" style={{ fontFamily: 'var(--spell)' }}>{activeScript({ ...p, script: 'era' }).glyphs.slice(0, 6).join('')}</span>
              <b>o da era</b><small>muda quando você troca de era</small>
            </button>
            {Object.entries(SCRIPTS).map(([id, s]) => (
              <button key={id} className={'specimen ' + (p.script === id ? 'on' : '')} onClick={() => setPrefs({ script: id })}>
                <span className="sample" style={{ fontFamily: stack(fontById(s.font), 'spell') }}>{s.glyphs.slice(0, 6).join('')}</span>
                <b>{s.label}</b>
              </button>
            ))}
          </div>
          <Spell as="p" className="spell-demo" text={p.title || 'Pinax'} key={p.script} replayOnHover />
          <p className="aside">Passe o mouse (ou toque) no nome acima para lançar de novo.</p>
        </>
      ) : (
        <>
          <div className="now-using">
            <span className="mono">em uso</span>
            <b style={{ fontFamily: stack(fontById(p[role as 'display']), role as Role) }}>{fontById(p[role as 'display']).family}</b>
            <small>{fontById(p[role as 'display']).note}</small>
          </div>
          {cats.length > 1 && <p className="sentence small">Mostrar <Choice value={cat ?? 'todas'} onChange={(v) => setCat(v === 'todas' ? null : (v as Cat))} options={[['todas', 'todas'], ...cats.map((c) => [c, c] as [string, string])]} />.</p>}
          <div className="specimens">
            {list.map((f) => (
              <button key={f.id} className={'specimen ' + (p[role as 'display'] === f.id ? 'on' : '')} onClick={() => setPrefs({ [role]: f.id, era: 'pessoal' } as Partial<Prefs>)} title={f.note}>
                <span className="sample" style={{ fontFamily: stack(f, role as Role), fontStyle: role === 'display' && p.italicTitle ? 'italic' : 'normal' }}>{role === 'display' ? f.family : r.sample}</span>
                <b>{role !== 'display' && f.family}</b>
                <small>{f.cat}{f.greek && <i title="tem alfabeto grego">Ελ</i>}{f.hebrew && <i title="tem alfabeto hebraico">עב</i>}</small>
              </button>
            ))}
          </div>
          <form className="line-field" onSubmit={(e) => { e.preventDefault(); if (custom.trim()) { setPrefs({ [role]: 'gf:' + custom.trim(), era: 'pessoal' } as Partial<Prefs>); setCustom('') } }}>
            <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="ou o nome de qualquer fonte do Google Fonts…" />
            <button className="ink" type="submit">usar</button>
          </form>
        </>
      )}
    </>
  )
}

function Pigments() {
  const p = usePrefs()
  const pal = PALETTES[p.palette] ?? PALETTES.delfos
  return (
    <>
      <p className="aside">Cada paleta é feita de pigmentos que existiram de verdade.</p>
      <div className="pots">
        {Object.entries(PALETTES).map(([id, x]) => (
          <button key={id} className={'pot ' + (p.palette === id ? 'on' : '')} onClick={() => setPrefs({ palette: id, accent: null, era: 'pessoal' })} title={x.name}>
            <span className="blot" style={{ background: x.ink.hex }}>
              <i style={{ background: x.gold.hex }} /><i style={{ background: x.rose.hex }} /><i style={{ background: x.paper.hex }} />
            </span>
            <span>{x.name}</span>
          </button>
        ))}
      </div>
      <h4>na paleta {pal.name}</h4>
      <ul className="pigments plain">
        {[pal.ink, pal.paper, pal.gold, pal.rose].filter((x, i, a) => a.findIndex((y) => y.hex === x.hex) === i).map((pg) => (
          <li key={pg.hex}><i style={{ background: pg.hex }} /><b>{pg.name}</b>{pg.note !== '—' && <small>{pg.note}</small>}</li>
        ))}
      </ul>
      <p className="sentence">Rubricar com <label className="word swatch"><input type="color" value={p.accent ?? pal.gold.hex} onChange={(e) => setPrefs({ accent: e.target.value })} /><i style={{ background: p.accent ?? pal.gold.hex }} />{p.accent ? 'uma cor minha' : pal.gold.name.toLowerCase()}</label>
        {p.accent && <> · <button className="ink" onClick={() => setPrefs({ accent: null })}>voltar ao pigmento</button></>}.</p>
    </>
  )
}

function Craft() {
  const p = usePrefs()
  const [auto, setAuto] = useState<boolean | null>(null)
  useEffect(() => { getAutostart().then(setAuto) }, [])
  const yes = (k: keyof Prefs, a: string, b: string) => <Choice value={p[k] as boolean} onChange={(v) => setPrefs({ [k]: v } as Partial<Prefs>)} options={[[true, a], [false, b]]} sep="/" />
  const Ruler = ({ k, label, min, max, step, fmt }: { k: 'scale' | 'tilt' | 'radius' | 'reminderHour'; label: string; min: number; max: number; step: number; fmt: (v: number) => string }) => (
    <label className="ruler"><span>{label} <b>{fmt(p[k])}</b></span><input type="range" min={min} max={max} step={step} value={p[k]} onChange={(e) => setPrefs({ [k]: +e.target.value })} /></label>
  )
  return (
    <>
      <h4>o nome</h4>
      <label className="line-field"><input value={p.title} onChange={(e) => setPrefs({ title: e.target.value })} placeholder="Pinax" aria-label="Nome no topo" /></label>
      <label className="line-field"><input value={p.subtitle} onChange={(e) => setPrefs({ subtitle: e.target.value })} placeholder="πίναξ · tabuinha, lista, catálogo" aria-label="Subtítulo" /></label>
      <p className="aside">Grego, hebraico ou aramaico no subtítulo ganham a fonte grega sozinhos: <Scripts text="אֶתְפְּתַח · abre-te" /></p>

      <h4>a mesa</h4>
      <p className="sentence">O mural fica <Choice value={p.density} onChange={(v) => setPrefs({ density: v })} options={[['arejado', 'arejado'], ['confortável', 'confortável'], ['compacto', 'compacto']]} sep="," />.</p>
      <p className="sentence">Os títulos das entradas ficam {<Choice value={p.cardFont} onChange={(v) => setPrefs({ cardFont: v })} options={[['display', 'na letra de título'], ['body', 'na letra de texto']]} sep="/" />}.</p>
      <p className="sentence">O nome fica {yes('italicTitle', 'em itálico', 'em pé')}; o papel {yes('grain', 'tem grão', 'é liso')}; e tudo se move {yes('motion', 'com vida', 'em silêncio')}.</p>
      <p className="sentence">O oráculo {yes('oracle', 'aparece', 'descansa')} e o astrolábio {yes('astrolabe', 'gira no topo', 'fica guardado')}.</p>
      <Ruler k="radius" label="Cantos" min={0} max={24} step={1} fmt={(v) => v + 'px'} />
      <Ruler k="scale" label="Tamanho da letra" min={0.85} max={1.25} step={0.05} fmt={(v) => Math.round(v * 100) + '%'} />

      <h4>o tempo</h4>
      <Ruler k="reminderHour" label="Lembretes chegam às" min={5} max={22} step={1} fmt={(v) => String(v).padStart(2, '0') + 'h'} />
      {isDesktopApp && auto !== null && (
        <p className="sentence">O Pinax {<Choice value={auto} onChange={async (v) => { await setAutostart(v); setAuto(v) }} options={[[true, 'abre junto com o computador'], [false, 'só abre quando eu mandar']]} sep="/" />}.
          <span className="aside block">Aberto (mesmo escondido na bandeja), ele consegue tocar os lembretes na hora.</span></p>
      )}
      <p><button className="ink danger" onClick={() => confirm('Voltar tudo ao padrão?') && setPrefs({ ...DEFAULTS })}>restaurar o padrão</button></p>
    </>
  )
}

function Account() {
  const s = useSync()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [opts, setOpts] = useState<{ google: boolean; email: boolean } | null>(null)
  useEffect(() => { loginOptions().then(setOpts) }, [])
  if (s.phase === 'off') return (
    <div className="aside">
      <p><b>A sincronização ainda não foi ligada nesta versão.</b> Tudo continua guardado neste aparelho.</p>
      <p>Quando o projeto no Supabase estiver criado, os links, lembretes e a aparência passam a viajar entre o celular e o computador.</p>
    </div>
  )
  if (!s.user) return (
    <>
      <p className="aside">Entre para ter a mesma rede no celular e no computador. Sem conta, tudo continua funcionando só neste aparelho.</p>
      {opts?.google && <p><Seal onClick={async () => { const { error } = await signInGoogle(); if (error) setErr(error.message) }}>entrar com Google</Seal></p>}
      {sent ? <p className="aside">✉ Mandei uma carta para <b>{email}</b>. Abra o link nela neste aparelho.</p> : (
        <form className="line-field" onSubmit={async (e) => { e.preventDefault(); const { error } = await signInEmail(email); if (error) setErr(error.message); else setSent(true) }}>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={opts?.google ? "ou seu e-mail — mando um link mágico" : "seu e-mail — mando um link mágico"} />
          <button className="ink" type="submit">enviar</button>
        </form>
      )}
      {err && <p className="aside danger">{err}</p>}
    </>
  )
  const label = { syncing: 'sincronizando…', ok: s.at ? 'em dia ' + relative(s.at) : 'em dia', offline: 'sem internet — sincroniza quando voltar', error: 'erro: ' + s.error, off: '', 'signed-out': '' }[s.phase]
  return (
    <>
      <div className="me">
        {s.user.avatar ? <img src={s.user.avatar} alt="" referrerPolicy="no-referrer" /> : <span>{(s.user.name || s.user.email || '?')[0]}</span>}
        <div><b>{s.user.name || s.user.email}</b><small>{s.user.email}</small></div>
      </div>
      <p className={'sync-state ' + s.phase}><i />{label}</p>
      <p><button className="ink" onClick={() => syncNow()}>sincronizar agora</button> · <button className="ink" onClick={() => signOut()}>sair</button></p>
      <p className="aside">Ao sair, os links continuam neste aparelho.</p>
    </>
  )
}

function About({ items, onImport }: { items: Item[]; onImport: (xs: Item[]) => void }) {
  const upd = useUpdate()
  const bookmarklet = "javascript:void(location.href='pinax://add?url='+encodeURIComponent(location.href))"
  const exportJson = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' }))
    a.download = `pinax-${new Date().toISOString().slice(0, 10)}.json`; a.click()
  }
  const status = {
    idle: <button className="ink" onClick={checkForUpdate}>procurar versão nova</button>,
    checking: <>procurando…</>, latest: <>✓ esta é a mais nova</>, error: <>não consegui verificar agora</>,
    downloading: <>baixando a {upd.version}… {Math.round((upd.progress ?? 0) * 100)}%</>,
    ready: <button className="ink" onClick={applyUpdate}>reiniciar na {upd.version}</button>,
    available: <button className="ink" onClick={applyUpdate}>atualizar para a {upd.version}</button>,
    installing: <>confirme “Atualizar” na tela do Android</>,
    permission: <button className="ink" onClick={applyUpdate}>permita “instalar apps” e toque aqui de novo</button>,
  }[upd.phase]
  return (
    <>
      <div className="colophon">
        <p className="mono">versão</p>
        <p className="big">{VERSION}</p>
        <p>{isNative ? status : 'versão de desenvolvimento (navegador)'}</p>
      </div>
      <p className="aside">No computador, o Pinax se atualiza sozinho: baixa em silêncio e pede só um reinício. No celular, avisa quando há versão nova.</p>

      <h4>formas de guardar</h4>
      <p className="aside"><b>Em qualquer lugar:</b> copie um link e volte ao Pinax — ele oferece guardar. Ou cole (Ctrl+V) e arraste links direto na janela.</p>
      <p className="aside"><b>Do navegador:</b> arraste este marcador para a barra de favoritos: <a className="bm" href={bookmarklet} onClick={(e) => e.preventDefault()}>✦ pro Pinax</a></p>

      <h4>cópia de segurança</h4>
      <p><button className="ink" onClick={exportJson}>exportar a rede (JSON)</button> · <label className="ink">importar<input type="file" accept="application/json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) onImport(JSON.parse(await f.text())) }} /></label></p>

      <h4>diário de bordo</h4>
      {releases().map((r) => (
        <details key={r.version} className="release" open={r.version === VERSION}>
          <summary><b>{r.version}</b>{r.date && <span className="mono">{r.date}</span>}</summary>
          <Notes body={r.body} />
        </details>
      ))}
    </>
  )
}
