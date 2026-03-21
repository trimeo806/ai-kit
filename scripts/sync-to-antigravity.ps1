<#
.SYNOPSIS
    Sync .claude/agents + .claude/skills to Antigravity (_agents/workflows + skills)

.DESCRIPTION
    One-way sync from Claude Code source of truth to Antigravity format.
    Transforms agent YAML frontmatter and body content per sync-config.json.
    Regenerates skills/skill-index.json on every run.

.PARAMETER DryRun
    Preview changes without writing files.

.PARAMETER AgentsOnly
    Sync only agent to workflow files.

.PARAMETER SkillsOnly
    Sync only skills (and regenerate skill-index.json).

.PARAMETER Verbose
    Show detailed transform output.

.EXAMPLE
    .\scripts\sync-to-antigravity.ps1
    .\scripts\sync-to-antigravity.ps1 -DryRun
    .\scripts\sync-to-antigravity.ps1 -AgentsOnly -Verbose
#>

param(
    [switch]$DryRun,
    [switch]$AgentsOnly,
    [switch]$SkillsOnly,
    [switch]$Verbose
)

Set-StrictMode -Version 1
$ErrorActionPreference = "Stop"

# ─── Bootstrap ───────────────────────────────────────────────────────────────

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot   = Split-Path -Parent $ScriptDir
$ConfigPath = Join-Path $ScriptDir "sync-config.json"

if (-not (Test-Path $ConfigPath)) {
    Write-Error "sync-config.json not found at $ConfigPath"
    exit 1
}

$Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$Stats  = @{ AgentsSynced = 0; SkillsSynced = 0; Errors = 0 }

function Write-Status {
    param([string]$Msg, [string]$Color = "Cyan")
    Write-Host $Msg -ForegroundColor $Color
}

function Write-Detail {
    param([string]$Msg)
    if ($Verbose) { Write-Host "  $Msg" -ForegroundColor DarkGray }
}

function Write-Dr {
    param([string]$Msg)
    Write-Host "[DRY-RUN] $Msg" -ForegroundColor Yellow
}

# ─── YAML Frontmatter ────────────────────────────────────────────────────────

function Parse-Frontmatter {
    param([string]$Content)

    if ($Content -match "(?s)^---\r?\n(.+?)\r?\n---\r?\n(.*)$") {
        $yamlText = $Matches[1]
        $body     = $Matches[2]
        $fm       = @{}

        foreach ($line in ($yamlText -split "\r?\n")) {
            if ($line -match "^(\w[\w-]*):\s*(.*)$") {
                $key = $Matches[1]
                $val = $Matches[2].Trim()

                if ($val -match "^\[(.+)\]$") {
                    $items   = $Matches[1] -split "\s*,\s*"
                    $cleaned = $items | ForEach-Object { $_.Trim().Trim('"').Trim("'") }
                    $fm[$key] = @($cleaned)
                } else {
                    $fm[$key] = $val
                }
            }
            elseif ($line -match "^(\w[\w-]*):\s*$") {
                $fm[$Matches[1]] = ""
            }
        }
        return @{ frontmatter = $fm; body = $body; hasFrontmatter = $true }
    }

    return @{ frontmatter = @{}; body = $Content; hasFrontmatter = $false }
}

function Build-Frontmatter {
    param([hashtable]$FM)

    $lines = @("---")
    foreach ($key in ($FM.Keys | Sort-Object)) {
        $val = $FM[$key]
        if ($val -is [array]) {
            $joined = $val -join ", "
            $lines += "${key}: [$joined]"
        }
        elseif ($val -is [string] -and $val -match '[:#\[\]{}|>&*!,?]') {
            $escaped = $val -replace '"', '\"'
            $lines += "${key}: " + '"' + $escaped + '"'
        }
        else {
            $lines += "${key}: $val"
        }
    }
    $lines += "---"
    return ($lines -join "`n")
}

# ─── Body Content Transforms ─────────────────────────────────────────────────

function Apply-BodyTransforms {
    param([string]$Body, $Transforms)

    $result = $Body

    foreach ($t in $Transforms) {
        $props = $t.PSObject.Properties.Name

        # removeLineContaining
        if ($props -contains "removeLineContaining") {
            foreach ($pattern in $t.removeLineContaining) {
                $escaped  = [regex]::Escape($pattern)
                $lines    = $result -split "\r?\n"
                $filtered = $lines | Where-Object { $_ -notmatch $escaped }
                $result   = $filtered -join "`n"
                Write-Detail "Removed lines containing: $pattern"
            }
            continue
        }

        # from/to replace
        if (($props -contains "from") -and ($props -contains "to")) {
            $isRegex = ($props -contains "isRegex") -and ($t.isRegex -eq $true)
            if ($isRegex) {
                $newResult = $result -replace $t.from, $t.to
            } else {
                $newResult = $result.Replace($t.from, $t.to)
            }
            if ($newResult -ne $result) {
                Write-Detail "Replaced: '$($t.from)'"
            }
            $result = $newResult
        }
    }

    return $result
}

# ─── Agent Sync ──────────────────────────────────────────────────────────────

function Sync-Agents {
    $sourcePath = Join-Path $RepoRoot $Config.agents.source
    $targetPath = Join-Path $RepoRoot $Config.agents.target
    $keepFields = @($Config.agents.frontmatter.keep)
    $transforms = $Config.agents.bodyTransforms

    if (-not (Test-Path $sourcePath)) {
        Write-Warning "Agent source not found: $sourcePath"
        return
    }

    if (-not $DryRun) {
        New-Item -ItemType Directory -Force -Path $targetPath | Out-Null
    }

    $agentFiles = Get-ChildItem -Path $sourcePath -Filter "*.md" -File
    Write-Host ""
    Write-Status "[AGENTS] Syncing $($agentFiles.Count) agents -> _agents/workflows/" "White"

    foreach ($file in $agentFiles) {
        $targetFile = Join-Path $targetPath $file.Name
        Write-Detail "Processing: $($file.Name)"

        try {
            $raw    = Get-Content $file.FullName -Raw -Encoding UTF8
            $parsed = Parse-Frontmatter $raw
            $origFm = $parsed.frontmatter
            $body   = $parsed.body

            # Keep only allowed frontmatter fields
            $newFm = @{}
            foreach ($key in $keepFields) {
                if ($origFm.ContainsKey($key) -and $origFm[$key] -ne "") {
                    $newFm[$key] = $origFm[$key]
                }
            }

            if (-not $newFm.ContainsKey("description")) {
                Write-Warning "  ! No description in $($file.Name)"
                $newFm["description"] = ""
            }

            $newBody = Apply-BodyTransforms $body $transforms
            $output  = (Build-Frontmatter $newFm) + "`n`n" + $newBody.TrimStart("`n")

            if ($DryRun) {
                Write-Dr "Would write: $targetFile"
                if ($Verbose) {
                    foreach ($k in $newFm.Keys) {
                        Write-Host "  $k = $($newFm[$k])" -ForegroundColor DarkYellow
                    }
                }
            } else {
                Set-Content -Path $targetFile -Value $output -Encoding UTF8 -NoNewline
                Write-Status "  + $($file.Name)" "Green"
            }

            $Stats.AgentsSynced++
        }
        catch {
            Write-Warning "  ! Failed: $($file.Name) -- $_"
            $Stats.Errors++
        }
    }
}

# ─── Skill Sync ──────────────────────────────────────────────────────────────

function Sync-Skills {
    $sourcePath     = Join-Path $RepoRoot $Config.skills.source
    $targetPath     = Join-Path $RepoRoot $Config.skills.target
    $pathTransforms = $Config.skills.pathTransforms

    if (-not (Test-Path $sourcePath)) {
        Write-Warning "Skills source not found: $sourcePath"
        return
    }

    Write-Host ""
    Write-Status "[SKILLS] Syncing from $($Config.skills.source) -> $($Config.skills.target)" "White"

    $skillDirs = Get-ChildItem -Path $sourcePath -Directory
    $textExts  = @(".md", ".txt", ".json", ".yaml", ".yml", ".js", ".ts", ".sh", ".ps1", ".cjs", ".mjs")

    foreach ($dir in $skillDirs) {
        $targetDir = Join-Path $targetPath $dir.Name

        if (-not $DryRun) {
            New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
        }

        $files = Get-ChildItem -Path $dir.FullName -Recurse -File

        foreach ($file in $files) {
            $relPath       = $file.FullName.Substring($dir.FullName.Length + 1)
            $targetFile    = Join-Path $targetDir $relPath
            $targetFileDir = Split-Path -Parent $targetFile

            if (-not $DryRun) {
                New-Item -ItemType Directory -Force -Path $targetFileDir | Out-Null
            }

            $ext = $file.Extension.ToLower()

            if ($textExts -contains $ext) {
                try {
                    $content    = Get-Content $file.FullName -Raw -Encoding UTF8
                    $newContent = $content

                    foreach ($t in $pathTransforms) {
                        $isRegex = ($t.PSObject.Properties["isRegex"] -and $t.isRegex -eq $true)
                        if ($isRegex) {
                            $newContent = $newContent -replace $t.from, $t.to
                        } else {
                            $newContent = $newContent.Replace($t.from, $t.to)
                        }
                    }

                    if ($DryRun) {
                        if ($newContent -ne $content) {
                            Write-Dr "Would transform: $($dir.Name)/$relPath"
                        } else {
                            Write-Dr "Would copy: $($dir.Name)/$relPath"
                        }
                    } else {
                        Set-Content -Path $targetFile -Value $newContent -Encoding UTF8 -NoNewline
                    }
                }
                catch {
                    Write-Warning "  ! Failed: $($dir.Name)/$relPath -- $_"
                    $Stats.Errors++
                    continue
                }
            } else {
                if ($DryRun) {
                    Write-Dr "Would copy binary: $($dir.Name)/$relPath"
                } else {
                    Copy-Item -Path $file.FullName -Destination $targetFile -Force
                }
            }

            $Stats.SkillsSynced++
        }

        Write-Detail "  + $($dir.Name)"
    }

    Write-Status "  + $($skillDirs.Count) skill directories synced" "Green"
}

# ─── Skill Index Generation ──────────────────────────────────────────────────

function Generate-SkillIndex {
    $skillsPath = Join-Path $RepoRoot $Config.skills.target
    $indexPath  = Join-Path $RepoRoot $Config.skillIndex.output

    Write-Host ""
    Write-Status "[INDEX] Generating skill-index.json" "White"

    $skills    = @()
    $skillDirs = Get-ChildItem -Path $skillsPath -Directory

    foreach ($dir in $skillDirs) {
        $skillMdPath = Join-Path $dir.FullName "SKILL.md"
        if (-not (Test-Path $skillMdPath)) { continue }

        $raw    = Get-Content $skillMdPath -Raw -Encoding UTF8
        $parsed = Parse-Frontmatter $raw
        $fm     = $parsed.frontmatter

        $entry = [ordered]@{
            name            = if ($fm.ContainsKey("name")) { $fm["name"] } else { $dir.Name }
            description     = if ($fm.ContainsKey("description")) { $fm["description"] } else { "" }
            category        = if ($fm.ContainsKey("category")) { $fm["category"] } else { "uncategorized" }
            tier            = if ($fm.ContainsKey("tier")) { $fm["tier"] } else { "discoverable" }
            keywords        = if ($fm.ContainsKey("keywords")) { @($fm["keywords"]) } else { @() }
            platforms       = if ($fm.ContainsKey("platforms")) { @($fm["platforms"]) } else { @("all") }
            triggers        = if ($fm.ContainsKey("triggers")) { $fm["triggers"] } else { @() }
            "agent-affinity" = if ($fm.ContainsKey("agent-affinity")) { @($fm["agent-affinity"]) } else { @() }
            connections     = [ordered]@{
                extends   = @()
                requires  = @()
                enhances  = @()
                conflicts = @()
            }
            path            = "$($dir.Name)\SKILL.md"
        }

        $skills += [PSCustomObject]$entry
    }

    $categories = @{}
    foreach ($s in $skills) {
        $cat = $s.category
        if ($categories.ContainsKey($cat)) { $categories[$cat]++ }
        else { $categories[$cat] = 1 }
    }

    $index = [ordered]@{
        generated       = (Get-Date -Format "o")
        version         = "2.0.0"
        count           = $skills.Count
        categories      = $categories
        connectedSkills = 0
        skills          = $skills
    }

    $json = $index | ConvertTo-Json -Depth 10

    if ($DryRun) {
        Write-Dr "Would write skill-index.json with $($skills.Count) skills"
    } else {
        Set-Content -Path $indexPath -Value $json -Encoding UTF8
        Write-Status "  + skill-index.json -> $($skills.Count) skills indexed" "Green"
    }
}

# ─── Validation ──────────────────────────────────────────────────────────────

function Validate-Sync {
    Write-Host ""
    Write-Status "[VALIDATE] Running post-sync checks" "White"

    $issues = @()

    $workflowsPath = Join-Path $RepoRoot $Config.agents.target
    foreach ($file in (Get-ChildItem $workflowsPath -Filter "*.md" -File)) {
        $raw    = Get-Content $file.FullName -Raw -Encoding UTF8
        $parsed = Parse-Frontmatter $raw
        if (-not $parsed.frontmatter.ContainsKey("description") -or $parsed.frontmatter["description"] -eq "") {
            $issues += "WARN: $($file.Name) has empty description"
        }
        if ($raw -match "\.claude/scripts/" -or $raw -match "AskUserQuestion tool") {
            $issues += "WARN: $($file.Name) still has Claude-specific references"
        }
    }

    $sourceSkills = (Get-ChildItem (Join-Path $RepoRoot $Config.skills.source) -Directory).Name
    $targetSkills = (Get-ChildItem (Join-Path $RepoRoot $Config.skills.target) -Directory).Name
    $missing      = $sourceSkills | Where-Object { $targetSkills -notcontains $_ }
    if ($missing.Count -gt 0) {
        $issues += "WARN: Missing skills in target: $($missing -join ', ')"
    }

    if ($issues.Count -eq 0) {
        Write-Status "  + All checks passed" "Green"
    } else {
        foreach ($issue in $issues) {
            Write-Host "  $issue" -ForegroundColor Yellow
        }
    }
}

# ─── Main ────────────────────────────────────────────────────────────────────

$startTime = Get-Date
$sep       = "==========================================="

Write-Status $sep "Cyan"
Write-Status " tri-ai-kit -> Antigravity Sync" "Cyan"
if ($DryRun) { Write-Status " MODE: DRY RUN (no files written)" "Yellow" }
Write-Status $sep "Cyan"
Write-Status " Root: $RepoRoot"

if (-not $SkillsOnly) { Sync-Agents }

if (-not $AgentsOnly) {
    Sync-Skills
    if ($Config.skillIndex.generateOnSync) { Generate-SkillIndex }
}

if (-not $DryRun) { Validate-Sync }

$elapsed = (Get-Date) - $startTime

Write-Host ""
Write-Status $sep "Cyan"
Write-Status " Sync Complete" "Cyan"
Write-Status $sep "Cyan"
Write-Host " Agents synced : $($Stats.AgentsSynced)" -ForegroundColor White
Write-Host " Skills synced : $($Stats.SkillsSynced)" -ForegroundColor White
if ($Stats.Errors -gt 0) {
    Write-Host " Errors        : $($Stats.Errors)" -ForegroundColor Red
}
Write-Host " Duration      : $([math]::Round($elapsed.TotalSeconds, 1))s" -ForegroundColor DarkGray

if ($DryRun) {
    Write-Host ""
    Write-Host "Run without -DryRun to apply changes." -ForegroundColor Yellow
}
