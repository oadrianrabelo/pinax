// Trechos em grego/hebraico/aramaico ganham a fonte "dos sigilos" automaticamente
export function Scripts({ text }: { text: string }) {
  const parts = text.split(/([\u0370-\u03FF\u1F00-\u1FFF\u0590-\u05FF\u0700-\u074F]+(?:\s+[\u0370-\u03FF\u1F00-\u1FFF\u0590-\u05FF\u0700-\u074F]+)*)/)
  return <>{parts.map((p, k) => (k % 2 ? <span key={k} className="script">{p}</span> : <em key={k}>{p}</em>))}</>
}

export function Notes({ body }: { body: string }) {
  return (
    <div className="notes">
      {body.split('\n').filter((l) => l.trim()).map((l, k) =>
        l.startsWith('###') ? <h4 key={k}>{l.replace(/^#+\s*/, '')}</h4>
          : <p key={k}>{l.replace(/^\*\s*/, '· ').replace(/\*\*([^*]+)\*\*/g, '$1')}</p>)}
    </div>
  )
}
