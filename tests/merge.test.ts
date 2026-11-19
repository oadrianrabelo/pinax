import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeRow, toRow } from '../src/merge.ts'

const base = { id: 'a', url: 'https://x.com', kind: 'outro' as const, createdAt: 1 }
const row = (updated_at: number, deleted = false, data: object = {}) =>
  ({ id: 'a', data: { ...base, ...data }, updated_at, deleted, server_ts: 't' })

test('item novo vindo da nuvem é gravado', () => {
  const m = mergeRow(undefined, row(10, false, { title: 'oi' }))
  assert.equal(m?.title, 'oi'); assert.equal(m?.dirty, false); assert.equal(m?.updatedAt, 10)
})
test('versão local mais nova vence', () => {
  assert.equal(mergeRow({ ...base, updatedAt: 20 }, row(10)), null)
})
test('empate não regrava', () => {
  assert.equal(mergeRow({ ...base, updatedAt: 10 }, row(10)), null)
})
test('versão remota mais nova vence', () => {
  assert.equal(mergeRow({ ...base, updatedAt: 5, title: 'velho' }, row(10, false, { title: 'novo' }))?.title, 'novo')
})
test('item legado sem updatedAt usa createdAt', () => {
  assert.notEqual(mergeRow({ ...base, createdAt: 1 }, row(2)), null)
})
test('lápide remota apaga localmente', () => {
  assert.ok(mergeRow({ ...base, updatedAt: 5 }, row(10, true))?.deletedAt)
})
test('toRow tira campos transitórios', () => {
  const r = toRow({ ...base, updatedAt: 7, dirty: true, loading: true, deletedAt: 7 })
  assert.equal(r.updated_at, 7); assert.equal(r.deleted, true)
  assert.ok(!('dirty' in r.data) && !('loading' in r.data))
})
