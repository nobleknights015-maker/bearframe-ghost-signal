plugins { id("com.android.application") }

android {
  namespace = "labs.bearframe.ghostsignal.expanded"
  compileSdk = 35
  buildFeatures { buildConfig = true }
  defaultConfig {
    // Independent from the original engine APK: never overwrite the owner's existing installation.
    applicationId = "labs.bearframe.ghostsignal.expanded"
    minSdk = 26
    targetSdk = 35
    versionCode = 3
    versionName = "0.2.2-expansion-dev"
  }
  buildTypes { getByName("release") { isMinifyEnabled = false } }
  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
  sourceSets.getByName("main").assets.srcDir(layout.buildDirectory.dir("generated/ghost-signal"))
}
dependencies {
  implementation("androidx.webkit:webkit:1.12.1")
}
val copyGhostSignalGame by tasks.registering(Sync::class) {
  from(rootProject.file("../frontend/public"))
  into(layout.buildDirectory.dir("generated/ghost-signal"))
}
tasks.named("preBuild") { dependsOn(copyGhostSignalGame) }
