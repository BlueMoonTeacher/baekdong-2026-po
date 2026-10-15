$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$work = Join-Path $projectRoot 'artifacts/policy-worksheet-refinement'
$items = Get-Content (Join-Path $work 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$hwp = New-Object -ComObject HWPFrame.HwpObject
try {
    $hwp.XHwpWindows.Item(0).Visible = $false
    if (-not $hwp.RegisterModule('FilePathCheckDLL', 'FilePathCheckerModuleExample')) { throw 'Hancom security module unavailable' }
    $hwp.SetMessageBoxMode(0x00010001) | Out-Null
    foreach ($item in $items) {
        if (-not $hwp.Open($item.candidate, 'HWPX', 'forceopen:true;versionwarning:false;')) { throw 'Cannot open worksheet' }
        if (-not $hwp.SaveAs($item.output, 'HWPX', '')) { throw 'Cannot save worksheet' }
        $pdf = [IO.Path]::ChangeExtension($item.output, '.pdf')
        if (-not $hwp.SaveAs($pdf, 'PDF', '')) { throw 'Cannot export worksheet PDF' }
        Write-Output "$($item.lesson): $($hwp.PageCount) pages"
        if ($hwp.PageCount -ne 1) { throw "Worksheet $($item.lesson) exceeds its original one-page layout" }
        $hwp.Clear(1) | Out-Null
    }
} finally {
    $hwp.Quit()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($hwp)
}
