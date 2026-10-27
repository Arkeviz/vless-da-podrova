<#
.SYNOPSIS
  Удаляет регистрацию native messaging host vless-da-podrova и папку установки.
#>
param(
  # Оставить файлы в %LOCALAPPDATA%\vless-da-podrova, убрать только регистрацию.
  [switch]$KeepFiles
)

$ErrorActionPreference = 'Stop'

$HostName = 'com.vless_da_podrova.helper'
$InstallDir = Join-Path $env:LOCALAPPDATA 'vless-da-podrova'
$RegistryRoots = @(
  'HKCU:\Software\Google\Chrome\NativeMessagingHosts',
  'HKCU:\Software\Microsoft\Edge\NativeMessagingHosts',
  'HKCU:\Software\Yandex\YandexBrowser\NativeMessagingHosts',
  'HKCU:\Software\Mozilla\NativeMessagingHosts'
)

foreach ($root in $RegistryRoots) {
  $key = Join-Path $root $HostName
  if (Test-Path $key) {
    Remove-Item -Path $key -Force
    Write-Host "Удалён ключ $key"
  }
}

if (-not $KeepFiles -and (Test-Path $InstallDir)) {
  try {
    Remove-Item -Recurse -Force $InstallDir
    Write-Host "Удалена папка $InstallDir"
  } catch {
    throw "Не удалось удалить $InstallDir - вероятно, хелпер или sing-box запущены. Закройте браузеры и повторите."
  }
}

Write-Host 'Готово.'
