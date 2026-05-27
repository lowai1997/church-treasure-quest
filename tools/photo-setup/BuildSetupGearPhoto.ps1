$ErrorActionPreference = 'Stop'

$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = Join-Path $toolDir 'GearPhotoSetup.cs'
$output = Join-Path $toolDir 'SetupGearPhoto.exe'
$compiler = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

if (-not (Test-Path $compiler)) {
  $compiler = "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe"
}

if (-not (Test-Path $compiler)) {
  throw 'Could not find the .NET Framework C# compiler.'
}

& $compiler /nologo /target:winexe /out:$output /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Web.Extensions.dll $source

if ($LASTEXITCODE -ne 0) {
  throw "Failed to compile $source"
}

if (-not (Test-Path $output)) {
  throw "Failed to build $output"
}

Write-Host "Built $output"
