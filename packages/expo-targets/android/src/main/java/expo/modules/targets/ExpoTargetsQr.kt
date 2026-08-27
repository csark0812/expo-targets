package expo.modules.targets

import android.graphics.Bitmap
import android.graphics.Color
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter

/**
 * QR encode helper for RemoteViews / Glance deepen.
 * Requires `android.qr: true` (or an explicit ZXing `implementation`) on the widget config.
 */
object ExpoTargetsQr {
    @JvmStatic
    fun encode(text: String, sizePx: Int): Bitmap {
        val writer = QRCodeWriter()
        val matrix = writer.encode(text, BarcodeFormat.QR_CODE, sizePx, sizePx)
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        for (x in 0 until sizePx) {
            for (y in 0 until sizePx) {
                bitmap.setPixel(x, y, if (matrix.get(x, y)) Color.BLACK else Color.WHITE)
            }
        }
        return bitmap
    }
}
