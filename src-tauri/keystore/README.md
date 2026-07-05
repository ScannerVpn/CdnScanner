# Android Release Keystore — SNI Scanner

This directory holds the **release signing material** for the Android APK.
The actual `release.keystore` and `keystore.properties` are **gitignored** —
they contain secrets and must never be committed.

## Why not `tauri.conf.json`?

Tauri 2's `tauri.conf.json` schema does **not** include an Android signing
field. The official documented fields under `bundle.android` are only
`minSdkVersion`, `versionCode`, `autoIncrementVersionCode`, and
`debugApplicationIdSuffix`. See:
<https://v2.tauri.app/reference/config/#androidconfig>

Tauri 2 delegates the Android build to Gradle, so the signing config lives
in `src-tauri/gen/android/app/build.gradle.kts` (the generated Android
project). The `signingConfigs` block in that file loads
`keystore.properties` from this directory.

## Current state

A 25-year RSA-2048 release keystore already exists at `release.keystore`.
Its SHA-256 fingerprint can be retrieved with:

```bash
keytool -list -v -keystore release.keystore -storepass <storePassword>
```

The corresponding `keystore.properties` is also in this directory (gitignored).
The `keystore.properties.example` template is committed and shows the schema.

## Generating a fresh keystore

If you need to create a new keystore (e.g. for a different publisher), use:

```bash
keytool -genkeypair -v \
  -keystore release.keystore \
  -alias release \
  -keyalg RSA -keysize 2048 \
  -validity 9125 \
  -storepass "<storePassword>" \
  -keypass   "<keyPassword>" \
  -dname "CN=SNI Scanner, OU=Mobile, O=ScannerVpn, L=Tehran, ST=Tehran, C=IR"
```

| Field           | Value           | Why                                                  |
|-----------------|-----------------|------------------------------------------------------|
| Alias           | `release`       | Must match `keyAlias` in `keystore.properties`       |
| Key algorithm   | RSA 2048        | Play Store minimum; 4096 also works but bloats APK   |
| Validity        | 9125 days (25y) | Long enough to outlive the app's market life         |
| CN/OU/O/C       | see `-dname`    | Free-form; embedded in the cert's Distinguished Name |

> ⚠️ **The keystore is irreplaceable.** If you lose it, you can never push
> updates to the same Play Store listing — Play enforces the same signing
> key for app updates. Back it up to 1Password / an encrypted USB drive
> / your team's secret manager.

## Verifying a signed APK

After `./build-tauri-android.bat` (or `npx tauri android build --apk`),
confirm the APK was signed with this release key (not the debug key):

```bash
# apksigner is in $ANDROID_HOME/build-tools/<version>/
"$ANDROID_HOME/build-tools/35.0.0/apksigner" verify \
  --verbose --print-certs \
  "src-tauri/gen/android/app/build/outputs/apk/release/app-release.apk"
```

Look for:

* `Verified using v1 scheme (JAR signing): true`
* `Verified using v2 scheme (APK Signature Scheme v2): true`
* `Verified using v3 scheme (APK Signature Scheme v3): true`
* The certificate **Subject** should match your `-dname` (e.g. `CN=SNI Scanner, …`)
* It should **NOT** say `Android Debug` anywhere

If the cert subject says "Android Debug" or `OU=Android Debug`, the
`keystore.properties` is missing or the signing config didn't apply.

## How signing is wired up

1. `build.gradle.kts` (in `src-tauri/gen/android/app/`) loads
   `keystore.properties` and configures a `release` signingConfig.
2. The `release` buildType attaches that signingConfig — but only if
   `keystore.properties` exists. Missing file = APK signed with debug key
   (fine for local testing, **not** for distribution).
3. `build-tauri-android.bat` warns at build time if `keystore.properties`
   is missing.

## Rotating / migrating the keystore

1. Generate the new keystore (above).
2. Update `keystore.properties` with the new file + passwords.
3. Build, sign, and Play-upload a "key upgrade" release (Play Console
   supports opt-in signing key upgrades — see Play Console help).
