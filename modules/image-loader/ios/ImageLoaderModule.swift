import ExpoModulesCore

public class ImageLoaderModule: Module {
  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.
  public func definition() -> ModuleDefinition {
    // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
    // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
    // The module will be accessible from `requireNativeModule('ImageLoader')` in JavaScript.
    Name("ImageLoader")

    // Defines constant property on the module.
    Constant("PI") {
      Double.pi
    }

    // Defines event names that the module can send to JavaScript.
    Events("onChange")

    // Defines a JavaScript synchronous function that runs the native code on the JavaScript thread.
    Function("hello") {
      return "Hello world! 👋"
    }

    // Defines a JavaScript function that always returns a Promise and whose native code
    // is by default dispatched on the different thread than the JavaScript runtime runs on.
    AsyncFunction("setValueAsync") { (value: String) in
      // Send an event to JavaScript.
      self.sendEvent("onChange", [
        "value": value
      ])
    }
      
      AsyncFunction("loadImageAsync") { (data: Data) in
          guard let image = UIImage(data: data) else {
              throw CannotLoadError()
          }
          return ImageRef(image)
      }
      
      Class("ImageRef", ImageRef.self) {
          Property("width") { (image: ImageRef) -> Int in
              return image.ref.cgImage?.width ?? 0
          }
          
          Property("height") { (image: ImageRef) -> Int in
              return image.ref.cgImage?.height ?? 0
          }
      }
  }
}

public final class CannotLoadError: Exception, @unchecked Sendable {
  override public var reason: String {
    "Cannot load image from data"
  }
}
