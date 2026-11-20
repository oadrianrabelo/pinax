import type { Item } from './model'

// Linha como fica guardada no Postgres (Supabase)
export interface Row { id: string; data: Item; updated_at: number; deleted: boolean; server_ts: string }

/** "Último a escrever vence": devolve o item a gravar localmente, ou null se o local já é mais novo. */
export function mergeRow(local: Item | undefined, row: Row): Item | null {
  if (local && (local.updatedAt ?? local.createdAt) >= row.updated_at) return null
  return {
    ...row.data,
    updatedAt: row.updated_at,
    deletedAt: row.deleted ? row.data.deletedAt ?? row.updated_at : undefined,
    dirty: false,
    loading: false,
  }
}

/** Converte um item local na linha a subir (sem campos transitórios). */
export function toRow(i: Item) {
  const { dirty: _d, loading: _l, ...data } = i
  return { id: i.id, data, updated_at: i.updatedAt ?? i.createdAt, deleted: !!i.deletedAt }
}
