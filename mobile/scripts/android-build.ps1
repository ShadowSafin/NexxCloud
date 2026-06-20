param(
  [ValidateSet("assembleDebug", "bundleDebug", "assembleRelease", "bundleRelease")]
  [string]$Task = "assembleDebug"
)

$ErrorActionPreference = "Stop"

$MobileRoot = Split-Path -Parent $PSScriptRoot
$AndroidRoot = Join-Path $MobileRoot "android"

$JavaHomeCandidates = @(@(
  $env:JAVA_HOME,
  "D:\Android Studio\jbr",
  "C:\Program Files\Android\Android Studio\jbr"
) | Where-Object { $_ -and (Test-Path (Join-Path $_ "bin\java.exe")) })

if (-not $JavaHomeCandidates -or $JavaHomeCandidates.Count -eq 0) {
  throw "Java was not found. Install Android Studio or set JAVA_HOME to its bundled JBR/JDK."
}

$SdkCandidates = @(@(
  $env:ANDROID_HOME,
  $env:ANDROID_SDK_ROOT,
  "D:\AS SDK",
  (Join-Path $env:LOCALAPPDATA "Android\Sdk")
) | Where-Object { $_ -and (Test-Path (Join-Path $_ "platforms")) -and (Test-Path (Join-Path $_ "build-tools")) })

if (-not $SdkCandidates -or $SdkCandidates.Count -eq 0) {
  throw "Android SDK was not found. Install Android SDK or set ANDROID_HOME/ANDROID_SDK_ROOT."
}

$env:JAVA_HOME = $JavaHomeCandidates[0]
$env:ANDROID_HOME = $SdkCandidates[0]
$env:ANDROID_SDK_ROOT = $SdkCandidates[0]
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

Write-Host "Using JAVA_HOME=$env:JAVA_HOME"
Write-Host "Using ANDROID_HOME=$env:ANDROID_HOME"

Push-Location $AndroidRoot
try {
  & .\gradlew.bat $Task
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}
finally {
  Pop-Location
}
