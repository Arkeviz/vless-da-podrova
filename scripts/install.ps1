<#
.SYNOPSIS
  Устанавливает нативный хелпер vless-da-podrova и sing-box, регистрирует native messaging host
  для Chrome, Edge, Яндекс Браузера и Firefox. Права администратора не нужны.

  Работает в двух раскладках: из релизного архива (рядом лежат helper\, sing-box\, extension\)
  и из репозитория (хелпер собран в packages\helper\dist).

.EXAMPLE
  .\install.ps1
  .\install.ps1 -SingBoxZip C:\Downloads\sing-box-1.14.4-windows-amd64.zip
#>
param(
  # Хелпер: по умолчанию из релизного архива, а если его нет - из сборки репозитория.
  [string]$HelperExe = '',
  # Локальный архив sing-box вместо sing-box\ из релиза и скачивания с GitHub.
  [string]$SingBoxZip = ''
)

$ErrorActionPreference = 'Stop'

# --- Закреплённая версия ядра и хеш архива: scripts\sing-box.json (общий с упаковкой релиза). ---
$core = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot 'sing-box.json') | ConvertFrom-Json
$SingBoxVersion = $core.version
$SingBoxSha256 = $core.sha256  # SHA256 архива sing-box-$SingBoxVersion-windows-amd64.zip

$HostName = 'com.vless_da_podrova.helper'
# ID расширения в Chromium вычисляется из `key` в packages/extension/wxt.config.ts.
$ChromiumExtensionId = 'ambndojpohhjfclejjpbckmklinejioh'
$FirefoxExtensionId = 'vless-da-podrova@extension'

$InstallDir = Join-Path $env:LOCALAPPDATA 'vless-da-podrova'
$HelperTarget = Join-Path $InstallDir 'vless-da-podrova-helper.exe'
$CoreTarget = Join-Path $InstallDir 'sing-box.exe'

$BundleHelper = Join-Path $PSScriptRoot 'helper\vless-da-podrova-helper.exe'
$BundleCoreDir = Join-Path $PSScriptRoot 'sing-box'
$BundleExtensions = Join-Path $PSScriptRoot 'extension'
if (-not $HelperExe) {
  $HelperExe = if (Test-Path $BundleHelper) { $BundleHelper } else {
    Join-Path $PSScriptRoot '..\packages\helper\dist\vless-da-podrova-helper.exe'
  }
}

$RegistryRoots = [ordered]@{
  'Chrome'          = 'HKCU:\Software\Google\Chrome\NativeMessagingHosts'
  'Edge'            = 'HKCU:\Software\Microsoft\Edge\NativeMessagingHosts'
  'Яндекс Браузер'  = 'HKCU:\Software\Yandex\YandexBrowser\NativeMessagingHosts'
  'Firefox'         = 'HKCU:\Software\Mozilla\NativeMessagingHosts'
}

function Write-Step([string]$Message) { Write-Host "==> $Message" -ForegroundColor Cyan }

# --- Хелпер ---
Write-Step 'Копирую хелпер'
if (-not (Test-Path $HelperExe)) {
  throw "Хелпер не найден: $HelperExe. Из репозитория его нужно собрать: pnpm --filter @vdp/helper build"
}
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
try {
  Copy-Item -Force $HelperExe $HelperTarget
} catch {
  throw "Не удалось заменить $HelperTarget - вероятно, он запущен. Выключите прокси в расширении или закройте браузеры и повторите."
}

# --- sing-box ---
function Get-InstalledCoreVersion {
  if (-not (Test-Path $CoreTarget)) { return $null }
  $output = & $CoreTarget version 2>$null | Select-Object -First 1
  if ($output -match 'sing-box version (\S+)') { return $Matches[1] }
  return $null
}

function Copy-CoreFiles([string]$From) {
  try {
    Copy-Item -Force -Path (Join-Path $From '*') -Destination $InstallDir
  } catch {
    throw "Не удалось заменить sing-box - вероятно, он запущен. Выключите прокси в расширении и повторите."
  }
}

$installedVersion = Get-InstalledCoreVersion
$useBundledCore = (-not $SingBoxZip) -and (Test-Path (Join-Path $BundleCoreDir 'sing-box.exe'))

if ($installedVersion -eq $SingBoxVersion) {
  Write-Step "sing-box $SingBoxVersion уже установлен"
} elseif ($useBundledCore) {
  Write-Step 'Копирую sing-box из релизного архива'
  Copy-CoreFiles $BundleCoreDir
  $bundledVersion = Get-InstalledCoreVersion
  if ($bundledVersion -ne $SingBoxVersion) {
    Write-Warning "В архиве sing-box $bundledVersion, а ожидался $SingBoxVersion."
  }
} else {
  if (-not $SingBoxZip) { Write-Step 'sing-box в архиве не найден - скачиваю' }
  $archiveName = "sing-box-$SingBoxVersion-windows-amd64"
  $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "vdp-$([guid]::NewGuid())"
  New-Item -ItemType Directory -Path $tempDir | Out-Null
  try {
    if ($SingBoxZip) {
      $zip = $SingBoxZip
    } else {
      $zip = Join-Path $tempDir "$archiveName.zip"
      $url = "https://github.com/SagerNet/sing-box/releases/download/v$SingBoxVersion/$archiveName.zip"
      Write-Step "Скачиваю $url"
      [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
      Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    }

    $actualHash = (Get-FileHash -Algorithm SHA256 $zip).Hash.ToLowerInvariant()
    if ($actualHash -ne $SingBoxSha256.ToLowerInvariant()) {
      throw "Хеш архива sing-box не совпадает.`n  ожидался: $SingBoxSha256`n  получен:  $actualHash"
    }

    Write-Step "Распаковываю sing-box $SingBoxVersion"
    Expand-Archive -Path $zip -DestinationPath $tempDir -Force
    Copy-CoreFiles (Join-Path $tempDir $archiveName)
  } finally {
    Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
  }
}

# --- Расширения (только из релизного архива): кладём в папку установки, чтобы архив можно было удалить ---
$ExtensionsTarget = Join-Path $InstallDir 'extension'
if (Test-Path $BundleExtensions) {
  Write-Step "Копирую расширения в $ExtensionsTarget"
  try {
    if (Test-Path $ExtensionsTarget) { Remove-Item -Recurse -Force $ExtensionsTarget }
    Copy-Item -Recurse -Force $BundleExtensions $ExtensionsTarget
  } catch {
    Write-Warning "Не удалось обновить $ExtensionsTarget - закройте браузеры и повторите. Расширения можно взять и из папки архива."
  }
}

# --- Манифесты native messaging ---
Write-Step 'Пишу манифесты native messaging'
$description = 'vless-da-podrova: запуск sing-box для расширения'
$chromiumManifest = Join-Path $InstallDir 'host-chromium.json'
$firefoxManifest = Join-Path $InstallDir 'host-firefox.json'

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chromiumManifest, (@{
  name            = $HostName
  description     = $description
  path            = $HelperTarget
  type            = 'stdio'
  allowed_origins = @("chrome-extension://$ChromiumExtensionId/")
} | ConvertTo-Json), $utf8NoBom)
[System.IO.File]::WriteAllText($firefoxManifest, (@{
  name               = $HostName
  description        = $description
  path               = $HelperTarget
  type               = 'stdio'
  allowed_extensions = @($FirefoxExtensionId)
} | ConvertTo-Json), $utf8NoBom)

# --- Реестр ---
foreach ($browser in $RegistryRoots.Keys) {
  $key = Join-Path $RegistryRoots[$browser] $HostName
  $manifest = if ($browser -eq 'Firefox') { $firefoxManifest } else { $chromiumManifest }
  New-Item -Path $key -Force | Out-Null
  Set-Item -Path $key -Value $manifest
  Write-Host "    $browser`t$key"
}

Write-Step "Готово. Установлено в $InstallDir (sing-box $(Get-InstalledCoreVersion))"
if (Test-Path $ExtensionsTarget) {
  Write-Host "Расширения: $ExtensionsTarget\chrome (Chrome, Edge, Яндекс) и $ExtensionsTarget\firefox"
}
