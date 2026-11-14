plugins {
    id("com.android.application")
}

android {
    namespace = "labs.bearframe.ghostsignal"
    compileSdk = 35
    buildFeatures { buildConfig = true }

    defaultConfig {
        applicationId = "labs.bearframe.ghostsignal"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0-dev"
    }
    buildTypes {
        getByName("release") { isMinifyEnabled = false }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    sourceSets.getByName("main").assets.srcDir(layout.buildDirectory.dir("generated/ghost-signal"))
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}

val copyGhostSignalAssets by tasks.registering(Sync::class) {
    from(rootProject.file("../frontend/public"))
    into(layout.buildDirectory.dir("generated/ghost-signal"))
}
tasks.named("preBuild") { dependsOn(copyGhostSignalAssets) }
