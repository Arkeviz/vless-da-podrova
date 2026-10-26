<#
.SYNOPSIS
  Устанавливает нативный хелпер vless-da-podrova и sing-box, регистрирует native messaging host
  для Chrome, Edge, Яндекс Браузера и Firefox. Права администратора не нужны.

.EXAMPLE
  .\scripts\install.ps1
  .\scripts\install.ps1 -SingBoxZip C:\Downloads\sing-box-1.14.4-windows-amd64.zip
#>
param(
  # Собранный хелпер (pnpm --filter @vdp/helper build).
  [string]$HelperExe = (Join-Path $PSScriptRoot '..\packages\helper\dist\vless-da-podrova-helper.exe'),
  # Локальный архив sing-box вместо скачивания с GitHub.
  [string]$SingBoxZip = '',
  # Разрешить установку sing-box, если хеш в скрипте ещё не закреплён.
  [switch]$AllowUnpinnedHash
)

$ErrorActionPreference = 'Stop'

# --- Закреплённая версия ядра. Обновление = смена версии и хеша. ---
$SingBoxVersion = '1.14.4'
$SingBoxSha256 = '99185d75d314a07dbba4a130c8ad986cbeb629a07927975636b341ca61f991df'  # SHA256 архива sing-box-$SingBoxVersion-windows-amd64.zip

$HostName = 'com.vless_da_podrova.helper'
# ID расширения в Chromium вычисляется из `key` в packages/extension/wxt.config.ts.
$ChromiumExtensionId = 'ambndojpohhjfclejjpbckmklinejioh'
$FirefoxExtensionId = 'vless-da-podrova@extension'

$InstallDir = Join-Path $env:LOCALAPPDATA 'vless-da-podrova'
$HelperTarget = Join-Path $InstallDir 'vless-da-podrova-helper.exe'
$CoreTarget = Join-Path $InstallDir 'sing-box.exe'

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
  throw "Хелпер не найден: $HelperExe. Соберите его: pnpm --filter @vdp/helper build"
}
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
try {
  Copy-Item -Force $HelperExe $HelperTarget
} catch {
  throw "Не удалось заменить $HelperTarget — вероятно, он запущен. Выключите прокси в расширении или закройте браузеры и повторите."
}

# --- sing-box ---
function Get-InstalledCoreVersion {
  if (-not (Test-Path $CoreTarget)) { return $null }
  $output = & $CoreTarget version 2>$null | Select-Object -First 1
  if ($output -match 'sing-box version (\S+)') { return $Matches[1] }
  return $null
}

$installedVersion = Get-InstalledCoreVersion
if ($installedVersion -eq $SingBoxVersion) {
  Write-Step "sing-box $SingBoxVersion уже установлен"
} else {
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
    if ($SingBoxSha256) {
      if ($actualHash -ne $SingBoxSha256.ToLowerInvariant()) {
        throw "Хеш архива sing-box не совпадает.`n  ожидался: $SingBoxSha256`n  получен:  $actualHash"
      }
    } elseif ($AllowUnpinnedHash) {
      Write-Warning "Хеш не закреплён. Закрепите его в scripts/install.ps1: `$SingBoxSha256 = '$actualHash'"
    } else {
      throw "Хеш sing-box не закреплён в скрипте. Хеш скачанного архива: $actualHash`n" +
        "Сверьте его и впишите в `$SingBoxSha256 в scripts/install.ps1 (или запустите с -AllowUnpinnedHash)."
    }

    Write-Step "Распаковываю sing-box $SingBoxVersion"
    Expand-Archive -Path $zip -DestinationPath $tempDir -Force
    $extracted = Join-Path $tempDir $archiveName
    try {
      Copy-Item -Force -Path (Join-Path $extracted '*') -Destination $InstallDir
    } catch {
      throw "Не удалось заменить sing-box — вероятно, он запущен. Выключите прокси в расширении и повторите."
    }
  } finally {
    Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
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
