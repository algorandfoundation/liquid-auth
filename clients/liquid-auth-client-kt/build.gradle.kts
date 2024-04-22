plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.kapt")
    id("dagger.hilt.android.plugin")
}

android {
    namespace = "foundation.algorand.auth"
    compileSdk = 34

    defaultConfig {
        minSdk = 24

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        consumerProguardFiles("consumer-rules.pro")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    buildFeatures {
        buildConfig = true
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
}

dependencies {
    // AlgoSDK
    implementation("com.algorand:algosdk:2.4.0")
    // FIDO2
    implementation("com.google.android.gms:play-services-fido:20.1.0")
    // Barcode Scanner
    implementation("com.google.mlkit:barcode-scanning-common:17.0.0")
    implementation("com.google.mlkit:camera:16.0.0-beta3")
    // Signaling Service
    implementation("io.socket:socket.io-client:2.1.0")
    implementation("org.webrtc:google-webrtc:1.0.32006")

    val coroutineVersion by extra { "1.7.1" }
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:$coroutineVersion")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:$coroutineVersion")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:$coroutineVersion")

    val hiltVersion by extra { "2.48" }
    implementation("com.google.dagger:hilt-android:$hiltVersion")
    kapt("com.google.dagger:hilt-compiler:$hiltVersion")
    kapt("androidx.hilt:hilt-compiler:1.1.0")

    val okhttpVersion by extra { "4.12.0" }
    implementation("com.squareup.okhttp3:okhttp:$okhttpVersion")
    implementation("ru.gildor.coroutines:kotlin-coroutines-okhttp:1.0")

    // Dev Dependencies
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
}
