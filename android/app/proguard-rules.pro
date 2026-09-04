# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# JNA references java.awt which doesn't exist on Android
-dontwarn java.awt.**
-dontwarn com.sun.jna.**

# JNA's native code resolves com.sun.jna.Pointer's `peer` field BY NAME over
# JNI in Native.initIDs(), so R8 renaming that class or its members throws
#   UnsatisfiedLinkError: Can't obtain peer field ID for class com.sun.jna.Pointer
# at class-init and kills the app during RN module init — every launch, on
# every minified release build (Play, GitHub APK and F-Droid alike; debug
# builds are unminified and were unaffected, which is why this shipped).
#
# JNA arrives through @walletconnect/react-native-compat, whose Android module
# pulls net.java.dev.jna and the Yttrium uniffi bindings. Autolinking is NOT
# flavor-aware, so RNWalletConnectPayModule is registered — and these classes
# ship — in BOTH flavors, including offline. Only the full flavor crashed
# because only its JS touches the module, which is what triggers the class
# init; offline is spared by accident, not by absence, so these rules are
# load-bearing there too (verified on device, 2026-09-04).
#
# The -dontwarn above silenced the build warning about exactly this while
# nothing kept the classes, so the failure only ever appeared at runtime.
-keep class com.sun.jna.** { *; }
-keepclassmembers class * extends com.sun.jna.** { public *; }

# uniffi's generated bindings are reached from Rust through JNA callbacks and
# structs matched by name; renaming them breaks the same lookup.
-keep class uniffi.** { *; }
