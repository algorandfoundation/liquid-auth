package foundation.algorand.auth.connect

import android.util.Log
import com.google.mlkit.vision.barcode.common.Barcode
import org.json.JSONObject
import javax.inject.Inject

class AuthMessage @Inject constructor(
    var origin: String,
    val requestId: Double
) {
    companion object {
        const val TAG = "connect.Message"
        /**
         * Parse the `Barcode`
         *
         * uses JSON for serialization
         * @todo: Use a URL for the serialization to allow for deep-links
         * @note: Suggest liquid://{ORIGIN}/{REQUEST_ID}/
         */
        fun fromBarcode(barcode: Barcode): AuthMessage {
            Log.d(TAG, "fromBarcode(${barcode.displayValue})")
            val json = JSONObject(barcode.displayValue.toString())
            val origin = json.get("origin").toString()
            val requestId = json.get("requestId").toString().toDouble()
            return AuthMessage(origin, requestId)
        }
    }
    fun toJSON() : JSONObject {
        val result = JSONObject()
        result.put("origin", origin)
        result.put("requestId", requestId)
        return result
    }
}
