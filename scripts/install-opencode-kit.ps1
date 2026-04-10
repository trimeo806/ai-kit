[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$TargetRepo,

    [ValidateSet("copy", "symlink")]
    [string]$Mode = "copy",

    [string]$SourcePackage = "",

    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($SourcePackage)) {
    $scriptPath = $MyInvocation.MyCommand.Path
    if ([string]::IsNullOrWhiteSpace($scriptPath)) {
        throw "Unable to resolve script path for default SourcePackage."
    }
    $scriptsDir = Split-Path -Parent $scriptPath
    $repoRoot = Split-Path -Parent $scriptsDir
    $SourcePackage = Join-Path $repoRoot "opencode"
}

function Write-Step {
    param([string]$Message)
    Write-Host "[install-opencode-kit] $Message"
}

function Resolve-FullPath {
    param([string]$PathValue)
    $expanded = [Environment]::ExpandEnvironmentVariables($PathValue)
    [System.IO.Path]::GetFullPath($expanded)
}

function Ensure-Directory {
    param([string]$PathValue)
    if ($DryRun) {
        Write-Step "Would ensure directory: $PathValue"
        return
    }
    if (-not (Test-Path -LiteralPath $PathValue)) {
        New-Item -ItemType Directory -Path $PathValue | Out-Null
    }
}

function ConvertTo-Hashtable {
    param([Parameter(ValueFromPipeline = $true)]$InputObject)

    if ($null -eq $InputObject) {
        return $null
    }

    if ($InputObject -is [System.Collections.IDictionary]) {
        $dict = [ordered]@{}
        foreach ($key in $InputObject.Keys) {
            $dict[$key] = ConvertTo-Hashtable $InputObject[$key]
        }
        return $dict
    }

    if ($InputObject -is [System.Collections.IEnumerable] -and -not ($InputObject -is [string])) {
        $items = New-Object System.Collections.Generic.List[object]
        foreach ($item in $InputObject) {
            $items.Add((ConvertTo-Hashtable $item))
        }
        return $items.ToArray()
    }

    if ($InputObject -is [psobject]) {
        $props = $InputObject.PSObject.Properties
        if ($props.Count -gt 0) {
            $dict = [ordered]@{}
            foreach ($prop in $props) {
                $dict[$prop.Name] = ConvertTo-Hashtable $prop.Value
            }
            return $dict
        }
    }

    return $InputObject
}

function Test-IsScalarValue {
    param($Value)

    if ($null -eq $Value) {
        return $true
    }

    ($Value -is [string]) -or
    ($Value -is [bool]) -or
    ($Value -is [byte]) -or
    ($Value -is [int16]) -or
    ($Value -is [int32]) -or
    ($Value -is [int64]) -or
    ($Value -is [decimal]) -or
    ($Value -is [double]) -or
    ($Value -is [single])
}

function Merge-JsonValue {
    param(
        $SourceValue,
        $ExistingValue
    )

    if ($null -eq $SourceValue) {
        return $ExistingValue
    }
    if ($null -eq $ExistingValue) {
        return $SourceValue
    }

    if ($SourceValue -is [System.Collections.IDictionary] -and $ExistingValue -is [System.Collections.IDictionary]) {
        $merged = [ordered]@{}
        foreach ($key in $SourceValue.Keys) {
            $merged[$key] = $SourceValue[$key]
        }
        foreach ($key in $ExistingValue.Keys) {
            if ($merged.Contains($key)) {
                $merged[$key] = Merge-JsonValue -SourceValue $merged[$key] -ExistingValue $ExistingValue[$key]
            }
            else {
                $merged[$key] = $ExistingValue[$key]
            }
        }
        return $merged
    }

    if (
        ($SourceValue -is [System.Collections.IEnumerable]) -and -not ($SourceValue -is [string]) -and
        ($ExistingValue -is [System.Collections.IEnumerable]) -and -not ($ExistingValue -is [string])
    ) {
        $sourceItems = @($SourceValue)
        $existingItems = @($ExistingValue)
        $allScalar = $true
        foreach ($item in @($sourceItems + $existingItems)) {
            if (-not (Test-IsScalarValue $item)) {
                $allScalar = $false
                break
            }
        }

        if ($allScalar) {
            $mergedItems = New-Object System.Collections.Generic.List[object]
            $seen = New-Object System.Collections.Generic.HashSet[string]
            foreach ($item in @($sourceItems + $existingItems)) {
                $key = if ($null -eq $item) { "<null>" } else { [string]$item }
                if ($seen.Add($key)) {
                    $mergedItems.Add($item)
                }
            }
            return $mergedItems.ToArray()
        }

        return $ExistingValue
    }

    return $ExistingValue
}

function Merge-OpenCodeConfigContent {
    param(
        [string]$ExistingContent,
        [string]$SourceContent
    )

    $sourceRoot = ConvertTo-Hashtable (ConvertFrom-Json $SourceContent)
    $existingRoot = ConvertTo-Hashtable (ConvertFrom-Json $ExistingContent)
    $merged = Merge-JsonValue -SourceValue $sourceRoot -ExistingValue $existingRoot
    ($merged | ConvertTo-Json -Depth 100)
}

function Merge-AgentsDocument {
    param(
        [string]$TargetFile,
        [string]$SourceContent
    )

    $beginMarker = "<!-- tri-ai-kit:begin -->"
    $endMarker = "<!-- tri-ai-kit:end -->"
    $sourceBody = ($SourceContent -replace "(?m)^#\s+AGENTS\.md\s*$", "").Trim()

    if (-not (Test-Path -LiteralPath $TargetFile)) {
        return $SourceContent
    }

    $existing = Get-Content -LiteralPath $TargetFile -Raw -Encoding UTF8
    $section = @(
        "## tri-ai-kit base",
        $beginMarker,
        $sourceBody,
        $endMarker
    ) -join "`n"

    if ($existing -match [regex]::Escape($beginMarker) -and $existing -match [regex]::Escape($endMarker)) {
        $pattern = "(?s)$([regex]::Escape($beginMarker)).*?$([regex]::Escape($endMarker))"
        $replacement = "$beginMarker`n$sourceBody`n$endMarker"
        $updated = [regex]::Replace($existing, $pattern, $replacement)
        return ($updated.TrimEnd() + "`n")
    }

    $merged = $existing.TrimEnd()
    if ($merged.Length -gt 0) {
        $merged += "`n`n"
    }
    $merged += $section + "`n"
    $merged
}

function Write-File {
    param(
        [string]$PathValue,
        [string]$Content
    )

    if ($DryRun) {
        Write-Step "Would write file: $PathValue"
        return
    }

    $parent = Split-Path -Parent $PathValue
    Ensure-Directory $parent
    Set-Content -LiteralPath $PathValue -Value $Content -Encoding UTF8 -NoNewline
}

function Copy-File {
    param(
        [string]$SourceFile,
        [string]$TargetFile,
        [switch]$SkipIfExists
    )

    if ($SkipIfExists -and (Test-Path -LiteralPath $TargetFile)) {
        Write-Step "Skipping existing file: $TargetFile"
        return
    }

    if ($DryRun) {
        Write-Step "Would copy file: $SourceFile -> $TargetFile"
        return
    }

    Ensure-Directory (Split-Path -Parent $TargetFile)
    Copy-Item -LiteralPath $SourceFile -Destination $TargetFile -Force
}

function Copy-DirectoryContent {
    param(
        [string]$SourceDir,
        [string]$TargetDir,
        [switch]$SkipExistingFiles
    )

    if (-not (Test-Path -LiteralPath $SourceDir)) {
        Write-Step "Skipping missing source directory: $SourceDir"
        return
    }

    $files = Get-ChildItem -LiteralPath $SourceDir -File -Recurse
    $sourceBase = (Resolve-Path -LiteralPath $SourceDir).Path.TrimEnd('\') + '\'
    $sourceBaseUri = New-Object System.Uri($sourceBase)
    foreach ($file in $files) {
        $fileUri = New-Object System.Uri((Resolve-Path -LiteralPath $file.FullName).Path)
        $relative = [System.Uri]::UnescapeDataString($sourceBaseUri.MakeRelativeUri($fileUri).ToString()).Replace('/', '\')
        $targetFile = Join-Path $TargetDir $relative
        Copy-File -SourceFile $file.FullName -TargetFile $targetFile -SkipIfExists:$SkipExistingFiles
    }
}

function New-SymlinkItem {
    param(
        [string]$TargetPath,
        [string]$SourcePath,
        [string]$ItemType
    )

    if (Test-Path -LiteralPath $TargetPath) {
        Write-Step "Skipping existing path (cannot symlink over existing): $TargetPath"
        return
    }

    if ($DryRun) {
        Write-Step "Would create symlink: $TargetPath -> $SourcePath"
        return
    }

    New-Item -ItemType SymbolicLink -Path $TargetPath -Target $SourcePath | Out-Null
}

$sourceRoot = Resolve-FullPath $SourcePackage
$targetRoot = Resolve-FullPath $TargetRepo

if (-not (Test-Path -LiteralPath $sourceRoot)) {
    throw "Source package not found: $sourceRoot"
}

$requiredPaths = @(
    (Join-Path $sourceRoot "AGENTS.md"),
    (Join-Path $sourceRoot "WORKFLOW.md"),
    (Join-Path $sourceRoot "opencode.json"),
    (Join-Path $sourceRoot ".agents"),
    (Join-Path $sourceRoot ".opencode")
)
foreach ($requiredPath in $requiredPaths) {
    if (-not (Test-Path -LiteralPath $requiredPath)) {
        throw "Missing required source path: $requiredPath"
    }
}

if (-not (Test-Path -LiteralPath $targetRoot)) {
    throw "Target repository path not found: $targetRoot"
}

$targetAgents = Join-Path $targetRoot "AGENTS.md"
$targetWorkflow = Join-Path $targetRoot "WORKFLOW.md"
$targetConfig = Join-Path $targetRoot "opencode.json"
$targetAgentsDir = Join-Path $targetRoot ".agents"
$targetOpenCodeDir = Join-Path $targetRoot ".opencode"

$sourceAgents = Join-Path $sourceRoot "AGENTS.md"
$sourceWorkflow = Join-Path $sourceRoot "WORKFLOW.md"
$sourceConfig = Join-Path $sourceRoot "opencode.json"
$sourceAgentsDir = Join-Path $sourceRoot ".agents"
$sourceOpenCodeDir = Join-Path $sourceRoot ".opencode"

$hasExistingOpenCodeFootprint =
    (Test-Path -LiteralPath $targetAgents) -or
    (Test-Path -LiteralPath $targetWorkflow) -or
    (Test-Path -LiteralPath $targetConfig) -or
    (Test-Path -LiteralPath $targetAgentsDir) -or
    (Test-Path -LiteralPath $targetOpenCodeDir)

Write-Step "Source package: $sourceRoot"
Write-Step "Target repo:    $targetRoot"
Write-Step "Mode:           $Mode"
Write-Step "DryRun:         $DryRun"

if ($Mode -eq "symlink") {
    if ($hasExistingOpenCodeFootprint) {
        throw "Symlink mode requires a clean target without existing OpenCode kit files. Use -Mode copy for merge installs."
    }

    New-SymlinkItem -TargetPath $targetAgents -SourcePath $sourceAgents -ItemType "File"
    New-SymlinkItem -TargetPath $targetWorkflow -SourcePath $sourceWorkflow -ItemType "File"
    New-SymlinkItem -TargetPath $targetConfig -SourcePath $sourceConfig -ItemType "File"
    New-SymlinkItem -TargetPath $targetAgentsDir -SourcePath $sourceAgentsDir -ItemType "Directory"
    New-SymlinkItem -TargetPath $targetOpenCodeDir -SourcePath $sourceOpenCodeDir -ItemType "Directory"

    Write-Step "Symlink install complete."
    exit 0
}

Ensure-Directory $targetAgentsDir
Ensure-Directory $targetOpenCodeDir

$sourceAgentsContent = Get-Content -LiteralPath $sourceAgents -Raw -Encoding UTF8
$mergedAgentsContent = Merge-AgentsDocument -TargetFile $targetAgents -SourceContent $sourceAgentsContent
Write-File -PathValue $targetAgents -Content $mergedAgentsContent

Copy-File -SourceFile $sourceWorkflow -TargetFile $targetWorkflow

$sourceConfigContent = Get-Content -LiteralPath $sourceConfig -Raw -Encoding UTF8
if (Test-Path -LiteralPath $targetConfig) {
    $existingConfigContent = Get-Content -LiteralPath $targetConfig -Raw -Encoding UTF8
    $mergedConfigContent = Merge-OpenCodeConfigContent -ExistingContent $existingConfigContent -SourceContent $sourceConfigContent
    Write-File -PathValue $targetConfig -Content (($mergedConfigContent -replace "`r`n", "`n").TrimEnd() + "`n")
    Write-Step "Merged opencode.json (preserved existing settings and added missing tri-ai-kit keys)."
}
else {
    Write-File -PathValue $targetConfig -Content $sourceConfigContent
}

Copy-DirectoryContent -SourceDir (Join-Path $sourceAgentsDir "skills") -TargetDir (Join-Path $targetAgentsDir "skills")
Copy-DirectoryContent -SourceDir (Join-Path $sourceOpenCodeDir "agents") -TargetDir (Join-Path $targetOpenCodeDir "agents")
Copy-DirectoryContent -SourceDir (Join-Path $sourceOpenCodeDir "commands") -TargetDir (Join-Path $targetOpenCodeDir "commands")

if (Test-Path -LiteralPath (Join-Path $sourceOpenCodeDir "plugins")) {
    Copy-DirectoryContent -SourceDir (Join-Path $sourceOpenCodeDir "plugins") -TargetDir (Join-Path $targetOpenCodeDir "plugins")
}

Write-Step "Install complete."
