import { defineConfig, type Connect } from 'vite'
import react from '@vitejs/plugin-react'
import { fetchPreview } from './src/core/preview'
import pkg from './package.json'

// Só para desenvolvimento no navegador: no app nativo a prévia é buscada direto pelo Tauri.
const previewApi: Connect.NextHandleFunction = async (req, res) => {
  const url = new URL(req.url ?? '', 'http://x').searchParams.get('url')
  res.setHeader('content-type', 'application/json')
  if (!url) { res.statusCode = 400; return res.end('{"error":"url ausente"}') }
  try { res.end(JSON.stringify(await fetchPreview(url))) }
  catch (e: any) { res.statusCode = 502; res.end(JSON.stringify({ error: String(e?.message ?? e) })) }
}

export default defineConfig({
  clearScreen: false,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { port: 5173, strictPort: true },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  build: { target: 'es2021', sourcemap: false },
  plugins: [
    react(),
    {
      name: 'preview-api',
      configureServer: (s) => { s.middlewares.use('/api/preview', previewApi) },
      configurePreviewServer: (s) => { s.middlewares.use('/api/preview', previewApi) },
    },
  ],
})
