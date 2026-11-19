import { defineConfig, type Connect } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fetchPreview } from './server/preview'

const previewApi: Connect.NextHandleFunction = async (req, res) => {
  const url = new URL(req.url ?? '', 'http://x').searchParams.get('url')
  res.setHeader('content-type', 'application/json')
  if (!url) { res.statusCode = 400; return res.end('{"error":"url ausente"}') }
  try { res.end(JSON.stringify(await fetchPreview(url))) }
  catch (e: any) { res.statusCode = 502; res.end(JSON.stringify({ error: String(e?.message ?? e) })) }
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'preview-api',
      configureServer: (s) => { s.middlewares.use('/api/preview', previewApi) },
      configurePreviewServer: (s) => { s.middlewares.use('/api/preview', previewApi) },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: { navigateFallbackDenylist: [/^\/api\//] },
      manifest: {
        name: 'Kairos — o momento certo dos seus links',
        short_name: 'Kairos',
        description: 'Guarde links e receba cada um no momento oportuno.',
        lang: 'pt-BR',
        theme_color: '#0c0a12',
        background_color: '#0c0a12',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Android: aparece no menu "Compartilhar" de qualquer app
        share_target: { action: '/', method: 'GET', params: { title: 'title', text: 'text', url: 'url' } },
      } as any,
    }),
  ],
})
