$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$work = Join-Path $projectRoot 'artifacts/policy-lesson-refinement'
$manifest = Get-Content (Join-Path $work 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$hwp = New-Object -ComObject HWPFrame.HwpObject
try {
    $hwp.XHwpWindows.Item(0).Visible = $false
    if (-not $hwp.RegisterModule('FilePathCheckDLL', 'FilePathCheckerModuleExample')) {
        throw 'Hancom security module unavailable'
    }
    $hwp.SetMessageBoxMode(0x00010001) | Out-Null
    foreach ($item in @(
        @{ candidate = $manifest.guideCandidate; output = $manifest.guideOutput },
        @{ candidate = $manifest.planCandidate; output = $manifest.planOutput }
    )) {
        if (-not $hwp.Open($item.candidate, 'HWPX', 'forceopen:true;versionwarning:false;')) {
            throw "Cannot open $($item.candidate)"
        }
        if (-not $hwp.SaveAs($item.output, 'HWPX', '')) { throw 'Cannot save HWPX' }
        $pdf = [IO.Path]::ChangeExtension($item.output, '.pdf')
        if (-not $hwp.SaveAs($pdf, 'PDF', '')) { throw 'Cannot export PDF' }
        Write-Output "$($hwp.PageCount) pages: $pdf"
        $hwp.Clear(1) | Out-Null
    }
} finally {
    $hwp.Quit()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($hwp)
}
