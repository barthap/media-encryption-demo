package expo.modules.custom.aescrypto

import expo.modules.core.errors.CodedException
import expo.modules.core.utilities.ifNull
import expo.modules.kotlin.apifeatures.EitherType
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.typedarray.Uint8Array
import expo.modules.kotlin.types.Either
import expo.modules.kotlin.types.Enumerable
import java.nio.ByteBuffer
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

private const val ALGORITHM_AES = "AES"
private const val CIPHER_TRANSFORMATION_NAME = "AES/GCM/NoPadding"
private const val IV_LENGTH = 12 // bytes - unique Initialization Vector (nonce)
private const val TAG_LENGTH = 16 // bytes - GCM auth tag

// https://discuss.kotlinlang.org/t/proposal-this-type-for-generics-can-kotlin-interface-detects-on-which-class-is-attached-to-on-its-own/26321/4
// https://medium.com/@jerzy.chalupski/emulating-self-types-in-kotlin-d64fe8ea2e62
interface DefaultEnumValue<Self: Enumerable> {
  fun defaultValue(): Self
}

//fun <T: EnumWithDefault<T>> T.default(): T = defaultValue()

private const val DEFAULT_TAG_LENGTH: Int = 16

class AesCryptoModule : Module() {
  @OptIn(EitherType::class)
  override fun definition() = ModuleDefinition {
    Name("AesCrypto")

    AsyncFunction("generateKey", this@AesCryptoModule::generateKey)
    AsyncFunction("importKey", this@AesCryptoModule::importKey)

    AsyncFunction("encryptAsync", this@AesCryptoModule::encrypt)
    AsyncFunction("decryptAsync", this@AesCryptoModule::decrypt)

    Class("SymmetricKey", SymmetricKey::class) {
      Constructor { input: Either<KeySize, ByteArray>? ->
        val input = input ?:
          return@Constructor SymmetricKey(KeySize.AES256)

        return@Constructor if (input.`is`(KeySize::class)) {
          SymmetricKey(input.get(KeySize::class))
        } else {
          SymmetricKey(input.get(ByteArray::class))
        }
      }

      AsyncFunction("bytes") { key: SymmetricKey -> key.bytes }
      Property("size") { key: SymmetricKey -> key.keySize }
    }

    Class("SealedData", SealedData::class) {
      // TODO: Class cannot have multiple constructors
      // use static functions instead
      Constructor { iv: ByteArray, ciphertextWithTag: ByteArray, tagLength: Int? ->
        SealedData(iv, ciphertextWithTag, tagLength ?: DEFAULT_TAG_LENGTH)
      }
      Constructor { combined: ByteArray, ivLength: Int, tagLength: Int?  ->
        SealedData(ivLength, tagLength ?: DEFAULT_TAG_LENGTH, content = combined)
      }

      Property("combinedSize") { sealedData -> sealedData.combinedBuffer.remaining() }
      Property("ivSize") { sealedData -> sealedData.ivLength }
      Property("tagSize") { sealedData -> sealedData.tagLength }

      Function("iv") { sealedData: SealedData ->
        sealedData.ivBytes
      }
      Function("combined") { sealedData: SealedData ->
        sealedData.combinedBuffer.array()
      }
      Function("ciphertext") { sealedData: SealedData, includeTag: Boolean? ->
        if (includeTag ?: false) {
          sealedData.nativeCipherBuffer.copiedArray()
        } else {
          sealedData.ciphertextBuffer.copiedArray()
        }
      }
    }
  }

  // region Function implementations

  /**
   * Generates AES-256 key and returns it
   */
  private fun generateKey(size: KeySize?): SymmetricKey {
    return SymmetricKey(size ?: KeySize.AES256)
  }
  private fun importKey(data: ByteArray): SymmetricKey {
    return SymmetricKey(data)
  }

  /**
   * Encrypts given [plaintext] with provided key and saves encrypted results
   * (sealed data) into [destination]. After the encryption, the destination
   * array will contain the following, concatenated in order:
   * - IV
   * - Ciphertext with GCM tag
   *
   * @param rawKey AES-256 key bytes. Must be of length [KEY_SIZE]
   * @param plaintext
   */
  private fun encrypt(
    key: SymmetricKey,
    plaintext: ByteArray,
    aad: ByteArray?,
  ): SealedData {
    val key = key.cryptoKey
    val plaintextBuffer = ByteBuffer.wrap(plaintext)

    val cipher = Cipher.getInstance(CIPHER_TRANSFORMATION_NAME).apply {
//      val params = GCMParameterSpec(TAG_LENGTH, iv)
      init(Cipher.ENCRYPT_MODE, key/*, params*/)
      aad?.let { updateAAD(it) }
    }

    val sealedData = cipher.encrypt(plaintextBuffer)
//    return sealedData.combinedBuffer.array()
    return sealedData
  }

  /**
   * Decrypts given [sealedData] using provided key and stores decrypted
   * plaintext in the [destination] array.
   *
   * @param rawKey AES-256 key bytes. Must be of length [KEY_SIZE]
   * @param sealedData Typed array consisting of 12-byte IV, followed by
   * actual ciphertext content and ending with 16-byte GCM tag.
   * @return plaintext - should be of ciphertext content length
   */
  private fun decrypt(
    key: SymmetricKey,
    sealedData: SealedData,
    aad: ByteArray?,
  ): ByteArray {
    val key = key.cryptoKey
//    val sealedData = SealedData(IV_LENGTH, TAG_LENGTH, sealedDataArr)

    val spec = GCMParameterSpec(TAG_LENGTH * 8, sealedData.ivBytes)
    val cipher = Cipher.getInstance(CIPHER_TRANSFORMATION_NAME).apply {
      init(Cipher.DECRYPT_MODE, key, spec)
    }
    aad?.let { cipher.updateAAD(it) }

    val plaintext = cipher.decrypt(sealedData)
    return plaintext.array()
  }

  // endregion
}

// region Exception definitions

private class InvalidKeyLengthException :
  CodedException("The AES key has invalid length")

private class InvalidDataLengthException :
  CodedException("Source or destination array has invalid length")

// endregion