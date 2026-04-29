package tech.gapsign

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class BuildConfigModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "BuildConfig"

  override fun getConstants(): Map<String, Any> =
    mapOf("INTERNET_ENABLED" to BuildConfig.INTERNET_ENABLED)
}
