#Requires -Version 5.1
<#
.SYNOPSIS
  Stages everything the WiX installer ships:
    stage/server/     <- self-contained Vcc.Api publish (win-x64) + wwwroot (built SPA) + appsettings.Production.json
    stage/desktop/    <- self-contained VccDesktop (WPF+WebView2) publish (win-x64)
    stage/prereq/     <- WebView2 Evergreen bootstrapper
    stage/playwright/ <- offline chromium browser pack (.tar.gz), extracted on install

  Then build the MSI:  dotnet build apps/desktop/installer/VccInstaller.wixproj -c Release

.PARAMETER SkipWeb        Do not rebuild the SPA (reuse existing wwwroot).
.PARAMETER SkipPlaywright Do not stage the Playwright browser pack.
#>
[CmdletBinding()]
param([string]$Version = '1.0.0', [switch]$SkipWeb, [switch]$SkipPlaywright)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Root      = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
$Stage     = Join-Path $PSScriptRoot 'stage'
$ServerOut = Join-Path $Stage 'server'
$DeskOut   = Join-Path $Stage 'desktop'
$Prereq    = Join-Path $Stage 'prereq'
$PwOut     = Join-Path $Stage 'playwright'
$ApiCsproj = Join-Path $Root 'apps\server\src\Modules\Vcc.Api\Vcc.Api.csproj'
$DeskCsproj= Join-Path $Root 'apps\desktop\VccDesktop.csproj'
$WebDir    = Join-Path $Root 'apps\web'
$PwPack    = 'd:\tmp\vcc-vendor\pw-browser-pack-win-x64.tar.gz'

function New-CleanDir([string]$p) { if (Test-Path $p) { Remove-Item -Recurse -Force $p }; New-Item -ItemType Directory -Force -Path $p | Out-Null }

Write-Host "[bundle] publishing Vcc.Api (self-contained win-x64)..." -ForegroundColor Cyan
New-CleanDir $ServerOut
& dotnet publish $ApiCsproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=false -p:Version=$Version -o $ServerOut --nologo | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Vcc.Api publish failed" }

if (-not $SkipWeb) {
  Write-Host "[bundle] building web SPA -> wwwroot..." -ForegroundColor Cyan
  Push-Location $Root
  & pnpm --filter web build | Out-Host
  Pop-Location
  if ($LASTEXITCODE -ne 0) { throw "web build failed" }
  $wwwroot = Join-Path $ServerOut 'wwwroot'
  New-CleanDir $wwwroot
  Copy-Item -Recurse -Force (Join-Path $WebDir 'dist\*') $wwwroot
}

Write-Host "[bundle] publishing VccDesktop (self-contained win-x64)..." -ForegroundColor Cyan
New-CleanDir $DeskOut
& dotnet publish $DeskCsproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=false -p:Version=$Version -o $DeskOut --nologo | Out-Host
if ($LASTEXITCODE -ne 0) { throw "VccDesktop publish failed" }

Write-Host "[bundle] writing appsettings.Production.json..." -ForegroundColor Cyan
$appsettings = @'
{
  "DEPLOYMENT_MODE": "local",
  "ConnectionStrings": { "Default": "Data Source=C:\\ProgramData\\VCC-Workflow\\vcc.db" },
  "VCC_GLOBAL_ROOT": "C:\\ProgramData\\VCC-Workflow\\global",
  "BUNDLES_CACHE": "C:\\ProgramData\\VCC-Workflow\\cache"
}
'@
[System.IO.File]::WriteAllText((Join-Path $ServerOut 'appsettings.Production.json'), $appsettings, [System.Text.UTF8Encoding]::new($false))

Write-Host "[bundle] staging WebView2 Evergreen bootstrapper..." -ForegroundColor Cyan
New-CleanDir $Prereq
$wv2 = Join-Path $Prereq 'MicrosoftEdgeWebview2Setup.exe'
try { Invoke-WebRequest -Uri 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile $wv2 -UseBasicParsing }
catch { Write-Warning "WebView2 bootstrapper download failed; installer will assume the runtime is present." }

$DataGlobal = Join-Path $Stage 'data-global'
New-CleanDir $DataGlobal
New-Item -ItemType File -Force -Path (Join-Path $DataGlobal '.keep') | Out-Null
if (-not $SkipPlaywright) {
  Write-Host "[bundle] extracting Playwright browser pack into staged global..." -ForegroundColor Cyan
  if (Test-Path $PwPack) {
    & tar.exe -xzf $PwPack -C $DataGlobal
    if ($LASTEXITCODE -ne 0) { Write-Warning "Playwright pack extraction failed; installer will ship without offline browsers." }
  } else { Write-Warning "Playwright pack not found at $PwPack; skipping (installer ships without offline browsers)." }
}

Write-Host "[bundle] done (v$Version). Stage at: $Stage" -ForegroundColor Green
Write-Host "[bundle] next: dotnet build ..\installer\VccInstaller.wixproj -c Release -p:Version=$Version" -ForegroundColor Yellow
