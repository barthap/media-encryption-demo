// eslint-disable-next-line @typescript-eslint/no-require-imports
const ip = require('internal-ip');

const corsProxyHost = process.env.CORS_PROXY_HOST || ip.internalIpV4Sync();
// Listen on a specific port via the PORT environment variable
const corsProxyPort = process.env.CORS_PROXY_PORT || 8079;

module.exports = {
    extra: {
      corsProxyURL: `http://${corsProxyHost}:${corsProxyPort}`
    },
    "name": "media-encryption-demo",
    "slug": "media-encryption-demo",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "mediaencryptiondemo",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.anonymous.media-encryption-demo"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false,
      "package": "com.anonymous.mediaencryptiondemo"
    },
    "web": {
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff",
          "dark": {
            "backgroundColor": "#000000"
          }
        }
      ],
      "expo-font",
      "expo-image-picker"
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    }
  }
