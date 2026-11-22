// Depois de `tauri android init`, encaixa o Pinax no projeto Android gerado:
//  - aparece no menu "Compartilhar" (links, textos, fotos, vídeos, arquivos)
//  - abre os arquivos guardados com o app do sistema (FileProvider)
//  - liga a ponte ReteShare na MainActivity
//  - usa o ícone do Pinax (o projeto gerado vem com o ícone padrão do Tauri)
// Pode rodar mais de uma vez: cada passo confere se já foi feito.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, cpSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'

const root = 'src-tauri/gen/android/app/src/main'
const find = (dir, name) => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) { const r = find(p, name); if (r) return r }
    else if (e === name) return p
  }
}

// 1. MainActivity: dois ganchos
const mainPath = find(join(root, 'java'), 'MainActivity.kt')
if (!mainPath) throw new Error('MainActivity.kt não encontrada — rode `tauri android init` antes')
let main = readFileSync(mainPath, 'utf8')
const pkg = main.match(/^package\s+([\w.]+)/m)[1]
if (!main.includes('ReteShare')) {
  const hooks = `
  // ——— Pinax: receber o que vem do "Compartilhar" ———
  override fun onWebViewCreate(webView: android.webkit.WebView) {
    super.onWebViewCreate(webView)
    ReteShare.attach(this, webView)
  }

  override fun onNewIntent(intent: android.content.Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    ReteShare.receive(this, intent)
  }
`
  const end = main.lastIndexOf('}')
  main = main.slice(0, end) + hooks + main.slice(end)
  writeFileSync(mainPath, main)
}

// 2. ReteShare.kt no mesmo pacote
const share = readFileSync('src-tauri/android/ReteShare.kt', 'utf8').replace('package __PACKAGE__', `package ${pkg}`)
writeFileSync(join(dirname(mainPath), 'ReteShare.kt'), share)

// 3. Manifesto: filtros de compartilhamento, uma única instância, FileProvider
const manPath = join(root, 'AndroidManifest.xml')
let man = readFileSync(manPath, 'utf8')
if (!man.includes('android.intent.action.SEND')) {
  const filters = `
            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="*/*" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.SEND_MULTIPLE" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="*/*" />
            </intent-filter>`
  const launcher = man.indexOf('android.intent.category.LAUNCHER')
  if (launcher < 0) throw new Error('atividade principal não encontrada no manifesto')
  const close = man.indexOf('</intent-filter>', launcher) + '</intent-filter>'.length
  man = man.slice(0, close) + filters + man.slice(close)
}
// compartilhar com o app aberto traz a mesma janela em vez de abrir outra
const actStart = man.lastIndexOf('<activity', man.indexOf('android.intent.category.LAUNCHER'))
const actTagEnd = man.indexOf('>', actStart)
let actTag = man.slice(actStart, actTagEnd)
if (/android:launchMode="[^"]*"/.test(actTag)) actTag = actTag.replace(/android:launchMode="[^"]*"/, 'android:launchMode="singleTask"')
else actTag += '\n            android:launchMode="singleTask"'
man = man.slice(0, actStart) + actTag + man.slice(actTagEnd)
if (!man.includes('.rete.files')) {
  const provider = `
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.rete.files"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/rete_paths" />
        </provider>
`
  man = man.replace('</application>', provider + '    </application>')
}
writeFileSync(manPath, man)

// 4. Pastas que o FileProvider pode expor (só a dos arquivos recebidos)
mkdirSync(join(root, 'res/xml'), { recursive: true })
writeFileSync(join(root, 'res/xml/rete_paths.xml'), `<?xml version="1.0" encoding="utf-8"?>
<paths>
    <files-path name="shared" path="shared/" />
</paths>
`)

// 5. Ícone: o `tauri android init` cria o projeto com o ícone padrão do Tauri.
//    Copia por cima o ícone adaptativo do Pinax (fundo + primeiro plano, todas as densidades).
if (existsSync('src-tauri/icons/android')) cpSync('src-tauri/icons/android', join(root, 'res'), { recursive: true, force: true })

console.log(`✓ Pinax encaixado no Android (${pkg})`)
