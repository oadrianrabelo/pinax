import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { hash } from './model'

// Trechos em grego/hebraico/aramaico ganham a fonte "dos sigilos" automaticamente
export function Scripts({ text }: { text: string }) {
  const parts = text.split(/([Ͱ-Ͽἀ-῿֐-׿܀-ݏ]+(?:\s+[Ͱ-Ͽἀ-῿֐-׿܀-ݏ]+)*)/)
  return <>{parts.map((p, k) => (k % 2 ? <span key={k} className="script">{p}</span> : <span key={k}>{p}</span>))}</>
}

export function Notes({ body }: { body: string }) {
  return (
    <div className="notes">
      {body.split('\n').filter((l) => l.trim()).map((l, k) =>
        l.startsWith('###') ? <h5 key={k}>{l.replace(/^#+\s*/, '')}</h5>
          : <p key={k}>{l.replace(/^\*\s*/, '· ').replace(/\*\*([^*]+)\*\*/g, '$1')}</p>)}
    </div>
  )
}

/** Selo de lacre: a ação principal. O contorno irregular muda com o texto, como um lacre de verdade. */
export function Seal({ children, small, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { small?: boolean; children: ReactNode }) {
  const h = hash(String(typeof children === 'string' ? children : 'selo'))
  const pts = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2, r = 46 + ((h >> (i % 24)) & 7) * 0.8
    return `${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`
  }).join(' ')
  return (
    <button {...rest} className={'seal ' + (small ? 'small ' : '') + (className ?? '')}>
      <svg viewBox="0 0 100 100" aria-hidden preserveAspectRatio="none">
        <polygon points={pts} className="wax" />
        <ellipse cx="50" cy="50" rx="38" ry="34" className="ring" />
      </svg>
      <span>{children}</span>
    </button>
  )
}

/** Escolha em forma de frase: palavras clicáveis, a escolhida fica rubricada. */
export function Choice<T extends string | number | boolean>({ value, options, onChange, sep = '·' }: {
  value: T; options: [T, ReactNode][]; onChange: (v: T) => void; sep?: string
}) {
  return (
    <span className="choice">
      {options.map(([v, label], i) => (
        <span key={String(v)}>
          {i > 0 && <span className="sep">{sep === ',' ? ', ' : ` ${sep} `}</span>}
          <button type="button" className={'word ' + (v === value ? 'on' : '')} aria-pressed={v === value} onClick={() => onChange(v)}>{label}</button>
        </span>
      ))}
    </span>
  )
}

/** Borda de papel rasgado, sempre a mesma para o mesmo item. */
export function deckle(seed: string, amp = 1.4) {
  let h = hash(seed)
  const rnd = () => { h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0; return (h % 1000) / 1000 }
  const pts: string[] = []
  const step = 5
  for (let x = 0; x <= 100; x += step) pts.push(`${x}% ${rnd() * amp}%`)
  for (let y = step; y <= 100; y += step) pts.push(`${100 - rnd() * amp}% ${y}%`)
  for (let x = 100 - step; x >= 0; x -= step) pts.push(`${x}% ${100 - rnd() * amp}%`)
  for (let y = 100 - step; y > 0; y -= step) pts.push(`${rnd() * amp}% ${y}%`)
  return `polygon(${pts.join(',')})`
}
