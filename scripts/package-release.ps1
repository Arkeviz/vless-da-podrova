<#
.SYNOPSIS
  Собирает релизный архив release\vless-da-podrova-<версия>.zip: расширения (Chromium и Firefox),
  хелпер, sing-box, скрипты установки и README.txt. Версия - из корневого package.json.

.EXAMPLE
  .\scripts\package-release.ps1
  .\scripts\package-release.ps1 -SkipBuild -SingBoxZip C:\Downloads\sing-box-1.14.4-windows-amd64.zip
#>
param(
  # Не запускать pnpm build - взять уже собранное.
  [switch]$SkipBuild,
  # Локальный архив sing-box вместо скачивания с GitHub.
  [string]$SingBoxZip = ''
)

$ErrorActionPreference = 'Stop'
$Repo = Resolve-Path (Join-Path $PSScriptRoot '..')

function Write-Step([string]$Message) { Write-Host "==> $Message" -ForegroundColor Cyan }

$version = (Get-Content -Raw -Encoding UTF8 (Join-Path $Repo 'package.json') | ConvertFrom-Json).version
$core = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot 'sing-box.json') | ConvertFrom-Json
$archiveName = "sing-box-$($core.version)-windows-amd64"

$extensionOutput = Join-Path $Repo 'packages\extension\.output'
$helperExe = Join-Path $Repo 'packages\helper\dist\vless-da-podrova-helper.exe'
$releaseDir = Join-Path $Repo 'release'
$bundleName = "vless-da-podrova-$version"
$stage = Join-Path $releaseDir $bundleName
$zipPath = Join-Path $releaseDir "$bundleName.zip"

# --- Сборка ---
if (-not $SkipBuild) {
  Write-Step 'pnpm build'
  Push-Location $Repo
  try {
    pnpm build
    if ($LASTEXITCODE -ne 0) { throw 'pnpm build завершился с ошибкой' }
  } finally { Pop-Location }
}
foreach ($path in @((Join-Path $extensionOutput 'chrome-mv3'), (Join-Path $extensionOutput 'firefox-mv2'), $helperExe)) {
  if (-not (Test-Path $path)) { throw "Нет $path - выполните pnpm build" }
}

# --- sing-box: кэш в .tools, хеш сверяется всегда ---
$zip = $SingBoxZip
if (-not $zip) {
  $toolsDir = Join-Path $Repo '.tools'
  New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
  $zip = Join-Path $toolsDir "$archiveName.zip"
  if (-not (Test-Path $zip)) {
    $url = "https://github.com/SagerNet/sing-box/releases/download/v$($core.version)/$archiveName.zip"
    Write-Step "Скачиваю $url"
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
  }
}
$actualHash = (Get-FileHash -Algorithm SHA256 $zip).Hash.ToLowerInvariant()
if ($actualHash -ne $core.sha256.ToLowerInvariant()) {
  throw "Хеш архива sing-box не совпадает.`n  ожидался: $($core.sha256)`n  получен:  $actualHash"
}

# --- Состав архива ---
Write-Step "Собираю $bundleName"
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

$utf8Bom = New-Object System.Text.UTF8Encoding($true)
function Copy-Text([string]$From, [string]$To, [hashtable]$Replace = @{}) {
  $text = Get-Content -Raw -Encoding UTF8 $From
  foreach ($key in $Replace.Keys) { $text = $text.Replace($key, $Replace[$key]) }
  $text = $text -replace "`r?`n", "`r`n"
  [System.IO.File]::WriteAllText($To, $text, $utf8Bom)
}

Copy-Text (Join-Path $PSScriptRoot 'release\README.txt') (Join-Path $stage 'README.txt') @{
  '{{VERSION}}'          = $version
  '{{SING_BOX_VERSION}}' = $core.version
}
foreach ($file in 'install.cmd', 'uninstall.cmd') {
  Copy-Text (Join-Path $PSScriptRoot "release\$file") (Join-Path $stage $file)
}
foreach ($file in 'install.ps1', 'uninstall.ps1', 'sing-box.json') {
  Copy-Item (Join-Path $PSScriptRoot $file) $stage
}

New-Item -ItemType Directory -Force -Path (Join-Path $stage 'helper') | Out-Null
Copy-Item $helperExe (Join-Path $stage 'helper')

$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "vdp-pack-$([guid]::NewGuid())"
try {
  Expand-Archive -Path $zip -DestinationPath $tempDir -Force
  Copy-Item -Recurse (Join-Path $tempDir $archiveName) (Join-Path $stage 'sing-box')
} finally {
  Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
}
if (-not (Test-Path (Join-Path $stage 'sing-box\sing-box.exe'))) { throw 'В архиве sing-box нет sing-box.exe' }

$extensionsDir = Join-Path $stage 'extension'
New-Item -ItemType Directory -Force -Path $extensionsDir | Out-Null
Copy-Item -Recurse (Join-Path $extensionOutput 'chrome-mv3') (Join-Path $extensionsDir 'chrome')
Copy-Item -Recurse (Join-Path $extensionOutput 'firefox-mv2') (Join-Path $extensionsDir 'firefox')

# Подписанный .xpi кладём только если он подписан именно для этой версии (pnpm --filter @vdp/extension sign:firefox).
$xpi = Get-ChildItem (Join-Path $extensionOutput 'signed') -Filter "*-$version.xpi" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($xpi) {
  Copy-Item $xpi.FullName (Join-Path $extensionsDir "vless-da-podrova-$version-firefox.xpi")
  Write-Host "    + подписанный Firefox: $($xpi.Name)"
} else {
  Write-Host '    подписанного .xpi для этой версии нет - в архиве только распакованный Firefox'
}

# --- Архив ---
Write-Step "Пакую $zipPath"
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stage, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $true)
Remove-Item -Recurse -Force $stage

$sizeMb = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
Write-Step "Готово: $zipPath ($sizeMb МБ)"
