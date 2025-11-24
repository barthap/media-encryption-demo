import ExpoModulesCore
import CryptoKit
import CommonCrypto

let DEFAULT_IV_LENGTH = 12
let DEFAULT_TAG_LENGTH = 16

enum DataEncoding: String, Enumerable {
    case base64
    case hex
}

enum OutputFormat: String, Enumerable {
    case bytes
    case base64
}

internal struct SealedDataConfig: Record {
    @Field
    var ivLength: Int = DEFAULT_IV_LENGTH
    
    @Field
    var tagLength: Int = DEFAULT_TAG_LENGTH
}

internal struct CiphertextOptions: Record {
    @Field
    var includeTag: Bool = false
    
    @Field
    var outputFormat: OutputFormat = .bytes
}

internal struct EncryptOptions: Record {
    // either IV bytes or length to generate
    // TODO: In JS this is a nested Record
    @Field
    var nonce: Either<Data, Int>? = nil
    
    @Field
    var additionalData: Data? = nil
}

internal struct DecryptOptions: Record {
    @Field
    var output: OutputFormat = .bytes
    
    @Field
    var additionalData: Data? = nil
}

typealias SerializableData = Either<Data, String>

extension SerializableData {
    func intoData() throws -> Data {
        if let data: Data = self.get() {
            return data
        }
        
        let base64String = try self.as(String.self)
        guard let data = Data(base64Encoded: base64String) else {
            throw InvalidBase64Exception()
        }
        return data
    }
}

public class AesCryptoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AesCrypto")

      AsyncFunction("encryptAsync", self.encrypt)
      AsyncFunction("decryptAsync", self.decrypt)
      
      AsyncFunction("generateKey", self.generateKey)
      AsyncFunction("importKey", self.importKey)

      Class("EncryptionKey", EncryptionKey.self) {
              AsyncFunction("bytes") { (key: EncryptionKey) in key.bytes }
              AsyncFunction("encoded") { (key: EncryptionKey, encoding: DataEncoding) in
                  key.encoded(with: encoding)
              }
              Property("size") { (key: EncryptionKey) in key.keySize }
          }
          
          Class("SealedData", SealedData.self) {
              StaticFunction("fromCombined") { (combined: SerializableData, config: SealedDataConfig?) in
                  let config = config ?? SealedDataConfig()
                  
                  return try SealedData(ivLength: config.ivLength,
                                 tagLength: config.tagLength,
                                 content: combined.intoData())
              }
              StaticFunction("fromNonceAndCiphertext") { (iv: Data, ciphertext: Data, tag: Either<Data, Int>?) in
                  if let tagData: Data = tag?.get() {
                      return try SealedData(iv: iv,
                                            ciphertext: ciphertext,
                                            tag: tagData)
                  }
                  
                  let tagLength: Int = tag?.get() ?? DEFAULT_TAG_LENGTH
                  return try SealedData(iv: iv,
                                 ciphertextWithTag: ciphertext,
                                 tagLength: tagLength)
              }
              
              Property("combinedSize") { (sealedData: SealedData) in sealedData.combined.count }
              Property("ivSize") { (sealedData: SealedData) in  sealedData.iv.count }
              Property("tagSize") { (sealedData: SealedData) in  sealedData.tag.count }
              
              AsyncFunction("iv") { (sealedData: SealedData, format: OutputFormat?) -> Any in
                  sealedData.iv.formatted(with: format)
              }
              AsyncFunction("tag") { (sealedData: SealedData, format: OutputFormat?) -> Any in
                  sealedData.tag.formatted(with: format)
              }
              AsyncFunction("combined") { (sealedData: SealedData, format: OutputFormat?) -> Any in
                  sealedData.combined.formatted(with: format)
              }
              AsyncFunction("ciphertext") { (sealedData: SealedData, options: CiphertextOptions?) -> Any in
                  sealedData
                      .ciphertext(withTag: options?.includeTag ?? false)
                      .formatted(with: options?.outputFormat)
              }
          }
      }
    
    private func generateKey(size: KeySize?) -> EncryptionKey {
        EncryptionKey(size: size ?? KeySize.aes256)
    }
    
    private func importKey(rawKey: Either<Data, String>, encoding: DataEncoding?) throws -> EncryptionKey {
        if rawKey.is(Data.self) {
            return try EncryptionKey(bytes: rawKey.as(Data.self))
        }
        
        guard let dataEncoding = encoding else {
            throw MissingEncodingException()
        }
        let keyString = try rawKey.as(String.self)
        return try EncryptionKey(string: keyString, encodedWith: dataEncoding)
    }
    
    private func encrypt(plaintext: Data, key: EncryptionKey, options: EncryptOptions?) throws -> SealedData {
        let iv = if let bytes: Data = options?.nonce?.get() {
            try AES.GCM.Nonce(data: bytes)
        } else if let size: Int = options?.nonce?.get() {
            try AES.GCM.Nonce(ofSize: size)
        } else {
            AES.GCM.Nonce() // defaults to 12-byte nonce
        }
        
        let encryptionResult = if let aad = options?.additionalData {
            try AES.GCM.seal(plaintext,
                             using: key.cryptoKitKey,
                             nonce: iv,
                             authenticating: aad)
        } else {
            try AES.GCM.seal(plaintext, using: key.cryptoKitKey, nonce: iv)
        }

        return SealedData(sealedBox: encryptionResult)
    }
    
    private func decrypt(sealedData: SealedData,
                         key: EncryptionKey,
                         options: DecryptOptions?) throws -> Any {
        let plaintext: Data = if let aad = options?.additionalData {
            try AES.GCM.open(sealedData.nativeValue, using: key.cryptoKitKey, authenticating: aad)
        } else {
            try AES.GCM.open(sealedData.nativeValue, using: key.cryptoKitKey)
        }
        
        if options?.output == .base64 {
            return plaintext.base64EncodedData()
        }
        return plaintext
    }
}

enum KeySize: Int, Enumerable {
    case aes128 = 128
    case aes192 = 192
    case aes256 = 256
    
    func cryptoKitValue() -> CryptoKit.SymmetricKeySize {
        SymmetricKeySize(bitCount: self.rawValue)
    }
    
    var byteSize: Int { rawValue / 8 }
    
    static func isValidSize(byteLength: Int) -> Bool {
        allCases.contains(where: { $0.byteSize == byteLength })
    }
}

final class EncryptionKey: SharedObject {
    private var inner: CryptoKit.SymmetricKey
    
    init(size: KeySize) {
        inner = CryptoKit.SymmetricKey(size: size.cryptoKitValue())
    }
    
    init(bytes: Data) throws {
        guard KeySize.isValidSize(byteLength: bytes.count) else {
            throw InvalidKeySizeException(bytes.count)
        }
        inner = CryptoKit.SymmetricKey(data: bytes)
    }
    
    convenience init(string: String, encodedWith encoding: DataEncoding) throws {
        let data = switch encoding {
        case .base64:
            Data(base64Encoded: string)
        case .hex:
            Data(hexEncoded: string)
        }
        
        guard let bytes = data else {
            throw InvalidKeyFormatException()
        }
        try self.init(bytes: bytes)
    }
    
    var keySize: KeySize {
        KeySize(rawValue: inner.bitCount)!
    }

    var bytes: Data {
            var keyBytes = Data(count: keySize.byteSize)
            let _ = keyBytes.withUnsafeMutableBytes { dest in
                inner.withUnsafeBytes { src in
                    src.copyBytes(to: dest)
                }
            }
        return keyBytes
    }
    
    func encoded(with encoding: DataEncoding) -> String {
        bytes.getEncoded(with: encoding)
    }
    
    var cryptoKitKey: CryptoKit.SymmetricKey {
        inner
    }
    
    override func getAdditionalMemoryPressure() -> Int {
        self.keySize.byteSize
    }
}

final class SealedData: SharedObject {
    private var inner: AES.GCM.SealedBox
    
    init(sealedBox: AES.GCM.SealedBox) {
        inner = sealedBox
    }
    
    init(ivLength: Int, tagLength: Int, content: Data) throws {
        // SealedBox(combined:) works only if IV length is 12
        // otherwise this needs to be done manually
        if ivLength == 12 {
            inner = try AES.GCM.SealedBox(combined: content)
        } else {
            let nonce = try AES.GCM.Nonce(data: content.prefix(ivLength))
            inner = try AES.GCM.SealedBox(nonce: nonce,
                                          ciphertext: content.dropFirst(ivLength).dropLast(tagLength),
                                          tag: content.suffix(tagLength))
        }
    }
    
    init(iv: Data, ciphertext: Data, tag: Data) throws {
        let nonce = try AES.GCM.Nonce(data: iv)
        inner = try AES.GCM.SealedBox(nonce: nonce,
                                      ciphertext: ciphertext,
                                      tag: tag)
    }
    
    convenience init(iv: Data, ciphertextWithTag: Data, tagLength: Int) throws {
        try self.init(iv: iv,
                      ciphertext: ciphertextWithTag.dropLast(tagLength),
                      tag: ciphertextWithTag.suffix(tagLength))
    }
    
    var combined: Data {
        // combined works only if IV length is 12 bytes
        if let combined = inner.combined {
            return combined
        }
        
        return self.iv + inner.ciphertext + self.tag
    }
    
    var iv: Data {
        Data(inner.nonce)
    }
    
    var tag: Data {
        inner.tag
    }
    
    func ciphertext(withTag: Bool) -> Data {
        if withTag {
            return inner.ciphertext + inner.tag
        }
        return inner.ciphertext
    }
    
    var nativeValue: AES.GCM.SealedBox { inner }
    
    override func getAdditionalMemoryPressure() -> Int {
        self.combined.count
    }
}

final class InvalidKeySizeException : GenericException<Int>, @unchecked Sendable {
    override var reason: String {
        "Invalid key byte length: '\(param)'"
    }
}

final class InvalidKeyFormatException: Exception, @unchecked Sendable {
    override var reason: String {
        "Invalid key format provided"
    }
}

final class InvalidBase64Exception: Exception, @unchecked Sendable {
    override var reason: String {
        "Invalid base64 string"
    }
}

final class NonceGenerationFailedException: GenericException<Int>, @unchecked Sendable {
    override var reason: String {
        "Failed to generate IV of size '\(param)'"
    }
}

final class MissingEncodingException: Exception, @unchecked Sendable {
    override var reason: String {
        "Encoding argument must be provided for string inputs"
    }
}

extension Data {
    init?(hexEncoded: String) {
        let hex = hexEncoded.replacingOccurrences(of: "0x", with: "")
        guard hex.count.isMultiple(of: 2) else {
            return nil
        }
        
        let chars = hex.map { $0 }
        let bytes = stride(from: 0, to: chars.count, by: 2)
            .map { String(chars[$0]) + String(chars[$0 + 1]) }
            .compactMap { UInt8($0, radix: 16) }
        
        guard hex.count / bytes.count == 2 else { return nil }
        self.init(bytes)
    }
    
    func getEncoded(with encoding: DataEncoding) -> String {
        switch encoding {
        case .base64:
            self.base64EncodedString()
        case .hex:
            self.map { String(format: "%02hhx", $0) }.joined()
        }
    }
    
    func formatted(with format: OutputFormat?) -> Any {
        switch format {
        case .bytes,
        nil:
            return self
        case .base64:
            return self.base64EncodedString()
        }
    }
}

extension AES.GCM.Nonce {
    init(ofSize size: Int) throws {
        var data = Data(count: size)
        let status = SecRandomCopyBytes(kSecRandomDefault, size, &data)
        guard status == errSecSuccess else {
          throw NonceGenerationFailedException(size)
        }
        try self.init(data: data)
    }
}
