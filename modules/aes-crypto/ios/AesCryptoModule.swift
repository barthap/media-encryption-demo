import ExpoModulesCore
import CryptoKit
import CommonCrypto

let DEFAULT_TAG_LENGTH = 16

public class AesCryptoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AesCrypto")

      AsyncFunction("encryptAsync", self.encrypt)
      AsyncFunction("decryptAsync", self.decrypt)
      
      AsyncFunction("generateKey", self.generateKey)
      AsyncFunction("importKey", self.importKey)

      Class("SymmetricKey", EncryptionKey.self) {
          Constructor { (input: Either<KeySize, Data>?) in
              guard let input = input else {
                  return EncryptionKey(size: .aes256)
              }
              
              
              if input.is(KeySize.self) {
                  return try EncryptionKey(size: input.as(KeySize.self))
              } else {
                  return try EncryptionKey(bytes: input.as(Data.self))
              }
          }
              
              AsyncFunction("bytes") { (key: EncryptionKey) in key.bytes }
              Property("size") { (key: EncryptionKey) in key.keySize }
          }
          
          Class("SealedData", SealedData.self) {
              // TODO: Class cannot have multiple constructors
              // use static functions instead
              
              
              Constructor { (combined: Data, ivLength: Int, tagLength: Int?) in
                  try SealedData(ivLength: ivLength, tagLength: tagLength ?? DEFAULT_TAG_LENGTH, content: combined)
              }
              
              
              Constructor { (iv: Data, ciphertextWithTag: Data, tagLength: Int?) in
                  try SealedData(iv: iv,
                                 ciphertextWithTag: ciphertextWithTag,
                                 tagLength: tagLength ?? DEFAULT_TAG_LENGTH)
              }

              
              
              Property("combinedSize") { (sealedData: SealedData) in sealedData.combined.count }
              Property("ivSize") { (sealedData: SealedData) in  sealedData.iv.count }
              Property("tagSize") { (sealedData: SealedData) in  sealedData.tag.count }
              
              Function("iv") { (sealedData: SealedData) in
                  sealedData.iv
              }
              Function("combined") { (sealedData: SealedData) in
                  sealedData.combined
              }
              Function("ciphertext") { (sealedData: SealedData, includeTag: Bool?) in
                  let ivLength = sealedData.iv.count
                  let ciphertextWithTag = sealedData.combined.advanced(by: ivLength)
                  
                  if (includeTag ?? false) {
                      return ciphertextWithTag
                  }
                  
                  let tagLength = sealedData.tag.count
                  return ciphertextWithTag.dropLast(tagLength)
                  
              }
          }
      }
    
    private func generateKey(size: KeySize?) -> EncryptionKey {
        return EncryptionKey(size: size ?? KeySize.aes256)
    }
    
    private func importKey(keyBytes: Data) throws -> EncryptionKey {
        try EncryptionKey(bytes: keyBytes)
    }
    
    private func encrypt(key: EncryptionKey, plaintext: Data, aad: Data?) throws -> SealedData {
        let iv = AES.GCM.Nonce()
        
        let encryptionResult = if let aad = aad {
            try AES.GCM.seal(plaintext,
                             using: key.cryptoKitKey,
                             nonce: iv,
                             authenticating: aad)
        } else {
            try AES.GCM.seal(plaintext, using: key.cryptoKitKey, nonce: iv)
        }

        let sealedData = SealedData(sealedBox: encryptionResult)
        return sealedData
    }
    
    private func decrypt(    key: EncryptionKey,
                             sealedData: SealedData,
                             aad: Data?) throws -> Data {
        let plaintext: Data = if let aad = aad {
            try AES.GCM.open(sealedData.nativeValue, using: key.cryptoKitKey, authenticating: aad)
        } else {
            try AES.GCM.open(sealedData.nativeValue, using: key.cryptoKitKey)
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
    
    init(iv: Data, ciphertextWithTag: Data, tagLength: Int) throws {
        let nonce = try AES.GCM.Nonce(data: iv)
        inner = try AES.GCM.SealedBox(nonce: nonce,
                                      ciphertext: ciphertextWithTag.dropLast(tagLength),
                                      tag: ciphertextWithTag.suffix(tagLength))
    }
    
    var combined: Data {
        // TODO: combined works only if IV length is 12
        // otherwise need to be done manually
        inner.combined!
    }
    
    var iv: Data {
        Data(inner.nonce)
    }
    
    var tag: Data {
        inner.tag
    }
    
    var nativeValue: AES.GCM.SealedBox { inner }
    
    override func getAdditionalMemoryPressure() -> Int {
        self.combined.count
    }
}

final class InvalidKeySizeException : GenericException<Int> {
    override var reason: String {
        "Invalid key byte length: \(param)"
    }
}
