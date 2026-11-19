import { useEffect, useState } from 'react'
import { FONTS, fontById, loadFont, stack, type Cat, type Role } from './fonts'
import { DEFAULTS, PALETTES, PRESETS, applyPreset, setPrefs, surprise, usePrefs } from './prefs'
import { signInEmail, signInGoogle, signOut, syncNow, useSync } from './sync'
import { VERSION, applyUpdate, checkForUpdate, releases, useUpdateReady } from './update'
import { relative, type Item } from './model'
import { Notes, Scripts } from './bits'

type Tab = 'temas' | 'fontes' | 'cores' | 'detalhes' | 'conta' | 'sobre'
const TABS: [Tab, string][] = [['temas', 'Temas'], ['fontes', 'Fontes'], ['cores', 'Cores'], ['detalhes', 'Detalhes'], ['conta', 'Conta'], ['sobre', 'Sobre']]

export default function Atelier({ items, onClose, onImport }: { items: Item[]; onClose: () => void; onImport: (xs: Item[]) => void }) {
  const [tab, setTab] = useState<Tab>(() => { try { return (localStorage.getItem('kairos:tab') as Tab) || 'temas' } catch { return 'temas' } })
  useEffect(() => { try { localStorage.setItem('kairos:tab', tab) } catch {} }, [tab])
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [onClose])
  return (
    <div className="scrim" onClick={onClose}>
      <aside className="sheet atelier" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Ateliê">
        <div className="grip" />
        <header className="atelier-head">
          <div>
            <p className="eyebrow">ateliê</p>
            <h2>Deixe do seu jeito</h2>
          </div>
          <button className="btn ghost" onClick={onClose} aria-label="Fechar">✕</button>
        </header>
        <nav className="tabs">
          {TABS.map(([id, label]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>)}
        </nav>
        <div className="atelier-body">
          {tab === 'temas' && <Themes />}
          {tab === 'fontes' && <Fonts />}
          {tab === 'cores' && <Colors />}
          {tab === 'detalhes' && <Details />}
          {tab === 'conta' && <Account />}
          {tab === 'sobre' && <About items={items} onImport={onImport} />}
        </div>
      </aside>
    </div>
  )
}

function Themes() {
  const p = usePrefs()
  useEffect(() => { for (const t of Object.values(PRESETS)) { loadFont(fontById(t.display), t.name); loadFont(fontById(t.body), t.motto); loadFont(fontById(t.sigil), 'χλθσξ') } }, [])
  return (
    <>
      <p className="hint">Cada tema é uma combinação de fontes e cores com uma história. Depois, ajuste o que quiser nas outras abas.</p>
      <div className="themes">
        {Object.entries(PRESETS).map(([id, t]) => {
          const pal = PALETTES[t.palette]
          return (
            <button key={id} className={'theme ' + (p.preset === id ? 'on' : '')} onClick={() => applyPreset(id)}
              style={{ background: pal.pattern ? `${pal.pattern}, ${pal.ink}` : pal.ink, color: pal.paper, borderRadius: Math.min(t.radius ?? 16, 16) }}>
              <span className="theme-sig" style={{ fontFamily: stack(fontById(t.sigil), 'sigil'), color: pal.gold }}>χλθσξ</span>
              <b style={{ fontFamily: stack(fontById(t.display), 'display'), fontStyle: t.italicTitle === false ? 'normal' : 'italic' }}>{t.name}</b>
              <small style={{ fontFamily: stack(fontById(t.body), 'body'), color: pal.paperDim }}>{t.motto}</small>
              <i style={{ background: pal.gold }} />
            </button>
          )
        })}
        <button className={'theme dice ' + (p.preset === 'acaso' ? 'on' : '')} onClick={surprise}>
          <span className="theme-sig">⚄</span><b>Acaso</b><small>sorteia fontes e cores</small>
        </button>
      </div>
    </>
  )
}

const ROLES: { role: Role; label: string; sample: string; hint: string }[] = [
  { role: 'display', label: 'Títulos', sample: 'Kairos', hint: 'O nome do app, o oráculo e os títulos dos cards.' },
  { role: 'body', label: 'Texto', sample: 'Guardar agora, viver depois.', hint: 'Botões, descrições e o texto corrido.' },
  { role: 'mono', label: 'Rótulos', sample: 'EM 2 DIAS · 09:00', hint: 'Domínios, datas, preços — as letrinhas técnicas.' },
  { role: 'sigil', label: 'Grego', sample: 'χ λ θ σ ξ · καιρός', hint: 'Sigilos e trechos em grego. Só fontes que têm o alfabeto grego.' },
]
const CATS: Cat[] = ['serifa', 'sans', 'mono', 'script', 'display', 'gótica']

function Fonts() {
  const p = usePrefs()
  const [role, setRole] = useState<Role>('display')
  const [cat, setCat] = useState<Cat | null>(null)
  const [custom, setCustom] = useState('')
  const r = ROLES.find((x) => x.role === role)!
  const list = FONTS.filter((f) => f.roles.includes(role) && (!cat || f.cat === cat))
  useEffect(() => { list.forEach((f) => loadFont(f, r.sample + f.family)) }, [role, cat]) // eslint-disable-line
  const current = fontById(p[role])
  const cats = CATS.filter((c) => FONTS.some((f) => f.roles.includes(role) && f.cat === c))
  return (
    <>
      <div className="seg">
        {ROLES.map((x) => <button key={x.role} className={role === x.role ? 'on' : ''} onClick={() => { setRole(x.role); setCat(null) }}>{x.label}</button>)}
      </div>
      <p className="hint">{r.hint}</p>
      <div className="font-now">
        <span className="mono">em uso</span>
        <b style={{ fontFamily: stack(current, role) }}>{current.family}</b>
        <small>{current.note}</small>
      </div>
      {cats.length > 1 && (
        <div className="chips small">
          <button className={!cat ? 'on' : ''} onClick={() => setCat(null)}>todas</button>
          {cats.map((c) => <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(cat === c ? null : c)}>{c}</button>)}
        </div>
      )}
      <div className="fonts">
        {list.map((f) => (
          <button key={f.id} className={'font ' + (p[role] === f.id ? 'on' : '')} onClick={() => setPrefs({ [role]: f.id, preset: 'pessoal' })} title={f.note}>
            <span className="font-sample" style={{ fontFamily: stack(f, role), fontStyle: role === 'display' && p.italicTitle ? 'italic' : 'normal' }}>{role === 'display' ? f.family : r.sample}</span>
            <span className="font-meta">
              {role !== 'display' && <b>{f.family}</b>}
              <small>{f.cat}{f.greek && <i title="tem alfabeto grego">Ελ</i>}{f.hebrew && <i title="tem alfabeto hebraico">עב</i>}</small>
            </span>
          </button>
        ))}
      </div>
      <form className="custom-font" onSubmit={(e) => { e.preventDefault(); if (custom.trim()) { setPrefs({ [role]: 'gf:' + custom.trim(), preset: 'pessoal' }); setCustom('') } }}>
        <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="ou digite qualquer fonte do Google Fonts…" />
        <button className="btn" type="submit">usar</button>
      </form>
    </>
  )
}

function Colors() {
  const p = usePrefs()
  return (
    <>
      <div className="palettes">
        {Object.entries(PALETTES).map(([id, pal]) => (
          <button key={id} className={'palette ' + (p.palette === id ? 'on' : '')} onClick={() => setPrefs({ palette: id, accent: null, preset: 'pessoal' })}
            style={{ background: pal.pattern ? `${pal.pattern}, ${pal.ink}` : pal.ink, color: pal.paper }}>
            <span className="dots"><i style={{ background: pal.gold }} /><i style={{ background: pal.rose }} /><i style={{ background: pal.ink3 }} /></span>
            <b>Aa</b><small>{pal.name}</small>
          </button>
        ))}
      </div>
      <h4>cor de destaque</h4>
      <div className="row">
        <label className="color-pick">
          <input type="color" value={p.accent ?? PALETTES[p.palette]?.gold ?? '#e8c27a'} onChange={(e) => setPrefs({ accent: e.target.value })} />
          <span>{p.accent ?? 'da paleta'}</span>
        </label>
        {p.accent && <button className="btn ghost" onClick={() => setPrefs({ accent: null })}>voltar à da paleta</button>}
      </div>
    </>
  )
}

function Details() {
  const p = usePrefs()
  const Toggle = ({ k, label, hint }: { k: 'grain' | 'motion' | 'oracle' | 'astrolabe' | 'italicTitle'; label: string; hint?: string }) => (
    <label className="toggle"><span>{label}{hint && <small>{hint}</small>}</span><input type="checkbox" checked={p[k]} onChange={(e) => setPrefs({ [k]: e.target.checked })} /><i /></label>
  )
  const Slider = ({ k, label, min, max, step, fmt }: { k: 'scale' | 'tilt' | 'radius'; label: string; min: number; max: number; step: number; fmt: (v: number) => string }) => (
    <label className="slider"><span>{label}<small>{fmt(p[k])}</small></span><input type="range" min={min} max={max} step={step} value={p[k]} onChange={(e) => setPrefs({ [k]: +e.target.value })} /></label>
  )
  return (
    <>
      <h4>nome</h4>
      <div className="fields">
        <input value={p.title} onChange={(e) => setPrefs({ title: e.target.value })} placeholder="Kairos" aria-label="Nome no topo" />
        <input value={p.subtitle} onChange={(e) => setPrefs({ subtitle: e.target.value })} placeholder="καιρός · o momento oportuno" aria-label="Subtítulo" />
        <p className="hint">Grego, hebraico ou aramaico no subtítulo ganham a fonte grega sozinhos: <Scripts text="אֶתְפְּתַח · abre-te" /></p>
      </div>
      <h4>mural</h4>
      <div className="seg">
        {(['arejado', 'confortável', 'compacto'] as const).map((d) => <button key={d} className={p.density === d ? 'on' : ''} onClick={() => setPrefs({ density: d })}>{d}</button>)}
      </div>
      <Slider k="tilt" label="Inclinação dos cards" min={0} max={3} step={0.25} fmt={(v) => (v === 0 ? 'retos' : v + '×')} />
      <Slider k="radius" label="Cantos" min={0} max={28} step={2} fmt={(v) => v + 'px'} />
      <Slider k="scale" label="Tamanho do texto" min={0.85} max={1.25} step={0.05} fmt={(v) => Math.round(v * 100) + '%'} />
      <h4>presença</h4>
      <Toggle k="oracle" label="Oráculo" hint="uma carta diferente a cada abertura" />
      <Toggle k="astrolabe" label="Astrolábio" hint="os lembretes como astros" />
      <Toggle k="italicTitle" label="Título em itálico" />
      <label className="toggle"><span>Títulos dos cards na fonte de texto<small>para quando a fonte de título é decorativa demais</small></span>
        <input type="checkbox" checked={p.cardFont === 'body'} onChange={(e) => setPrefs({ cardFont: e.target.checked ? 'body' : 'display' })} /><i /></label>
      <Toggle k="grain" label="Granulado de filme" />
      <Toggle k="motion" label="Animações" />
      <h4>lembretes</h4>
      <label className="slider"><span>Hora padrão<small>{String(p.reminderHour).padStart(2, '0')}:00</small></span>
        <input type="range" min={5} max={22} step={1} value={p.reminderHour} onChange={(e) => setPrefs({ reminderHour: +e.target.value })} /></label>
      <button className="btn ghost danger" onClick={() => confirm('Voltar tudo ao padrão?') && setPrefs({ ...DEFAULTS })}>restaurar padrão</button>
    </>
  )
}

function Account() {
  const s = useSync()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  if (s.phase === 'off') return (
    <div className="hint block">
      <p><b>Sincronização ainda não configurada.</b> Tudo continua salvo neste aparelho.</p>
      <p>Para ligar: crie um projeto no Supabase e defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> (passo a passo no README).</p>
    </div>
  )
  if (!s.user) return (
    <>
      <p className="hint">Entre para ter os mesmos links, lembretes e aparência no celular e no computador. Sem conta, tudo continua funcionando só neste aparelho.</p>
      <button className="btn wide google" onClick={async () => { const { error } = await signInGoogle(); if (error) setErr(error.message) }}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.4-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1-3.8 1-2.9 0-5.4-2-6.3-4.6H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.3-.4-2s.1-1.4.4-2V7.2H2.1a11 11 0 0 0 0 9.6L5.7 14z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.1 7.2L5.7 10C6.6 7.4 9.1 5.4 12 5.4z"/></svg>
        entrar com Google
      </button>
      <p className="or">ou</p>
      {sent ? <p className="hint">✉ Enviei um link para <b>{email}</b>. Abra-o neste aparelho.</p> : (
        <form className="custom-font" onSubmit={async (e) => { e.preventDefault(); const { error } = await signInEmail(email); if (error) setErr(error.message); else setSent(true) }}>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu e-mail — mando um link mágico" />
          <button className="btn" type="submit">enviar</button>
        </form>
      )}
      {err && <p className="hint danger">{err}</p>}
    </>
  )
  const label = { syncing: 'sincronizando…', ok: s.at ? 'sincronizado ' + relative(s.at) : 'sincronizado', offline: 'sem internet — sincroniza quando voltar', error: 'erro: ' + s.error, off: '', 'signed-out': '' }[s.phase]
  return (
    <>
      <div className="me">
        {s.user.avatar ? <img src={s.user.avatar} alt="" referrerPolicy="no-referrer" /> : <span>{(s.user.name || s.user.email || '?')[0]}</span>}
        <div><b>{s.user.name || s.user.email}</b><small>{s.user.email}</small></div>
      </div>
      <p className={'sync-state ' + s.phase}><i />{label}</p>
      <div className="row">
        <button className="btn" onClick={() => syncNow()}>sincronizar agora</button>
        <button className="btn ghost" onClick={() => signOut()}>sair</button>
      </div>
      <p className="hint">Ao sair, os links continuam neste aparelho.</p>
    </>
  )
}

function About({ items, onImport }: { items: Item[]; onImport: (xs: Item[]) => void }) {
  const ready = useUpdateReady()
  const [checking, setChecking] = useState<'idle' | 'busy' | 'latest'>('idle')
  const bookmarklet = `javascript:void(open('${location.origin}/?url='+encodeURIComponent(location.href),'_blank'))`
  const exportJson = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' }))
    a.download = `kairos-${new Date().toISOString().slice(0, 10)}.json`; a.click()
  }
  return (
    <>
      <div className="version">
        <span className="mono">versão</span><b>{VERSION}</b>
        {ready ? <button className="btn gold" onClick={applyUpdate}>atualizar agora</button>
          : <button className="btn ghost" onClick={async () => { setChecking('busy'); const r = await checkForUpdate(); setChecking(r ? 'idle' : 'latest') }}>
            {checking === 'busy' ? 'procurando…' : checking === 'latest' ? '✓ última versão' : 'procurar atualização'}</button>}
      </div>
      <p className="hint">O app se atualiza sozinho: baixa a versão nova em silêncio e troca quando você não está olhando.</p>

      <h4>formas de guardar</h4>
      <p className="hint"><b>Celular:</b> instale (menu do navegador → “Adicionar à tela inicial”). No Android, o Kairos aparece no <i>Compartilhar</i> de qualquer app.</p>
      <p className="hint"><b>Computador:</b> Ctrl+V em qualquer lugar, arraste um link pra janela, ou arraste este botão pra barra de favoritos: <a className="bm" href={bookmarklet} onClick={(e) => e.preventDefault()}>✦ guardar no Kairos</a></p>

      <h4>cópia de segurança</h4>
      <div className="row">
        <button className="btn" onClick={exportJson}>exportar JSON</button>
        <label className="btn">importar<input type="file" accept="application/json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) onImport(JSON.parse(await f.text())) }} /></label>
      </div>

      <h4>histórico de versões</h4>
      {releases().map((r) => (
        <details key={r.version} className="release" open={r.version === VERSION}>
          <summary><b>{r.version}</b>{r.date && <span className="mono">{r.date}</span>}</summary>
          <Notes body={r.body} />
        </details>
      ))}
    </>
  )
}
