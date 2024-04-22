package foundation.algorand.demo

import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import java.util.stream.Collectors


class Cookies : CookieJar {
    private val storage: MutableList<Cookie> = ArrayList()
    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        storage.addAll(cookies)
    }
    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        storage.removeIf { cookie: Cookie -> cookie.expiresAt < System.currentTimeMillis() }
        return storage.stream().filter { cookie: Cookie ->
            cookie.matches(
                url
            )
        }.collect(Collectors.toList())
    }
    fun clear() {
        storage.clear()
    }
}
