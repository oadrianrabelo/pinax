import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseHtml } from '../server/preview.ts'

test('lê Open Graph, decodifica entidades e resolve URLs relativas', () => {
  const html = `<title>T &amp; t</title>
    <meta property="og:title" content="Journaling &#8212; Ana">
    <meta content='Papelaria' name='description'>
    <meta property="og:image" content="/c.jpg?a=1&amp;b=2">
    <meta property="product:price:amount" content="89.90"><meta property="product:price:currency" content="BRL">
    <link rel="apple-touch-icon" href="https://cdn.x/apple.png">`
  const p = parseHtml(html, new URL('https://www.liinks.co/journalingsupplies'))
  assert.equal(p.title, 'Journaling — Ana')
  assert.equal(p.description, 'Papelaria')
  assert.equal(p.image, 'https://www.liinks.co/c.jpg?a=1&b=2')
  assert.equal(p.price, 'BRL 89.90')
  assert.equal(p.site, 'liinks.co')
  assert.equal(p.favicon, 'https://cdn.x/apple.png')
})
test('sem metadados cai no <title> e no favicon padrão', () => {
  const p = parseHtml('<title>Só título</title>', new URL('https://exemplo.com/a'))
  assert.equal(p.title, 'Só título'); assert.equal(p.favicon, 'https://exemplo.com/favicon.ico')
})
