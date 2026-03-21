<#
.SYNOPSIS
    Sync .claude/agents + .claude/skills to Codex / GitHub Copilot format

.DESCRIPTION
    One-way sync from Claude Code source of truth to Codex agent format.
    Based on best-known Codex format (GitHub Copilot Extensions / Coding Agent).
    Update the "CODEX FORMAT" section below when official format is confirmed.

    Current assumed Codex format (update if different):
      .github/
        copilot-instructions.md     <- global agent rules (from CLAUDE.md routing logic)
        agents/
          {agent}.md                <- individual agents with minimal frontmatter

.PARAMETER DryRun
    Preview changes without writing files.

.PARAMETER AgentsOnly
    Sync only agents.

.PARAMETER SkillsOnly
    Sync only skills.

.PARAMETER Verbose
    Show detailed transform output.

.EXAMPLE
    .\scripts\sync-to-codex.ps1
    .\scripts\sync-to-codex.ps1 -DryRun
#>

param(
    [switch]$DryRun,
    [switch]$AgentsOnly,
    [switch]$SkillsOnly,
    [switch]$Verbose
)

Set-StrictMode -Version 1
$ErrorActionPreference = "Stop"

# ─── Config ───────────────────────────────────────────────────────────────────
# UPDATE THESE when official Codex format is confirmed:

$CodexAgentTarget  = ".github/agents"          # Where Codex reads agent files
$CodexSkillTarget  = ".github/skills"          # Where Codex reads skill files (if supported)
$CodexGlobalFile   = ".github/copilot-instructions.md"  # Global instructions file

# Codex frontmatter: keep only these fields (update based on actual Codex spec)
$CodexKeepFields   = @("description")          # Codex likely only needs description

# ─── Bootstrap ───────────────────────────────────────────────────────────────

$ScriptDir    = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot     = Split-Path -Parent $ScriptDir
$ConfigPath   = Join-Path $ScriptDir "sync-config.json"

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
        }
        return @{ frontmatter = $fm; body = $body }
    }
    return @{ frontmatter = @{}; body = $Content }
}

function Build-Frontmatter {
    param([hashtable]$FM)
    $lines = @("---")
    foreach ($key in ($FM.Keys | Sort-Object)) {
        $val = $FM[$key]
        if ($val -is [array]) {
            $joined = $val -join ", "
            $lines += "${key}: [$joined]"
        } elseif ($val -is [string] -and $val -match '[:#\[\]{}|>&*!,?]') {
            $escaped = $val -replace '"', '\"'
            $lines += "${key}: " + '"' + $escaped + '"'
        } else {
            $lines += "${key}: $val"
        }
    }
    $lines += "---"
    return ($lines -join "`n")
}

# ─── Body Transforms (Codex-specific) ────────────────────────────────────────

function Apply-CodexTransforms {
    param([string]$Body)

    $result = $Body

    # Path rewrites: Claude -> Codex paths
    $transforms = @(
        # Skill paths
        @{ from = ".claude/skills/"; to = ".github/skills/" },
        # Agent paths
        @{ from = ".claude/agents/"; to = ".github/agents/" },
        @{ from = "_agents/workflows/"; to = ".github/agents/" },
        @{ from = "skills/"; to = ".github/skills/" },
        # Remove Claude-specific script references
        @{ from = "node .claude/scripts/"; to = "# " },
        # Tool references
        @{ from = "AskUserQuestion tool"; to = "ask the user" },
        @{ from = "via Agent tool"; to = "via the workflow" },
        @{ from = "via the workflow"; to = "by invoking the relevant agent" },
        # Footer
        @{ from = "is an tri_ai_kit agent"; to = "is a tri-ai-kit Codex agent" },
        @{ from = "is a tri-ai-kit workflow"; to = "is a tri-ai-kit Codex agent" }
    )

    # Remove lines with Claude-specific content
    $removePatterns = @(
        "node .claude/scripts/",
        "set-active-plan.cjs",
        "complete-plan.cjs",
        ".claude/scripts/"
    )

    foreach ($pattern in $removePatterns) {
        $escaped  = [regex]::Escape($pattern)
        $lines    = $result -split "\r?\n"
        $filtered = $lines | Where-Object { $_ -notmatch $escaped }
        $result   = $filtered -join "`n"
    }

    foreach ($t in $transforms) {
        $newResult = $result.Replace($t.from, $t.to)
        if ($newResult -ne $result) { Write-Detail "Replaced: '$($t.from)'" }
        $result = $newResult
    }

    return $result
}

# ─── Agent Sync ──────────────────────────────────────────────────────────────

function Sync-Agents-Codex {
    $sourcePath = Join-Path $RepoRoot $Config.agents.source
    $targetPath = Join-Path $RepoRoot $CodexAgentTarget

    if (-not (Test-Path $sourcePath)) {
        Write-Warning "Agent source not found: $sourcePath"
        return
    }

    if (-not $DryRun) {
        New-Item -ItemType Directory -Force -Path $targetPath | Out-Null
    }

    $agentFiles = Get-ChildItem -Path $sourcePath -Filter "*.md" -File
    Write-Host ""
    Write-Status "[AGENTS] Syncing $($agentFiles.Count) agents -> $CodexAgentTarget" "White"

    foreach ($file in $agentFiles) {
        $targetFile = Join-Path $targetPath $file.Name
        Write-Detail "Processing: $($file.Name)"

        try {
            $raw    = Get-Content $file.FullName -Raw -Encoding UTF8
            $parsed = Parse-Frontmatter $raw
            $origFm = $parsed.frontmatter
            $body   = $parsed.body

            # Keep only Codex-compatible frontmatter fields
            $newFm = @{}
            foreach ($key in $CodexKeepFields) {
                if ($origFm.ContainsKey($key) -and $origFm[$key] -ne "") {
                    $newFm[$key] = $origFm[$key]
                }
            }

            if (-not $newFm.ContainsKey("description")) {
                $newFm["description"] = ""
            }

            $newBody = Apply-CodexTransforms $body
            $output  = (Build-Frontmatter $newFm) + "`n`n" + $newBody.TrimStart("`n")

            if ($DryRun) {
                Write-Dr "Would write: $targetFile"
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

# ─── Skills Sync (best-effort — Codex may not support skills dir yet) ─────────

function Sync-Skills-Codex {
    $sourcePath = Join-Path $RepoRoot $Config.skills.source
    $targetPath = Join-Path $RepoRoot $CodexSkillTarget
    $textExts   = @(".md", ".txt", ".json", ".yaml", ".yml")

    if (-not (Test-Path $sourcePath)) {
        Write-Warning "Skills source not found: $sourcePath"
        return
    }

    Write-Host ""
    Write-Status "[SKILLS] Syncing skills -> $CodexSkillTarget" "White"
    Write-Status "  NOTE: Verify Codex supports external skill files before using." "Yellow"

    $skillDirs = Get-ChildItem -Path $sourcePath -Directory

    foreach ($dir in $skillDirs) {
        $targetDir = Join-Path $targetPath $dir.Name

        if (-not $DryRun) {
            New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
        }

        $files = Get-ChildItem -Path $dir.FullName -Filter "SKILL.md" -File

        foreach ($file in $files) {
            $targetFile = Join-Path $targetDir "SKILL.md"

            try {
                $content    = Get-Content $file.FullName -Raw -Encoding UTF8
                $newContent = $content.Replace(".claude/skills/", ".github/skills/")
                             $newContent = $newContent.Replace(".claude/agents/", ".github/agents/")

                if ($DryRun) {
                    Write-Dr "Would copy: $($dir.Name)/SKILL.md"
                } else {
                    if (-not (Test-Path (Split-Path -Parent $targetFile))) {
                        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $targetFile) | Out-Null
                    }
                    Set-Content -Path $targetFile -Value $newContent -Encoding UTF8 -NoNewline
                }
            }
            catch {
                Write-Warning "  ! Failed: $($dir.Name)/SKILL.md -- $_"
                $Stats.Errors++
            }

            $Stats.SkillsSynced++
        }
    }

    Write-Status "  + $($skillDirs.Count) skill SKILL.md files synced" "Green"
}

# ─── Global Instructions (copilot-instructions.md) ───────────────────────────

function Generate-GlobalInstructions {
    $claudeMdPath  = Join-Path $RepoRoot "CLAUDE.md"
    $targetFile    = Join-Path $RepoRoot $CodexGlobalFile

    Write-Host ""
    Write-Status "[GLOBAL] Generating $CodexGlobalFile" "White"

    if (-not (Test-Path $claudeMdPath)) {
        Write-Warning "CLAUDE.md not found — skipping global instructions"
        return
    }

    $claudeMd = Get-Content $claudeMdPath -Raw -Encoding UTF8

    # Extract the routing/intent section from CLAUDE.md as global instructions
    $header = @"
# Codex Global Instructions
# Auto-generated from CLAUDE.md — do not edit directly.
# Source: .claude/agents/ | Edit source, then run: .\scripts\sync-to-codex.ps1

"@

    # Path rewrites for global file
    $output = $claudeMd.Replace(".claude/agents/", ".github/agents/")
               $output = $output.Replace(".claude/skills/", ".github/skills/")
               $output = $output.Replace("Agent tool", "the relevant agent")

    $final = $header + $output

    if ($DryRun) {
        Write-Dr "Would write: $targetFile"
    } else {
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $targetFile) | Out-Null
        Set-Content -Path $targetFile -Value $final -Encoding UTF8 -NoNewline
        Write-Status "  + $CodexGlobalFile generated" "Green"
    }
}

# ─── Main ────────────────────────────────────────────────────────────────────

$startTime = Get-Date
$sep       = "==========================================="

Write-Status $sep "Magenta"
Write-Status " tri-ai-kit -> Codex Sync" "Magenta"
Write-Status " WARNING: Verify Codex format before using in production!" "Yellow"
if ($DryRun) { Write-Status " MODE: DRY RUN (no files written)" "Yellow" }
Write-Status $sep "Magenta"
Write-Status " Root      : $RepoRoot"
Write-Status " Agent dir : $CodexAgentTarget"
Write-Status " Skill dir : $CodexSkillTarget"
Write-Status " Global    : $CodexGlobalFile"

if (-not $SkillsOnly) {
    Sync-Agents-Codex
    Generate-GlobalInstructions
}

if (-not $AgentsOnly) {
    Sync-Skills-Codex
}

$elapsed = (Get-Date) - $startTime

Write-Host ""
Write-Status $sep "Magenta"
Write-Status " Codex Sync Complete" "Magenta"
Write-Status $sep "Magenta"
Write-Host " Agents synced : $($Stats.AgentsSynced)" -ForegroundColor White
Write-Host " Skills synced : $($Stats.SkillsSynced)" -ForegroundColor White
if ($Stats.Errors -gt 0) {
    Write-Host " Errors        : $($Stats.Errors)" -ForegroundColor Red
}
Write-Host " Duration      : $([math]::Round($elapsed.TotalSeconds, 1))s" -ForegroundColor DarkGray
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "  1. Verify .github/agents/ format matches official Codex spec" -ForegroundColor Yellow
Write-Host "  2. Update CodexAgentTarget & CodexKeepFields at top of this script if needed" -ForegroundColor Yellow
Write-Host "  3. Test one agent before committing all" -ForegroundColor Yellow

if ($DryRun) {
    Write-Host ""
    Write-Host "Run without -DryRun to apply changes." -ForegroundColor Yellow
}
