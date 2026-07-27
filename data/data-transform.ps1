#!/usr/bin/env pwsh
# Converts data/data.csv into data/data.json.
# Column headers become JSON property keys, and each record gets an
# additional 'uniqueId' property containing a GUID.
# Rows with no value in the 'controlMeds' column are skipped.
# All values are trimmed, and 'estimate', 'lowerCI' and 'highCI' are
# coerced to numbers.

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$csvPath = Join-Path $scriptDir 'data.csv'
$jsonPath = Join-Path $scriptDir 'data.json'

$numericColumns = @('estimate', 'lowerCI', 'highCI')

$rows = Import-Csv -Path $csvPath

foreach ($row in $rows) {
    foreach ($property in $row.PSObject.Properties) {
        $property.Value = $property.Value.Trim()
    }
}

$rows = $rows | Where-Object { $_.controlMeds }

$records = foreach ($row in $rows) {
    foreach ($column in $numericColumns) {
        $row.$column = [double]$row.$column
    }
    $row | Add-Member -MemberType NoteProperty -Name 'uniqueId' -Value ([guid]::NewGuid().ToString()) -PassThru
}

$records | ConvertTo-Json -Depth 5 | Set-Content -Path $jsonPath -Encoding utf8

Write-Host "Wrote $($records.Count) records to $jsonPath"


$records | ConvertTo-Json -Depth 5 | Set-Content -Path $jsonPath -Encoding utf8

Write-Host "Wrote $($records.Count) records to $jsonPath"
