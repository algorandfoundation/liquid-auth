package foundation.algorand.auth.crypto
import java.security.SecureRandom
//https://github.com/algorand/java-algorand-sdk/blob/ed90c24a9b4439d3e5df603a04c4658668d119f1/src/main/java/com/algorand/algosdk/account/Account.java#L629
class FixedSecureRandom(fixedValue: ByteArray) : SecureRandom() {
    private val fixedValue: ByteArray
    private var index = 0

    init {
        this.fixedValue = fixedValue.copyOf(fixedValue.size)
    }

    override fun nextBytes(bytes: ByteArray) {
        if (index >= fixedValue.size) {
            // no more data to copy
            return
        }
        var len = bytes.size
        if (len > fixedValue.size - index) {
            len = fixedValue.size - index
        }
        System.arraycopy(fixedValue, index, bytes, 0, len)
        index += bytes.size
    }

    override fun generateSeed(numBytes: Int): ByteArray {
        val bytes = ByteArray(numBytes)
        nextBytes(bytes)
        return bytes
    }
}
