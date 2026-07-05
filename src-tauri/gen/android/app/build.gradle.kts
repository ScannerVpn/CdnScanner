import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("rust")
}

val tauriProperties = Properties().apply {
    val propFile = file("tauri.properties")
    if (propFile.exists()) {
        propFile.inputStream().use { load(it) }
    }
}

// Load release signing credentials from src-tauri/keystore/keystore.properties
// (gitignored). Falls back to a no-op signing config if the file is missing,
// which keeps debug builds working out of the box.
//
// IMPORTANT: All paths in keystore.properties are resolved relative to the
// properties file's directory (i.e. src-tauri/keystore/). The storeFile value
// can be either a bare filename ("release.keystore") or an absolute path.
val keystorePropertiesFile = rootProject.file("../../keystore/keystore.properties")
val keystoreDir = keystorePropertiesFile.parentFile
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) {
        keystorePropertiesFile.inputStream().use { load(it) }
    }
}

android {
    compileSdk = 36
    namespace = "com.sni_scanner.app"
    defaultConfig {
        manifestPlaceholders["usesCleartextTraffic"] = "false"
        applicationId = "com.sni_scanner.app"
        minSdk = 24
        targetSdk = 36
        versionCode = tauriProperties.getProperty("tauri.android.versionCode", "1").toInt()
        versionName = tauriProperties.getProperty("tauri.android.versionName", "1.0")
    }
    signingConfigs {
        create("release") {
            if (keystorePropertiesFile.exists()) {
                // Resolve storeFile relative to keystore.properties's directory.
                // We use java.io.File directly because Gradle's `file()` overloads
                // changed in 8.x and don't reliably accept (File, String) anymore.
                val storeFileName = keystoreProperties.getProperty("storeFile")
                    ?: error("keystore.properties is missing required 'storeFile' key")
                val storePassword = keystoreProperties.getProperty("storePassword")
                    ?: error("keystore.properties is missing required 'storePassword' key")
                val keyAlias = keystoreProperties.getProperty("keyAlias")
                    ?: error("keystore.properties is missing required 'keyAlias' key")
                val keyPassword = keystoreProperties.getProperty("keyPassword")
                    ?: error("keystore.properties is missing required 'keyPassword' key")

                storeFile = java.io.File(keystoreDir, storeFileName)
                this.storePassword = storePassword
                this.keyAlias = keyAlias
                this.keyPassword = keyPassword
            }
        }
    }
    buildTypes {
        getByName("debug") {
            manifestPlaceholders["usesCleartextTraffic"] = "true"
            isDebuggable = true
            isJniDebuggable = true
            isMinifyEnabled = false
            packaging {                jniLibs.keepDebugSymbols.add("*/arm64-v8a/*.so")
                jniLibs.keepDebugSymbols.add("*/armeabi-v7a/*.so")
                jniLibs.keepDebugSymbols.add("*/x86/*.so")
                jniLibs.keepDebugSymbols.add("*/x86_64/*.so")
            }
        }
        getByName("release") {
            isMinifyEnabled = true
            proguardFiles(
                *fileTree(".") { include("**/*.pro") }
                    .plus(getDefaultProguardFile("proguard-android-optimize.txt"))
                    .toList().toTypedArray()
            )
            // Apply the release signing config if keystore.properties is present.
            // Otherwise the APK will be signed with the debug key (only suitable
            // for local testing, not distribution).
            if (keystorePropertiesFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        buildConfig = true
    }
}

rust {
    rootDirRel = "../../../"
}

dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.lifecycle:lifecycle-process:2.10.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.4")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.0")
}

apply(from = "tauri.build.gradle.kts")