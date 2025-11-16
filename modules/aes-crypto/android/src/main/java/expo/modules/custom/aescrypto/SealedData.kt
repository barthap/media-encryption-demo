package expo.modules.custom.aescrypto

import expo.modules.kotlin.sharedobjects.SharedObject
import java.nio.ByteBuffer
import javax.crypto.Cipher

class SealedData(
    val ivLength: Int,
    val tagLength: Int,
    private val content: ByteArray,
): SharedObject() {
    init {
        assert(content.size > ivLength + tagLength) {
            "Invalid SealedData size"
        }
    }

    constructor(iv: ByteArray, tagLength: Int, ciphertextLength: Int) : this(
        ivLength = iv.size,
        tagLength = tagLength,
        content = ByteArray(iv.size + ciphertextLength + tagLength).init {
            put(iv)
        }
    )

    constructor(iv: ByteArray, ciphertextWithTag: ByteArray, tagLength: Int) : this(
        ivLength = iv.size,
        tagLength = tagLength,
        content = ByteArray(iv.size + ciphertextWithTag.size).init {
            put(iv)
            put(ciphertextWithTag)
        }
    )

    val ciphertextSize: Int
        get() = content.size - ivLength - tagLength

    private val ivBuffer: ByteBuffer
        get() = ByteBuffer.wrap(content, 0, ivLength)

    // copies
    var ivBytes: ByteArray
        get() = ivBuffer.copiedArray()
        set(value) { ivBuffer.put(value) }

    val ciphertextBuffer: ByteBuffer
        get() = ByteBuffer.wrap(content, ivLength, ciphertextSize)

    val tagBuffer: ByteBuffer
        get() = ByteBuffer.wrap(content, content.size - tagLength, tagLength)

    val combinedBuffer: ByteBuffer
        get() = ByteBuffer.wrap(content)

    internal val nativeCipherBuffer: ByteBuffer
        get() = ByteBuffer.wrap(content, ivLength, ciphertextSize + tagLength)

    override fun getAdditionalMemoryPressure(): Int = content.size
}

internal fun Cipher.encrypt(plaintext: ByteBuffer): SealedData {
    val iv = this.iv
    val plaintextSize = plaintext.remaining()
    val ciphertextWithTagSize = this.getOutputSize(plaintextSize)
    val tagSize = ciphertextWithTagSize - plaintextSize

    val sealedData = SealedData(iv, tagSize, plaintextSize).also {
        this.doFinal(plaintext, it.nativeCipherBuffer)
    }
    return sealedData
}

internal fun Cipher.decrypt(sealedData: SealedData): ByteBuffer {
    val inputBuf = sealedData.nativeCipherBuffer
    val plaintextSize = this.getOutputSize(inputBuf.remaining())

    val plaintext = ByteBuffer.allocate(plaintextSize).also { outputBuf ->
        this.doFinal(inputBuf, outputBuf)
    }
    return plaintext
}

internal fun ByteBuffer.copiedArray(): ByteArray =
    ByteArray(remaining()).also { get(it) }

inline fun ByteArray.init(block: ByteBuffer.() -> Unit): ByteArray = apply {
    ByteBuffer.wrap(this).also { block(it) }
}