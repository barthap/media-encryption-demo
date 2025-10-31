package expo.modules.custom.imageloader

import android.graphics.BitmapFactory
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ImageLoaderModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ImageLoader")

    AsyncFunction("loadImageAsync") { data: ByteArray ->
      val options = BitmapFactory.Options().apply { inMutable = true }
      val bitmap = BitmapFactory.decodeByteArray(data, 0, data.size, options)
        ?: throw CannotLoadError()
      return@AsyncFunction ImageRef(bitmap, runtimeContext)
    }

    Class<ImageRef>("ImageRef") {
      Property("width") { image: ImageRef -> image.ref.width }
      Property("height") { image: ImageRef -> image.ref.height }
    }
  }
}

class CannotLoadError: CodedException("Cannot load data to bitmap")
