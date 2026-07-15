param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,
  [Parameter(Mandatory = $true)]
  [string]$OutputPath,
  [int]$FromPage = 0,
  [int]$ToPage = 0
)

$resolvedInput = (Resolve-Path -LiteralPath $InputPath).Path
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
$outputDirectory = [System.IO.Path]::GetDirectoryName($resolvedOutput)
[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null

$word = $null
$document = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $document = $word.Documents.Open($resolvedInput, $false, $true)
  # wdExportFormatPDF = 17; wdExportAllDocument = 0;
  # wdExportFromTo = 3; wdExportDocumentContent = 0.
  $exportRange = 0
  $exportFrom = 1
  $exportTo = 1
  if ($FromPage -gt 0) {
    $exportRange = 3
    $exportFrom = $FromPage
    $exportTo = if ($ToPage -gt 0) { $ToPage } else { $FromPage }
  }
  $document.ExportAsFixedFormat(
    $resolvedOutput,
    17,
    $false,
    0,
    $exportRange,
    $exportFrom,
    $exportTo,
    0,
    $true,
    $true,
    1,
    $true,
    $true,
    $false
  )
  Write-Output $resolvedOutput
}
finally {
  if ($null -ne $document) {
    $document.Close($false)
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($document)
  }
  if ($null -ne $word) {
    $word.Quit()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
