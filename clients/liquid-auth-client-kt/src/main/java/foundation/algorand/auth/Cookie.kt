package foundation.algorand.auth

import android.util.Log
import okhttp3.Response

class Cookie {
    companion object {
        private const val SESSION_KEY = "connect.sid="
        fun fromResponse(response: Response) : String? {
            Log.d("Cookie", response.headers.toString())
            val cookie = response.headers("set-cookie").find { it.startsWith(SESSION_KEY) }
            return cookie
        }
        fun format(sessionId: String): String {
            return "$SESSION_KEY$sessionId"
        }
        fun getID(cookie: String): String {
            return cookie.substringAfter("${SESSION_KEY}s%3A").substringBefore(".")
        }
    }

}
