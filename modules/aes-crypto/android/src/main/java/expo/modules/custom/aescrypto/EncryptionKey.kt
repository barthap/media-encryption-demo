package expo.modules.custom.aescrypto

import expo.modules.kotlin.sharedobjects.SharedObject
import expo.modules.kotlin.types.Enumerable
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.SecretKeySpec

private const val ALGORITHM_AES = "AES"

enum class KeySize(val value: Int): Enumerable {
    AES128(128),
    AES192(192),
    AES256(256);

    val byteSize: Int
        get() = value / 8

    companion object : DefaultEnumValue<KeySize> {
        override fun defaultValue() = AES256

        fun fromByteLength(byteLen: Int): KeySize = requireNotNull(
            entries.find { it.value == byteLen * 8 }
        ) { "EncryptionKey cannot be created from bytes of length '$byteLen'"}
    }
}

class EncryptionKey: SharedObject {
    val keySize: KeySize
    private val nativeInstance: SecretKey

    constructor(size: KeySize) {
        val keygen = KeyGenerator.getInstance(ALGORITHM_AES).apply {
            init(size.value)
        }

        keySize = size
        nativeInstance = keygen.generateKey()
    }

    constructor(bytes: ByteArray) {
        keySize = KeySize.fromByteLength(bytes.size)
        nativeInstance = SecretKeySpec(bytes, ALGORITHM_AES)
    }

    val cryptoKey: SecretKey
        get() = nativeInstance

    val bytes: ByteArray
        get() = nativeInstance.encoded

    override fun getAdditionalMemoryPressure(): Int = keySize.byteSize

}