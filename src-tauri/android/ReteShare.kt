// Recebe o que outros apps compartilham com o Rete (menu "Compartilhar" do Android):
// links, textos, fotos, vídeos e arquivos. Copia os arquivos para dentro do app (a permissão
// de leitura do outro app expira), gera uma miniatura e entrega tudo para a interface
// por uma ponte JavaScript: window.ReteShare.take().
//
// Este arquivo é copiado para gen/android pelo scripts/android-patch.mjs, que troca o pacote.
package __PACKAGE__

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.MimeTypeMap
import android.webkit.WebView
import androidx.core.content.FileProvider
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.UUID
import java.util.concurrent.Executors

object ReteShare {
    private val pending = JSONArray()
    private var webView: WebView? = null
    private var activity: Activity? = null
    private val io = Executors.newSingleThreadExecutor()

    fun attach(a: Activity, w: WebView) {
        activity = a
        webView = w
        w.addJavascriptInterface(Bridge, "ReteShare")
        receive(a, a.intent)
    }

    fun receive(a: Activity, intent: Intent?) {
        if (intent == null) return
        val action = intent.action
        if (action != Intent.ACTION_SEND && action != Intent.ACTION_SEND_MULTIPLE) return
        if (intent.getBooleanExtra("rete_handled", false)) return
        intent.putExtra("rete_handled", true)

        val text = intent.getStringExtra(Intent.EXTRA_TEXT)
        val subject = intent.getStringExtra(Intent.EXTRA_SUBJECT) ?: intent.getStringExtra(Intent.EXTRA_TITLE)
        val uris = mutableListOf<Uri>()
        if (action == Intent.ACTION_SEND) single(intent)?.let { uris.add(it) } else uris.addAll(multiple(intent))
        if (uris.isEmpty()) intent.clipData?.let { c -> for (i in 0 until c.itemCount) c.getItemAt(i).uri?.let { uris.add(it) } }
        val type = intent.type

        io.execute {
            val items = JSONArray()
            if (uris.isEmpty()) {
                if (!text.isNullOrBlank() || !subject.isNullOrBlank())
                    items.put(JSONObject().put("type", "text").put("text", text ?: "").put("subject", subject ?: ""))
            } else {
                for (u in uris) copy(a, u, type)?.let { f ->
                    if (!text.isNullOrBlank()) f.put("text", text)
                    items.put(f)
                }
            }
            synchronized(pending) { for (i in 0 until items.length()) pending.put(items.get(i)) }
            a.runOnUiThread { webView?.evaluateJavascript("window.dispatchEvent(new Event('rete-share'))", null) }
        }
    }

    @Suppress("DEPRECATION")
    private fun single(intent: Intent): Uri? =
        if (Build.VERSION.SDK_INT >= 33) intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
        else intent.getParcelableExtra(Intent.EXTRA_STREAM) as? Uri

    @Suppress("DEPRECATION")
    private fun multiple(intent: Intent): List<Uri> =
        (if (Build.VERSION.SDK_INT >= 33) intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri::class.java)
         else intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)) ?: emptyList()

    private fun copy(a: Activity, uri: Uri, fallbackType: String?): JSONObject? = try {
        val cr = a.contentResolver
        val mime = cr.getType(uri) ?: fallbackType ?: "application/octet-stream"
        var name: String? = null
        cr.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
            if (c.moveToFirst() && !c.isNull(0)) name = c.getString(0)
        }
        val ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mime)
            ?: name?.substringAfterLast('.', "")?.takeIf { it.isNotEmpty() } ?: "bin"
        val dir = File(a.filesDir, "shared").apply { mkdirs() }
        val file = File(dir, UUID.randomUUID().toString() + "." + ext)
        val input = cr.openInputStream(uri) ?: throw IllegalStateException("sem acesso")
        input.use { i -> file.outputStream().use { o -> i.copyTo(o) } }
        JSONObject()
            .put("type", "file").put("path", file.absolutePath).put("mime", mime)
            .put("name", name ?: file.name).put("size", file.length())
            .put("thumb", thumb(file, mime) ?: JSONObject.NULL)
    } catch (e: Exception) {
        null
    }

    private fun thumb(file: File, mime: String): String? = try {
        val bmp: Bitmap? = when {
            mime.startsWith("image/") -> {
                val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                BitmapFactory.decodeFile(file.path, bounds)
                var s = 1
                while (bounds.outWidth / s > 1000 || bounds.outHeight / s > 1000) s *= 2
                val raw = BitmapFactory.decodeFile(file.path, BitmapFactory.Options().apply { inSampleSize = s })
                raw?.let { rotate(it, file) }
            }
            mime.startsWith("video/") -> {
                val r = MediaMetadataRetriever()
                try { r.setDataSource(file.path); r.getFrameAtTime(1_000_000) } finally { r.release() }
            }
            else -> null
        }
        bmp?.let { b ->
            val scale = minOf(1f, 640f / maxOf(b.width, b.height))
            val small = if (scale < 1f) Bitmap.createScaledBitmap(b, (b.width * scale).toInt(), (b.height * scale).toInt(), true) else b
            val out = ByteArrayOutputStream()
            small.compress(Bitmap.CompressFormat.JPEG, 78, out)
            "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
        }
    } catch (e: Exception) {
        null
    }

    // Fotos da câmera vêm "deitadas" com a orientação no EXIF
    private fun rotate(b: Bitmap, file: File): Bitmap = try {
        val deg = when (ExifInterface(file.path).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
            ExifInterface.ORIENTATION_ROTATE_90 -> 90f
            ExifInterface.ORIENTATION_ROTATE_180 -> 180f
            ExifInterface.ORIENTATION_ROTATE_270 -> 270f
            else -> 0f
        }
        if (deg == 0f) b else Bitmap.createBitmap(b, 0, 0, b.width, b.height, Matrix().apply { postRotate(deg) }, true)
    } catch (e: Exception) {
        b
    }

    private fun inside(a: Activity, f: File) = f.canonicalPath.startsWith(File(a.filesDir, "shared").canonicalPath)

    private fun openFile(a: Activity, path: String) {
        val f = File(path)
        if (!f.exists() || !inside(a, f)) return
        val uri = FileProvider.getUriForFile(a, a.packageName + ".rete.files", f)
        val mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(f.extension) ?: "*/*"
        val view = Intent(Intent.ACTION_VIEW).setDataAndType(uri, mime)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        try { a.startActivity(Intent.createChooser(view, null)) } catch (e: Exception) { }
    }

    object Bridge {
        /** Devolve (e esvazia) o que chegou pelo "Compartilhar". */
        @JavascriptInterface
        fun take(): String = synchronized(pending) {
            val s = pending.toString()
            while (pending.length() > 0) pending.remove(0)
            s
        }

        /** Abre uma foto/vídeo/arquivo guardado no app com o aplicativo do sistema. */
        @JavascriptInterface
        fun open(path: String) {
            val a = activity ?: return
            a.runOnUiThread { openFile(a, path) }
        }

        /** Apaga o arquivo de um item esquecido. */
        @JavascriptInterface
        fun remove(path: String) {
            val a = activity ?: return
            try { val f = File(path); if (inside(a, f)) f.delete() } catch (e: Exception) { }
        }
    }
}
