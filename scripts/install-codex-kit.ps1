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
    $SourcePackage = Join-Path $repoRoot "codex"
}

function Write-Step {
    param([string]$Message)
    Write-Host "[install-codex-kit] $Message"
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
        $dict = @{}
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
            $dict = @{}
            foreach ($prop in $props) {
                $dict[$prop.Name] = ConvertTo-Hashtable $prop.Value
            }
            return $dict
        }
    }

    return $InputObject
}

function Get-HookEntrySignature {
    param($Entry)

    $matcher = ""
    if ($null -ne $Entry -and $Entry.PSObject.Properties["matcher"] -and $Entry.matcher) {
        $matcher = [string]$Entry.matcher
    }

    $commands = New-Object System.Collections.Generic.List[string]
    if ($null -ne $Entry -and $Entry.PSObject.Properties["hooks"]) {
        foreach ($hook in @($Entry.hooks)) {
            if ($null -ne $hook -and $hook.PSObject.Properties["command"] -and $hook.command) {
                $commands.Add([string]$hook.command)
            }
        }
    }

    "$matcher|$($commands -join ';')"
}

function Merge-HooksJsonContent {
    param(
        [string]$ExistingContent,
        [string]$SourceContent
    )

    $sourceRoot = ConvertFrom-Json $SourceContent
    $existingRoot = ConvertFrom-Json $ExistingContent

    if ($null -eq $sourceRoot -or $null -eq $sourceRoot.hooks) {
        return $ExistingContent
    }
    if ($null -eq $existingRoot -or $null -eq $existingRoot.hooks) {
        return $SourceContent
    }

    foreach ($eventProperty in $existingRoot.hooks.PSObject.Properties) {
        $eventName = [string]$eventProperty.Name
        $existingEntries = @($eventProperty.Value)
        $sourceProperty = $sourceRoot.hooks.PSObject.Properties[$eventName]

        if ($null -eq $sourceProperty) {
            $sourceRoot.hooks | Add-Member -MemberType NoteProperty -Name $eventName -Value $existingEntries -Force
            continue
        }

        $sourceEntries = @($sourceProperty.Value)
        $seen = New-Object System.Collections.Generic.HashSet[string]
        foreach ($entry in $sourceEntries) {
            [void]$seen.Add((Get-HookEntrySignature $entry))
        }

        $mergedList = New-Object System.Collections.Generic.List[object]
        foreach ($entry in $sourceEntries) {
            $mergedList.Add($entry)
        }

        foreach ($entry in $existingEntries) {
            $sig = Get-HookEntrySignature $entry
            if (-not $seen.Contains($sig)) {
                [void]$seen.Add($sig)
                $mergedList.Add($entry)
            }
        }

        $sourceRoot.hooks | Add-Member -MemberType NoteProperty -Name $eventName -Value ($mergedList.ToArray()) -Force
    }

    ($sourceRoot | ConvertTo-Json -Depth 100)
}

function Ensure-CodexHooksEnabled {
    param([string]$TomlContent)

    $normalized = $TomlContent -replace "`r`n", "`n"
    $lines = New-Object System.Collections.Generic.List[string]
    foreach ($line in ($normalized -split "`n")) {
        $lines.Add($line)
    }

    $featuresStart = -1
    $featuresEnd = $lines.Count
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $trimmed = $lines[$i].Trim()
        if ($trimmed -match '^\[.*\]$') {
            if ($trimmed -eq "[features]") {
                $featuresStart = $i
                continue
            }

            if ($featuresStart -ge 0 -and $i -gt $featuresStart) {
                $featuresEnd = $i
                break
            }
        }
    }

    if ($featuresStart -ge 0) {
        for ($i = $featuresStart + 1; $i -lt $featuresEnd; $i++) {
            if ($lines[$i] -match '^\s*codex_hooks\s*=') {
                $lines[$i] = "codex_hooks = true"
                return (($lines -join "`n").TrimEnd() + "`n")
            }
        }

        $insertAt = $featuresStart + 1
        $lines.Insert($insertAt, "codex_hooks = true")
        return (($lines -join "`n").TrimEnd() + "`n")
    }

    if ($normalized.Trim().Length -gt 0 -and -not $normalized.EndsWith("`n")) {
        $normalized += "`n"
    }
    $normalized += "`n[features]`ncodex_hooks = true`n"
    $normalized
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
    (Join-Path $sourceRoot ".agents"),
    (Join-Path $sourceRoot ".codex")
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
$targetAgentsDir = Join-Path $targetRoot ".agents"
$targetCodexDir = Join-Path $targetRoot ".codex"
$targetKitDataDir = Join-Path $targetRoot ".kit-data"
$targetConfigToml = Join-Path $targetCodexDir "config.toml"
$targetHooksJson = Join-Path $targetCodexDir "hooks.json"

$sourceAgents = Join-Path $sourceRoot "AGENTS.md"
$sourceWorkflow = Join-Path $sourceRoot "WORKFLOW.md"
$sourceAgentsDir = Join-Path $sourceRoot ".agents"
$sourceCodexDir = Join-Path $sourceRoot ".codex"
$sourceKitDataDir = Join-Path $sourceRoot ".kit-data"
$sourceConfigToml = Join-Path $sourceCodexDir "config.toml"
$sourceHooksJson = Join-Path $sourceCodexDir "hooks.json"

$hasExistingCodexFootprint =
    (Test-Path -LiteralPath $targetAgents) -or
    (Test-Path -LiteralPath $targetAgentsDir) -or
    (Test-Path -LiteralPath $targetCodexDir) -or
    (Test-Path -LiteralPath $targetKitDataDir)

Write-Step "Source package: $sourceRoot"
Write-Step "Target repo:    $targetRoot"
Write-Step "Mode:           $Mode"
Write-Step "DryRun:         $DryRun"

if ($Mode -eq "symlink") {
    if ($hasExistingCodexFootprint) {
        throw "Symlink mode requires a clean target without existing Codex kit files. Use -Mode copy for merge installs."
    }

    New-SymlinkItem -TargetPath $targetAgents -SourcePath $sourceAgents -ItemType "File"
    New-SymlinkItem -TargetPath $targetWorkflow -SourcePath $sourceWorkflow -ItemType "File"
    New-SymlinkItem -TargetPath $targetAgentsDir -SourcePath $sourceAgentsDir -ItemType "Directory"
    New-SymlinkItem -TargetPath $targetCodexDir -SourcePath $sourceCodexDir -ItemType "Directory"
    if (Test-Path -LiteralPath $sourceKitDataDir) {
        New-SymlinkItem -TargetPath $targetKitDataDir -SourcePath $sourceKitDataDir -ItemType "Directory"
    }

    Write-Step "Symlink install complete."
    exit 0
}

Ensure-Directory $targetAgentsDir
Ensure-Directory $targetCodexDir
Ensure-Directory $targetKitDataDir

# AGENTS.md merge
$sourceAgentsContent = Get-Content -LiteralPath $sourceAgents -Raw -Encoding UTF8
$mergedAgentsContent = Merge-AgentsDocument -TargetFile $targetAgents -SourceContent $sourceAgentsContent
Write-File -PathValue $targetAgents -Content $mergedAgentsContent

# WORKFLOW.md overwrite (kit-owned)
Copy-File -SourceFile $sourceWorkflow -TargetFile $targetWorkflow

# Skills and custom agents are merged by file copy while preserving pre-existing unrelated files.
Copy-DirectoryContent -SourceDir (Join-Path $sourceAgentsDir "skills") -TargetDir (Join-Path $targetAgentsDir "skills")
Copy-DirectoryContent -SourceDir (Join-Path $sourceCodexDir "agents") -TargetDir (Join-Path $targetCodexDir "agents")

# Copy all managed runtime folders/files
Copy-DirectoryContent -SourceDir (Join-Path $sourceCodexDir "hooks") -TargetDir (Join-Path $targetCodexDir "hooks")
Copy-DirectoryContent -SourceDir (Join-Path $sourceCodexDir "runtime") -TargetDir (Join-Path $targetCodexDir "runtime")
Copy-DirectoryContent -SourceDir (Join-Path $sourceCodexDir "agent-memory") -TargetDir (Join-Path $targetCodexDir "agent-memory")
Copy-DirectoryContent -SourceDir (Join-Path $sourceCodexDir "output-styles") -TargetDir (Join-Path $targetCodexDir "output-styles")
Copy-File -SourceFile (Join-Path $sourceCodexDir ".tri-ai-kit.json") -TargetFile (Join-Path $targetCodexDir ".tri-ai-kit.json")
Copy-File -SourceFile (Join-Path $sourceCodexDir ".tri-ignore") -TargetFile (Join-Path $targetCodexDir ".tri-ignore")

# Improvement store: initialize if missing, preserve existing session history
Copy-DirectoryContent -SourceDir (Join-Path $sourceKitDataDir "improvements") -TargetDir (Join-Path $targetKitDataDir "improvements") -SkipExistingFiles

# config.toml merge (only enforce required tri-ai-kit hook feature)
$sourceConfigContent = Get-Content -LiteralPath $sourceConfigToml -Raw -Encoding UTF8
if (Test-Path -LiteralPath $targetConfigToml) {
    $existingConfigContent = Get-Content -LiteralPath $targetConfigToml -Raw -Encoding UTF8
    $mergedConfigContent = Ensure-CodexHooksEnabled -TomlContent $existingConfigContent
    Write-File -PathValue $targetConfigToml -Content $mergedConfigContent
    Write-Step "Merged .codex/config.toml (preserved existing settings, ensured codex_hooks = true)."
} else {
    Write-File -PathValue $targetConfigToml -Content $sourceConfigContent
}

# hooks.json merge
$sourceHooksContent = Get-Content -LiteralPath $sourceHooksJson -Raw -Encoding UTF8
if (Test-Path -LiteralPath $targetHooksJson) {
    $existingHooksContent = Get-Content -LiteralPath $targetHooksJson -Raw -Encoding UTF8
    $mergedHooksContent = Merge-HooksJsonContent -ExistingContent $existingHooksContent -SourceContent $sourceHooksContent
    Write-File -PathValue $targetHooksJson -Content (($mergedHooksContent -replace "`r`n", "`n").TrimEnd() + "`n")
    Write-Step "Merged .codex/hooks.json (kept existing hooks and added missing tri-ai-kit entries)."
} else {
    Write-File -PathValue $targetHooksJson -Content $sourceHooksContent
}

Write-Step "Install complete."
