<#
.SYNOPSIS
    Sync the reusable Claude package to the generated Codex package layout.
#>

param(
    [switch]$DryRun,
    [switch]$AgentsOnly,
    [switch]$SkillsOnly,
    [switch]$Verbose
)

Set-StrictMode -Version 3
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$ConfigPath = Join-Path $ScriptDir "sync-config.json"

if (-not (Test-Path $ConfigPath)) {
    throw "sync-config.json not found at $ConfigPath"
}

$Config = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$CodexConfig = $Config.codex
if ($null -eq $CodexConfig) {
    throw "The sync config does not define a codex block."
}

$Stats = @{
    AgentsSynced       = 0
    SkillsSynced       = 0
    FilesCopied        = 0
    DocumentsGenerated = 0
    Errors             = 0
}

function Write-Status {
    param([string]$Message, [string]$Color = "Cyan")
    Write-Host $Message -ForegroundColor $Color
}

function Write-Detail {
    param([string]$Message)
    if ($Verbose) {
        Write-Host "  $Message" -ForegroundColor DarkGray
    }
}

function Write-Dr {
    param([string]$Message)
    Write-Host "[DRY-RUN] $Message" -ForegroundColor Yellow
}

function Resolve-RepoPath {
    param([Parameter(Mandatory = $true)][string]$RelativePath)
    [System.IO.Path]::GetFullPath((Join-Path $RepoRoot $RelativePath))
}

function Get-NormalizedRelativePath {
    param(
        [Parameter(Mandatory = $true)][string]$FromPath,
        [Parameter(Mandatory = $true)][string]$ToPath
    )

    $fromFull = [System.IO.Path]::GetFullPath($FromPath)
    $toFull = [System.IO.Path]::GetFullPath($ToPath)

    if (-not (Test-Path $fromFull -PathType Container)) {
        $fromFull = Split-Path -Parent $fromFull
    }

    if (-not $fromFull.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
        $fromFull += [System.IO.Path]::DirectorySeparatorChar
    }

    $fromUri = [System.Uri]$fromFull
    $toUri = [System.Uri]$toFull
    [System.Uri]::UnescapeDataString($fromUri.MakeRelativeUri($toUri).ToString()).Replace('/', '\')
}

function Test-HasProperty {
    param(
        [Parameter(Mandatory = $true)]$Object,
        [Parameter(Mandatory = $true)][string]$Name
    )

    $Object.PSObject.Properties.Name -contains $Name
}

function Ensure-Directory {
    param([Parameter(Mandatory = $true)][string]$Path)

    if ($DryRun) {
        Write-Dr "Would ensure directory: $Path"
        return
    }

    New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Write-Utf8NoBomFile {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [AllowEmptyString()][string]$Content
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Remove-GeneratedPaths {
    param([string[]]$RelativePaths)

    foreach ($relativePath in $RelativePaths) {
        $absolutePath = Resolve-RepoPath $relativePath
        if (-not (Test-Path $absolutePath)) {
            continue
        }

        if ($DryRun) {
            Write-Dr "Would remove generated path: $relativePath"
        } else {
            Remove-Item -LiteralPath $absolutePath -Recurse -Force
            Write-Detail "Removed generated path: $relativePath"
        }
    }
}

function Normalize-Newlines {
    param([string]$Text)
    if ($null -eq $Text) {
        return ""
    }
    ($Text -replace "`r`n", "`n" -replace "`r", "`n")
}

function Split-Frontmatter {
    param([string]$Content)

    $normalized = Normalize-Newlines $Content
    if ($normalized -match "(?s)^---\n(.*?)\n---\n?(.*)$") {
        return @{
            FrontmatterText = $Matches[1]
            Body            = $Matches[2]
        }
    }

    return @{
        FrontmatterText = ""
        Body            = $normalized
    }
}

function Get-YamlFieldBlock {
    param(
        [string]$YamlText,
        [string]$FieldName
    )

    if ([string]::IsNullOrWhiteSpace($YamlText)) {
        return $null
    }

    $pattern = "(?ms)^$([regex]::Escape($FieldName)):\s*(.*?)(?=^[A-Za-z_][\w-]*:\s*|\z)"
    $match = [regex]::Match($YamlText, $pattern)
    if (-not $match.Success) {
        return $null
    }

    $match.Groups[1].Value.TrimEnd()
}

function Unquote-Scalar {
    param([string]$Value)

    if ($null -eq $Value) {
        return $null
    }

    $trimmed = $Value.Trim()
    if ($trimmed.Length -ge 2) {
        if (($trimmed.StartsWith('"') -and $trimmed.EndsWith('"')) -or ($trimmed.StartsWith("'") -and $trimmed.EndsWith("'"))) {
            return $trimmed.Substring(1, $trimmed.Length - 2)
        }
    }

    $trimmed
}

function Convert-YamlScalar {
    param([string]$Block)

    if ([string]::IsNullOrWhiteSpace($Block)) {
        return $null
    }

    $normalized = Normalize-Newlines $Block
    $trimmed = $normalized.TrimEnd()

    if ($trimmed.StartsWith("|") -or $trimmed.StartsWith(">")) {
        $lines = $trimmed -split "`n"
        if ($lines.Count -le 1) {
            return ""
        }

        $contentLines = @($lines[1..($lines.Count - 1)])
        $indents = @()
        foreach ($line in $contentLines) {
            if ($line.Trim().Length -eq 0) {
                continue
            }

            $indentMatch = [regex]::Match($line, "^( +)")
            if ($indentMatch.Success) {
                $indents += $indentMatch.Groups[1].Value.Length
            } else {
                $indents += 0
            }
        }

        $minIndent = 0
        if ($indents.Count -gt 0) {
            $minIndent = ($indents | Measure-Object -Minimum).Minimum
        }

        $dedented = foreach ($line in $contentLines) {
            if ($line.Length -ge $minIndent) {
                $line.Substring($minIndent)
            } else {
                $line
            }
        }

        $value = ($dedented -join "`n").Trim()
        if ($trimmed.StartsWith(">")) {
            $value = (($value -split "`n") | ForEach-Object { $_.TrimEnd() }) -join " "
        }
        return $value.Trim()
    }

    Unquote-Scalar (($trimmed -split "`n")[0])
}

function Convert-YamlInlineArray {
    param([string]$Block)

    if ([string]::IsNullOrWhiteSpace($Block)) {
        return @()
    }

    $trimmed = $Block.Trim()
    if ($trimmed -match "^\[(.*)\]$") {
        $inner = $Matches[1].Trim()
        if ([string]::IsNullOrWhiteSpace($inner)) {
            return @()
        }

        return @(
            $inner -split "\s*,\s*" |
            ForEach-Object { Unquote-Scalar $_ } |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
        )
    }

    @((Unquote-Scalar $trimmed))
}

function Convert-YamlListOfMaps {
    param([string]$Block)

    if ([string]::IsNullOrWhiteSpace($Block)) {
        return @()
    }

    $items = New-Object System.Collections.Generic.List[hashtable]
    $current = $null

    foreach ($line in (Normalize-Newlines $Block -split "`n")) {
        if ($line -match "^\s*-\s+([\w-]+):\s*(.*)$") {
            if ($null -ne $current) {
                $items.Add($current)
            }

            $current = @{}
            $current[$Matches[1]] = Unquote-Scalar $Matches[2]
            continue
        }

        if ($line -match "^\s+([\w-]+):\s*(.*)$" -and $null -ne $current) {
            $current[$Matches[1]] = Unquote-Scalar $Matches[2]
        }
    }

    if ($null -ne $current) {
        $items.Add($current)
    }

    @($items)
}

function Parse-AgentDefinition {
    param([Parameter(Mandatory = $true)][string]$FilePath)

    $raw = Get-Content $FilePath -Raw -Encoding UTF8
    $parts = Split-Frontmatter $raw
    $yaml = $parts.FrontmatterText

    @{
        SourceFile     = $FilePath
        SourceName     = [System.IO.Path]::GetFileNameWithoutExtension($FilePath)
        Name           = Convert-YamlScalar (Get-YamlFieldBlock $yaml "name")
        Description    = Convert-YamlScalar (Get-YamlFieldBlock $yaml "description")
        Model          = Convert-YamlScalar (Get-YamlFieldBlock $yaml "model")
        Color          = Convert-YamlScalar (Get-YamlFieldBlock $yaml "color")
        Skills         = @(Convert-YamlInlineArray (Get-YamlFieldBlock $yaml "skills"))
        Memory         = Convert-YamlScalar (Get-YamlFieldBlock $yaml "memory")
        PermissionMode = Convert-YamlScalar (Get-YamlFieldBlock $yaml "permissionMode")
        Tools          = Convert-YamlScalar (Get-YamlFieldBlock $yaml "tools")
        Handoffs       = @(Convert-YamlListOfMaps (Get-YamlFieldBlock $yaml "handoffs"))
        Body           = (Normalize-Newlines $parts.Body).Trim()
    }
}

function Apply-TextTransforms {
    param([string]$Text)

    $result = Normalize-Newlines $Text
    if ([string]::IsNullOrEmpty($result)) {
        return ""
    }

    foreach ($pattern in $CodexConfig.transforms.removeLineContaining) {
        $escaped = [regex]::Escape($pattern)
        $filteredLines = foreach ($line in ($result -split "`n")) {
            if ($line -notmatch $escaped) {
                $line
            }
        }
        $result = ($filteredLines -join "`n")
    }

    foreach ($replacement in $CodexConfig.transforms.replacements) {
        $hasIsRegex = Test-HasProperty $replacement "isRegex"
        if ($hasIsRegex -and $replacement.isRegex -eq $true) {
            $updated = [regex]::Replace($result, [string]$replacement.from, [string]$replacement.to)
        } else {
            $updated = $result.Replace([string]$replacement.from, [string]$replacement.to)
        }

        if ($updated -ne $result) {
            Write-Detail "Transformed text using pattern '$($replacement.from)'"
        }

        $result = $updated
    }

    $result = [regex]::Replace($result, '\bAgent tool\b', 'custom agent dispatch')
    $result = [regex]::Replace($result, '\bAskUserQuestion\b', 'ask the user')
    $result = $result.Replace('via the custom agent dispatch', 'via custom agent dispatch')
    $result = [regex]::Replace(
        $result,
        '(?ms)\*\*Parallel work\*\* \(3\+ independent tasks, cross-platform\) → use `subagent-driven-development` skill from main context\.\s+\*\*Subagent constraint\*\*: Subagents cannot spawn further subagents\. Multi-agent workflows must be orchestrated from the main conversation\. Skills that need multi-agent dispatch must NOT use `context: fork`\.',
        '**Parallel work** (3+ independent tasks, cross-platform) → use `subagent-driven-development` skill from main context.`n`n**Auto-trigger rule**: If the user''s prompt, the routed intent, an active plan, a handoff chain, or the loaded skill set indicates that one or more specialist agents are relevant, you must trigger those agents automatically from the main conversation. Do **not** require the user to explicitly ask for `spawn_agent` or custom agent dispatch usage.`n`n**Delegation default**: Use `spawn_agent` automatically when the prompt clearly matches a known agent workflow. Avoid delegation only when the task is trivial, the work is tightly coupled to the current context, or the immediate next step is blocked on local work you should do first.`n`n**Subagent constraint**: Subagents cannot spawn further subagents. Multi-agent workflows must be orchestrated from the main conversation. Skills that need multi-agent dispatch must NOT use `context: fork`.`n`n**Skill-to-agent dispatch**: After the main agent loads the related skills and determines that specialist execution is required, it must dispatch every related subagent needed to complete the workflow. Do not stop at skill loading or intent classification when downstream agents are implied by the prompt or plan.'
    )

    $result = [regex]::Replace($result, '\.codex/agents/\{name\}\.md', '.codex/agents/{name}.toml')
    $result = $result.Replace('Agents declare which skills they activate in their frontmatter', 'Agents declare which skills they activate in their configuration')
    $result = $result.Replace('Hooks are registered in `.codex/config.toml and .codex/hooks.json`', 'Hooks are enabled via `.codex/config.toml` and registered in `.codex/hooks.json`')
    $result = [regex]::Replace(
        $result,
        'Read every file in `\.codex/agents/`\.\s+For each agent extract `name`, `description`, and `skills` from the frontmatter\.',
        'Read every file in `.codex/agents/`. For each agent extract `name`, `description`, and configured skills from the TOML.'
    )
    $result = [regex]::Replace(
        $result,
        '(?m)^Frontmatter:\s*`name`, `description`, `model`, `color`, `skills`, `memory`, `permissionMode`, `handoffs`$',
        'TOML keys: `name`, `description`, `developer_instructions`, optional model/config fields, and `[[skills.config]]`'
    )

    $result
}

function Escape-TomlBasicString {
    param([string]$Value)

    if ($null -eq $Value) {
        return ""
    }

    $escaped = $Value.Replace('\', '\\').Replace('"', '\"')
    $escaped.Replace("`n", " ").Trim()
}

function Format-SourceMetadataSection {
    param([hashtable]$Agent)

    $lines = New-Object System.Collections.Generic.List[string]
    if (-not [string]::IsNullOrWhiteSpace($Agent.Model)) {
        $lines.Add("- Source model: $($Agent.Model)")
    }
    if ($Agent.Skills.Count -gt 0) {
        $lines.Add("- Source skills: " + (($Agent.Skills | ForEach-Object { $_ }) -join ", "))
    }
    if (-not [string]::IsNullOrWhiteSpace($Agent.PermissionMode)) {
        $lines.Add("- Source permission mode: $($Agent.PermissionMode)")
    }
    if (-not [string]::IsNullOrWhiteSpace($Agent.Memory)) {
        $lines.Add("- Source memory mode: $($Agent.Memory)")
    }
    if (-not [string]::IsNullOrWhiteSpace($Agent.Tools)) {
        $lines.Add("- Source tools hint: $($Agent.Tools)")
    }

    $relativeSource = (Get-NormalizedRelativePath -FromPath $RepoRoot -ToPath $Agent.SourceFile).Replace('\', '/')
    $lines.Add("- Source file: $relativeSource")

    if ($lines.Count -eq 0) {
        return ""
    }

    "## Source Metadata`n" + ($lines -join "`n")
}

function Format-HandoffsSection {
    param([hashtable[]]$Handoffs)

    if ($Handoffs.Count -eq 0) {
        return ""
    }

    $lines = New-Object System.Collections.Generic.List[string]
    $index = 1
    foreach ($handoff in $Handoffs) {
        $label = $handoff["label"]
        $agent = $handoff["agent"]
        $prompt = $handoff["prompt"]

        $entry = "$index. "
        if (-not [string]::IsNullOrWhiteSpace($label)) {
            $entry += $label
        } elseif (-not [string]::IsNullOrWhiteSpace($agent)) {
            $entry += $agent
        } else {
            $entry += "handoff"
        }

        if (-not [string]::IsNullOrWhiteSpace($agent)) {
            $entry += " -> $agent"
        }
        if (-not [string]::IsNullOrWhiteSpace($prompt)) {
            $entry += ": $prompt"
        }

        $lines.Add($entry)
        $index++
    }

    "## Source Handoffs`n" + ($lines -join "`n")
}

function Build-DeveloperInstructions {
    param([hashtable]$Agent)

    $sections = New-Object System.Collections.Generic.List[string]
    $sections.Add(@'
## Delegation Policy
- Use `spawn_agent` automatically when the user prompt clearly matches this agent's workflow or a known multi-agent workflow that includes this agent.
- Do not wait for the user to explicitly request delegation when the workflow match is clear.
- Keep orchestration in the main conversation. Do not delegate orchestration to subagents.
- Avoid delegation only when the task is trivial, tightly coupled to the current local context, or blocked on an immediate local step that should be completed first.
'@.Trim())

    $body = Apply-TextTransforms $Agent.Body
    if (-not [string]::IsNullOrWhiteSpace($body)) {
        $sections.Add($body.Trim())
    }

    if (-not [string]::IsNullOrWhiteSpace($Agent.Memory)) {
        $sections.Add("## Codex Packaging Notes`n- Memory behavior is package-managed under `.codex/agent-memory/`.")
    }

    $handoffSection = Format-HandoffsSection $Agent.Handoffs
    if (-not [string]::IsNullOrWhiteSpace($handoffSection)) {
        $sections.Add($handoffSection)
    }

    (($sections -join "`n`n").Trim() + "`n")
}

function Get-ModelSettings {
    param([string]$SourceModel)

    if ([string]::IsNullOrWhiteSpace($SourceModel)) {
        return @{}
    }

    $mapping = $CodexConfig.modelMap.$SourceModel
    if ($null -eq $mapping) {
        throw "No Codex model mapping is defined for source model '$SourceModel'."
    }

    if ((Test-HasProperty $mapping "omit") -and $mapping.omit -eq $true) {
        return @{}
    }

    $settings = @{}
    if ((Test-HasProperty $mapping "model") -and $mapping.model) {
        $settings["model"] = [string]$mapping.model
    }
    if ((Test-HasProperty $mapping "model_reasoning_effort") -and $mapping.model_reasoning_effort) {
        $settings["model_reasoning_effort"] = [string]$mapping.model_reasoning_effort
    }
    $settings
}

function Get-PermissionSettings {
    param([string]$PermissionMode)

    if ([string]::IsNullOrWhiteSpace($PermissionMode)) {
        return @{}
    }

    $mapping = $CodexConfig.permissionMap.$PermissionMode
    if ($null -eq $mapping) {
        throw "No Codex permission mapping is defined for permissionMode '$PermissionMode'."
    }

    $settings = @{}
    foreach ($property in $mapping.PSObject.Properties) {
        if (-not [string]::IsNullOrWhiteSpace([string]$property.Value)) {
            $settings[$property.Name] = [string]$property.Value
        }
    }
    $settings
}

function Get-SkillConfigPath {
    param([string]$SkillName)
    "../../.agents/skills/$SkillName/SKILL.md"
}

function Build-AgentToml {
    param([hashtable]$Agent)

    if ([string]::IsNullOrWhiteSpace($Agent.Name)) {
        throw "Agent '$($Agent.SourceName)' is missing a name field."
    }
    if ([string]::IsNullOrWhiteSpace($Agent.Description)) {
        throw "Agent '$($Agent.SourceName)' is missing a description field."
    }

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("# Auto-generated from claude/.claude/agents/$($Agent.SourceName).md")
    $lines.Add("# Do not edit directly. Update the Claude source, then rerun scripts/sync-to-codex.ps1.")
    $lines.Add("")
    $lines.Add("name = ""$(Escape-TomlBasicString $Agent.Name)""")
    $lines.Add("description = ""$(Escape-TomlBasicString $Agent.Description)""")

    $modelSettings = Get-ModelSettings $Agent.Model
    foreach ($key in @("model", "model_reasoning_effort")) {
        if ($modelSettings.ContainsKey($key)) {
            $lines.Add("$key = ""$(Escape-TomlBasicString $modelSettings[$key])""")
        }
    }

    $permissionSettings = Get-PermissionSettings $Agent.PermissionMode
    foreach ($key in @("sandbox_mode", "approval_policy")) {
        if ($permissionSettings.ContainsKey($key)) {
            $lines.Add("$key = ""$(Escape-TomlBasicString $permissionSettings[$key])""")
        }
    }

    $lines.Add("")
    $lines.Add("developer_instructions = '''")
    $lines.Add((Build-DeveloperInstructions $Agent).TrimEnd())
    $lines.Add("'''")

    foreach ($skillName in $Agent.Skills) {
        $skillSourcePath = Resolve-RepoPath (Join-Path $CodexConfig.skills.source $skillName)
        if (-not (Test-Path $skillSourcePath)) {
            throw "Agent '$($Agent.Name)' references missing skill '$skillName'."
        }

        $lines.Add("")
        $lines.Add("[[skills.config]]")
        $lines.Add("path = ""$(Get-SkillConfigPath $skillName)""")
        $lines.Add("enabled = true")
    }

    (($lines -join "`n").TrimEnd() + "`n")
}

function Write-GeneratedFile {
    param(
        [string]$RelativePath,
        [string]$Content
    )

    $absolutePath = Resolve-RepoPath $RelativePath
    $parent = Split-Path -Parent $absolutePath
    Ensure-Directory $parent

    if ($DryRun) {
        Write-Dr "Would write: $RelativePath"
        return
    }

    Set-Content -Path $absolutePath -Value $Content -Encoding UTF8 -NoNewline
}

function Get-MarkdownSection {
    param(
        [string]$Content,
        [string]$Heading
    )

    $normalized = Normalize-Newlines $Content
    $lines = $normalized -split "`n"
    $sectionLines = New-Object System.Collections.Generic.List[string]
    $capturing = $false
    $inFence = $false
    $targetHeading = "## $Heading"

    foreach ($line in $lines) {
        if ($line -match '^\s*```') {
            if ($capturing) {
                $sectionLines.Add($line)
            }
            $inFence = -not $inFence
            continue
        }

        if (-not $capturing) {
            if ($line.Trim() -eq $targetHeading) {
                $capturing = $true
                $sectionLines.Add($line)
            }
            continue
        }

        if (-not $inFence -and $line -match '^##\s+' -and $line.Trim() -ne $targetHeading) {
            break
        }

        $sectionLines.Add($line)
    }

    if ($sectionLines.Count -eq 0) {
        return $null
    }

    ($sectionLines -join "`n").Trim()
}

function Apply-AgentsDocumentOverrides {
    param([string]$Content)

    $result = Normalize-Newlines $Content
    $architectureReplacement = @(
        '## Architecture',
        '',
        '```text',
        '.',
        '|-- AGENTS.md            # Repo-wide Codex instructions',
        '|-- WORKFLOW.md          # tri-ai-kit delivery workflow',
        '|-- .agents/',
        '|   `-- skills/          # Repo-scoped Codex skills',
        '`-- .codex/',
        '    |-- agents/          # Custom agents (*.toml)',
        '    |-- hooks.json       # Hook registrations',
        '    |-- config.toml      # Codex feature/config defaults',
        '    |-- hooks/           # Hook scripts and tests',
        '    |-- runtime/         # tri-ai-kit compatibility runtime',
        '    `-- agent-memory/    # Package-managed memory files',
        '```'
    ) -join "`n"
    $maintenanceReplacement = @(
        '## Package Maintenance',
        '',
        '- When maintaining tri-ai-kit itself, edit the Claude source package under `claude/` and rerun `scripts/sync-to-codex.ps1`.',
        '- When using the exported Codex kit in another repository, edit `AGENTS.md`, `.agents/skills/`, and `.codex/agents/` directly in that target repository.',
        '',
        ''
    ) -join "`n"

    $result = [regex]::Replace(
        $result,
        'This is the `claude/` subdirectory of the tri-ai-kit monorepo\..*?sync scripts\.',
        'This package is intended to be installed at the target repository root. Treat `AGENTS.md`, `.agents/skills/`, `.codex/agents/`, `.codex/hooks.json`, and `.codex/config.toml` as the Codex runtime surface.'
    )
    $result = $result.Replace('via the custom agent dispatch', 'via custom agent dispatch')
    $result = [regex]::Replace(
        $result,
        'Agents declare which skills they activate in their frontmatter',
        'Agents declare which skills they activate in their configuration'
    )
    $result = [regex]::Replace(
        $result,
        'Hooks are registered in `\.codex/config\.toml and \.codex/hooks\.json`',
        'Hooks are enabled via `.codex/config.toml` and registered in `.codex/hooks.json`'
    )

    $result = [regex]::Replace(
        $result,
        '(?ms)## Architecture\s+```.*?```',
        $architectureReplacement
    )

    $result = [regex]::Replace(
        $result,
        '(?ms)## Sync Commands\s+.*?(?=^## Decision Authority\b)',
        $maintenanceReplacement
    )

    $result = [regex]::Replace(
        $result,
        '\*\*New agent\*\*: Create `\.codex/agents/\{name\}\.toml`.*',
        '**New agent**: Create `.codex/agents/{name}.toml` with `name`, `description`, `developer_instructions`, optional model/config fields, and explicit `[[skills.config]]` entries.'
    )

    $result = [regex]::Replace(
        $result,
        '\*\*New skill\*\*: Create `\.agents/skills/\{name\}/SKILL\.md`.*',
        '**New skill**: Create `.agents/skills/{name}/SKILL.md` with the standard skill frontmatter and any supporting `references/`, `scripts/`, or assets the skill requires.'
    )

    ($result.TrimEnd() + "`n")
}

function Generate-AgentsDocument {
    $basePath = Resolve-RepoPath $CodexConfig.documents.instructionBase
    $supplementPath = Resolve-RepoPath $CodexConfig.documents.instructionSupplement
    $outputPath = [string]$CodexConfig.documents.instructionOutput

    if (-not (Test-Path $basePath)) {
        throw "Instruction base file not found: $($CodexConfig.documents.instructionBase)"
    }

    $baseContent = Get-Content $basePath -Raw -Encoding UTF8
    $baseBody = Normalize-Newlines $baseContent
    $baseBody = [regex]::Replace($baseBody, "(?im)^#\s+CLAUDE\.md\s*\n*", "")
    $baseBody = [regex]::Replace($baseBody, "(?is)^This file provides guidance to .*?repository\.\s*\n*", "")
    $baseBody = (Apply-TextTransforms $baseBody).Trim()

    $sections = New-Object System.Collections.Generic.List[string]
    $sections.Add("# AGENTS.md")
    $sections.Add("")
    $sections.Add("This file provides guidance to Codex when working with code in this repository.")
    $sections.Add("")
    $sections.Add("> Auto-generated from `claude/CLAUDE.md` and selected sections of `claude/AGENTS.md`. Do not edit directly.")
    $sections.Add("")
    $sections.Add($baseBody)

    if (Test-Path $supplementPath) {
        $supplementContent = Get-Content $supplementPath -Raw -Encoding UTF8
        $selectedSections = New-Object System.Collections.Generic.List[string]
        foreach ($heading in $CodexConfig.documents.supplementSections) {
            $section = Get-MarkdownSection -Content $supplementContent -Heading ([string]$heading)
            if ($null -ne $section) {
                $selectedSections.Add((Apply-TextTransforms $section).Trim())
            } else {
                Write-Detail "Supplement section not found: $heading"
            }
        }

        if ($selectedSections.Count -gt 0) {
            $sections.Add("")
            $sections.Add("---")
            $sections.Add("")
            $sections.Add(($selectedSections -join "`n`n"))
        }
    }

    $document = ($sections -join "`n").TrimEnd() + "`n"
    $document = Apply-AgentsDocumentOverrides $document
    Write-GeneratedFile -RelativePath $outputPath -Content $document
    $Stats.DocumentsGenerated++
}

function Generate-WorkflowDocument {
    $sourcePath = Resolve-RepoPath $CodexConfig.documents.workflowSource
    $outputPath = [string]$CodexConfig.documents.workflowOutput

    if (-not (Test-Path $sourcePath)) {
        throw "Workflow source file not found: $($CodexConfig.documents.workflowSource)"
    }

    $content = Get-Content $sourcePath -Raw -Encoding UTF8
    $transformed = Apply-TextTransforms $content
    Write-GeneratedFile -RelativePath $outputPath -Content ($transformed.TrimEnd() + "`n")
    $Stats.DocumentsGenerated++
}

function Sync-Agents {
    $sourcePath = Resolve-RepoPath $CodexConfig.agents.source
    $targetPath = Resolve-RepoPath $CodexConfig.agents.target

    if (-not (Test-Path $sourcePath)) {
        throw "Agent source directory not found: $($CodexConfig.agents.source)"
    }

    Ensure-Directory $targetPath

    $agentFiles = Get-ChildItem -Path $sourcePath -Filter "*.md" -File | Sort-Object Name
    Write-Host ""
    Write-Status "[AGENTS] Syncing $($agentFiles.Count) agents -> $($CodexConfig.agents.target)" "White"

    foreach ($file in $agentFiles) {
        try {
            $agent = Parse-AgentDefinition -FilePath $file.FullName
            $targetRelativePath = Join-Path $CodexConfig.agents.target ($file.BaseName + ".toml")
            $toml = Build-AgentToml -Agent $agent
            Write-GeneratedFile -RelativePath $targetRelativePath -Content $toml
            $Stats.AgentsSynced++
            Write-Detail "Prepared custom agent: $targetRelativePath"
        }
        catch {
            $Stats.Errors++
            Write-Warning "  ! Failed to sync agent '$($file.Name)': $_"
        }
    }
}

function Test-IsTextFile {
    param([string]$Path)

    $fileName = [System.IO.Path]::GetFileName($Path)
    if ($fileName -like "LICENSE*") {
        return $true
    }

    $extension = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
    ($CodexConfig.textExtensions -contains $extension)
}

function Copy-TransformedFile {
    param(
        [string]$SourceFile,
        [string]$TargetFile
    )

    $parent = Split-Path -Parent $TargetFile
    Ensure-Directory $parent

    if ($DryRun) {
        $relativeSource = (Get-NormalizedRelativePath -FromPath $RepoRoot -ToPath $SourceFile).Replace('\', '/')
        Write-Dr "Would copy: $relativeSource"
        return
    }

    if (Test-IsTextFile $SourceFile) {
        $content = Get-Content $SourceFile -Raw -Encoding UTF8
        $transformed = Apply-TextTransforms $content
        Write-Utf8NoBomFile -Path $TargetFile -Content $transformed
    } else {
        Copy-Item -LiteralPath $SourceFile -Destination $TargetFile -Force
    }

    $Stats.FilesCopied++
}

function Sync-Skills {
    $sourcePath = Resolve-RepoPath $CodexConfig.skills.source
    $targetPath = Resolve-RepoPath $CodexConfig.skills.target

    if (-not (Test-Path $sourcePath)) {
        throw "Skill source directory not found: $($CodexConfig.skills.source)"
    }

    Ensure-Directory $targetPath

    $skillDirectories = Get-ChildItem -Path $sourcePath -Directory | Sort-Object Name
    Write-Host ""
    Write-Status "[SKILLS] Syncing $($skillDirectories.Count) skills -> $($CodexConfig.skills.target)" "White"

    foreach ($skillDirectory in $skillDirectories) {
        if ($CodexConfig.skills.excludeDirectories -contains $skillDirectory.Name) {
            continue
        }

        $targetSkillDirectory = Join-Path $targetPath $skillDirectory.Name
        Ensure-Directory $targetSkillDirectory

        $files = Get-ChildItem -Path $skillDirectory.FullName -File -Recurse | Sort-Object FullName
        foreach ($file in $files) {
            if ($CodexConfig.skills.excludeFiles -contains $file.Name) {
                continue
            }

            $relativeInsideSkill = Get-NormalizedRelativePath -FromPath $skillDirectory.FullName -ToPath $file.FullName
            $targetFile = Join-Path $targetSkillDirectory $relativeInsideSkill
            Copy-TransformedFile -SourceFile $file.FullName -TargetFile $targetFile
        }

        $Stats.SkillsSynced++
        Write-Detail "Prepared skill: $($skillDirectory.Name)"
    }
}

function Sync-SkillIndex {
    $sourcePath = Resolve-RepoPath $CodexConfig.skillIndex.source
    $outputPath = [string]$CodexConfig.skillIndex.output

    if (-not (Test-Path $sourcePath)) {
        throw "Skill index source not found: $($CodexConfig.skillIndex.source)"
    }

    $indexObject = Get-Content $sourcePath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($CodexConfig.skillIndex.normalizePathSeparators -eq $true) {
        foreach ($skill in $indexObject.skills) {
            if ((Test-HasProperty $skill "path") -and $skill.path) {
                $skill.path = ([string]$skill.path).Replace('\', '/')
            }
        }
    }

    $json = $indexObject | ConvertTo-Json -Depth 100
    Write-GeneratedFile -RelativePath $outputPath -Content ($json.TrimEnd() + "`n")
}

function Test-IsInExcludedDirectory {
    param(
        [Parameter(Mandatory = $true)][string]$RootPath,
        [Parameter(Mandatory = $true)][string]$FilePath,
        [string[]]$ExcludedDirectories = @()
    )

    if ($ExcludedDirectories.Count -eq 0) {
        return $false
    }

    $relative = Get-NormalizedRelativePath -FromPath $RootPath -ToPath $FilePath
    $segments = $relative -split '[\\/]'
    foreach ($segment in $segments) {
        if ($ExcludedDirectories -contains $segment) {
            return $true
        }
    }

    $false
}

function Sync-DirectoryTree {
    param(
        [Parameter(Mandatory = $true)][string]$SourceRelativePath,
        [Parameter(Mandatory = $true)][string]$TargetRelativePath,
        [Parameter(Mandatory = $true)][string]$Label,
        [string[]]$ExcludeDirectories = @(),
        [string[]]$ExcludeFiles = @()
    )

    $sourcePath = Resolve-RepoPath $SourceRelativePath
    $targetPath = Resolve-RepoPath $TargetRelativePath

    if (-not (Test-Path $sourcePath)) {
        Write-Detail "Skipped missing source path: $SourceRelativePath"
        return
    }

    Ensure-Directory $targetPath

    $files = Get-ChildItem -Path $sourcePath -File -Recurse | Sort-Object FullName
    $files = @(
        $files | Where-Object {
            (-not (Test-IsInExcludedDirectory -RootPath $sourcePath -FilePath $_.FullName -ExcludedDirectories $ExcludeDirectories)) -and
            ($ExcludeFiles -notcontains $_.Name)
        }
    )

    Write-Host ""
    Write-Status "[$Label] Syncing $($files.Count) files -> $TargetRelativePath" "White"

    foreach ($file in $files) {
        $relativePath = Get-NormalizedRelativePath -FromPath $sourcePath -ToPath $file.FullName
        $targetFile = Join-Path $targetPath $relativePath
        Copy-TransformedFile -SourceFile $file.FullName -TargetFile $targetFile
    }
}

function Convert-HookCommand {
    param([Parameter(Mandatory = $true)][string]$Command)

    $result = Normalize-Newlines $Command
    $result = [regex]::Replace(
        $result,
        'node\s+\.claude/hooks/([^"\s]+)',
        'node "$(git rev-parse --show-toplevel)/.codex/hooks/$1"'
    )
    $result = [regex]::Replace(
        $result,
        'bash\s+\.claude/statusline-command\.sh',
        'bash "$(git rev-parse --show-toplevel)/.codex/runtime/statusline-command.sh"'
    )

    Apply-TextTransforms $result
}

function Get-HookStatusMessage {
    param([Parameter(Mandatory = $true)][string]$Command)

    $hookName = $null
    if ($Command -match '\.claude/hooks/([^"\s]+)') {
        $hookName = [System.IO.Path]::GetFileNameWithoutExtension($Matches[1])
    }

    switch ($hookName) {
        "session-init" { return "Initializing tri-ai-kit runtime" }
        "subagent-init" { return "Preparing subagent context" }
        "context-reminder" { return "Injecting project context" }
        "scout-block" { return "Checking Bash command scope" }
        "privacy-block" { return "Checking sensitive paths" }
        "build-gate-hook" { return "Checking build gate" }
        "post-index-reminder" { return "Reviewing post-tool reminders" }
        "session-metrics" { return "Writing session metrics" }
        "lesson-capture" { return "Capturing session lessons" }
        "notify" { return "Sending notifications" }
        default { return $null }
    }
}

function Get-HookParityResolution {
    param(
        [Parameter(Mandatory = $true)][string]$EventName,
        [string]$SourceMatcher
    )

    switch ($EventName) {
        "SessionStart" {
            return @{
                NativeEvent  = "SessionStart"
                NativeMatcher = if ([string]::IsNullOrWhiteSpace($SourceMatcher)) { "startup|resume" } else { $SourceMatcher }
                ParityMode   = "native"
                Notes        = @()
            }
        }
        "UserPromptSubmit" {
            return @{
                NativeEvent  = "UserPromptSubmit"
                NativeMatcher = $null
                ParityMode   = "native"
                Notes        = @()
            }
        }
        "Stop" {
            return @{
                NativeEvent  = "Stop"
                NativeMatcher = $null
                ParityMode   = "native"
                Notes        = @()
            }
        }
        "PreToolUse" {
            if ([string]::IsNullOrWhiteSpace($SourceMatcher)) {
                return @{
                    NativeEvent  = "PreToolUse"
                    NativeMatcher = "Bash"
                    ParityMode   = "native"
                    Notes        = @()
                }
            }

            if ($SourceMatcher -match '(^|\|)Bash($|\|)') {
                $parityMode = if ($SourceMatcher -eq "Bash") { "native" } else { "hybrid" }
                $notes = @()
                if ($parityMode -eq "hybrid") {
                    $notes += "Codex currently only emits Bash for PreToolUse; non-Bash tool interception requires compatibility runtime coverage."
                }
                return @{
                    NativeEvent  = "PreToolUse"
                    NativeMatcher = "Bash"
                    ParityMode   = $parityMode
                    Notes        = $notes
                }
            }

            return @{
                NativeEvent  = $null
                NativeMatcher = $null
                ParityMode   = "runtime_only"
                Notes        = @("Codex currently only emits Bash for PreToolUse; this matcher cannot be expressed natively.")
            }
        }
        "PostToolUse" {
            if ([string]::IsNullOrWhiteSpace($SourceMatcher)) {
                return @{
                    NativeEvent  = "PostToolUse"
                    NativeMatcher = "Bash"
                    ParityMode   = "native"
                    Notes        = @()
                }
            }

            if ($SourceMatcher -match '(^|\|)Bash($|\|)') {
                $parityMode = if ($SourceMatcher -eq "Bash") { "native" } else { "hybrid" }
                $notes = @()
                if ($parityMode -eq "hybrid") {
                    $notes += "Codex currently only emits Bash for PostToolUse; non-Bash post-tool parity requires compatibility runtime coverage."
                }
                return @{
                    NativeEvent  = "PostToolUse"
                    NativeMatcher = "Bash"
                    ParityMode   = $parityMode
                    Notes        = $notes
                }
            }

            return @{
                NativeEvent  = $null
                NativeMatcher = $null
                ParityMode   = "runtime_only"
                Notes        = @("Codex currently only emits Bash for PostToolUse; this matcher cannot be expressed natively.")
            }
        }
        default {
            return @{
                NativeEvent  = $null
                NativeMatcher = $null
                ParityMode   = "runtime_only"
                Notes        = @("Codex does not currently expose this lifecycle event natively.")
            }
        }
    }
}

function Generate-HooksJson {
    $settingsPath = Resolve-RepoPath "claude/.claude/settings.json"
    if (-not (Test-Path $settingsPath)) {
        throw "Settings source not found: claude/.claude/settings.json"
    }

    $settings = Get-Content $settingsPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $hooksRoot = [ordered]@{}
    $manifestEntries = New-Object System.Collections.Generic.List[object]

    foreach ($eventProperty in $settings.hooks.PSObject.Properties) {
        $eventName = [string]$eventProperty.Name
        foreach ($entry in @($eventProperty.Value)) {
            $sourceMatcher = if ((Test-HasProperty $entry "matcher") -and $entry.matcher) { [string]$entry.matcher } else { "" }
            $resolution = Get-HookParityResolution -EventName $eventName -SourceMatcher $sourceMatcher

            $hookEntries = New-Object System.Collections.Generic.List[object]
            foreach ($hook in @($entry.hooks)) {
                if (-not ((Test-HasProperty $hook "type") -and [string]$hook.type -eq "command")) {
                    continue
                }

                $hookConfig = [ordered]@{
                    type    = "command"
                    command = Convert-HookCommand ([string]$hook.command)
                }

                $statusMessage = Get-HookStatusMessage ([string]$hook.command)
                if (-not [string]::IsNullOrWhiteSpace($statusMessage)) {
                    $hookConfig.statusMessage = $statusMessage
                }

                $hookEntries.Add([pscustomobject]$hookConfig)
            }

            if ($resolution.NativeEvent -and $hookEntries.Count -gt 0) {
                if (-not $hooksRoot.Contains($resolution.NativeEvent)) {
                    $hooksRoot[$resolution.NativeEvent] = New-Object System.Collections.Generic.List[object]
                }

                if (-not [string]::IsNullOrWhiteSpace($resolution.NativeMatcher)) {
                    $nativeEntry = [ordered]@{
                        matcher = $resolution.NativeMatcher
                        hooks   = $hookEntries.ToArray()
                    }
                } else {
                    $nativeEntry = [ordered]@{
                        hooks = $hookEntries.ToArray()
                    }
                }

                $hooksRoot[$resolution.NativeEvent].Add([pscustomobject]$nativeEntry)
            }

            $manifestEntries.Add([pscustomobject]@{
                sourceEvent   = $eventName
                sourceMatcher = if ([string]::IsNullOrWhiteSpace($sourceMatcher)) { $null } else { $sourceMatcher }
                nativeEvent   = $resolution.NativeEvent
                nativeMatcher = $resolution.NativeMatcher
                parityMode    = $resolution.ParityMode
                commands      = @($hookEntries | ForEach-Object { $_.command })
                notes         = @($resolution.Notes)
            })
        }
    }

    $hooksJson = [ordered]@{ hooks = [ordered]@{} }
    foreach ($eventName in @("SessionStart", "PreToolUse", "PostToolUse", "UserPromptSubmit", "Stop")) {
        if ($hooksRoot.Contains($eventName)) {
            $hooksJson.hooks[$eventName] = $hooksRoot[$eventName].ToArray()
        }
    }

    $json = $hooksJson | ConvertTo-Json -Depth 100
    Write-GeneratedFile -RelativePath "codex/.codex/hooks.json" -Content ($json.TrimEnd() + "`n")

    $manifest = [ordered]@{
        sourceSettings = "claude/.claude/settings.json"
        windows        = [ordered]@{
            nativeHooksSupported = $false
            recommendedRuntime   = "WSL2"
            note                 = "Codex hooks are currently disabled natively on Windows; use WSL2 or another supported POSIX layer for parity validation."
        }
        mappings       = $manifestEntries.ToArray()
        statusLine     = [ordered]@{
            source = "claude/.claude/statusline-command.sh"
            target = ".codex/runtime/statusline-command.sh"
            note   = "Codex does not expose the Claude statusLine hook; keep this as compatibility runtime support."
        }
    }

    $manifestJson = $manifest | ConvertTo-Json -Depth 100
    Write-GeneratedFile -RelativePath "codex/.codex/runtime/parity-manifest.json" -Content ($manifestJson.TrimEnd() + "`n")
    $Stats.DocumentsGenerated += 2
}

function Generate-ConfigToml {
    $lines = @(
        "# Auto-generated from claude/.claude/settings.json and tri-ai-kit runtime defaults.",
        "# Enable Codex hooks and keep a stable default config surface for installed projects.",
        "",
        "web_search = ""cached""",
        "",
        "[features]",
        "codex_hooks = true",
        "",
        "[windows]",
        "sandbox = ""elevated"""
    )

    Write-GeneratedFile -RelativePath "codex/.codex/config.toml" -Content (($lines -join "`n").TrimEnd() + "`n")
    $Stats.DocumentsGenerated++
}

function Generate-RuntimeReadme {
    $lines = @(
        '# tri-ai-kit Codex Runtime',
        '',
        'This directory contains the compatibility runtime required to preserve tri-ai-kit behavior that Codex does not expose natively.',
        '',
        '## Native Codex coverage',
        '- `.codex/hooks.json` contains native hook registrations for `SessionStart`, `UserPromptSubmit`, `Stop`, and the Bash-supported subset of `PreToolUse`.',
        '- `.codex/config.toml` enables hooks support via `codex_hooks = true`.',
        '',
        '## Compatibility runtime coverage',
        '- `SubagentStart` and `SubagentStop` parity is tracked here because Codex does not currently expose those lifecycle events natively.',
        '- Non-Bash `PreToolUse` and `PostToolUse` parity is tracked here because the current Codex runtime only emits `Bash` for those events.',
        '- `statusline-command.sh` is preserved here for tri-ai-kit runtime parity work; Codex does not currently expose Claude''s status-line hook surface.',
        '',
        '## Windows',
        '- Native Codex hook support on Windows is currently unavailable.',
        '- Use WSL2 or another supported POSIX layer when validating full hook parity.',
        '',
        '## Files',
        '- `parity-manifest.json` records the native-vs-runtime mapping for every Claude hook entry.',
        '- `assets/` contains shared tri-ai-kit runtime assets used by improvement and runtime workflows.'
    )

    Write-GeneratedFile -RelativePath "codex/.codex/runtime/README.md" -Content (($lines -join "`n").TrimEnd() + "`n")
    $Stats.DocumentsGenerated++
}

function Initialize-ImprovementStore {
    $targetPath = Resolve-RepoPath $CodexConfig.improvementStore.target
    Ensure-Directory $targetPath
    Write-GeneratedFile -RelativePath (Join-Path $CodexConfig.improvementStore.target "current-session.json") -Content ("{}" + "`n")
    Write-GeneratedFile -RelativePath (Join-Path $CodexConfig.improvementStore.target "sessions.jsonl") -Content ""
}

function Sync-RuntimeSupport {
    Sync-DirectoryTree -SourceRelativePath $CodexConfig.hooks.source -TargetRelativePath $CodexConfig.hooks.target -Label "HOOKS" -ExcludeDirectories @($CodexConfig.hooks.excludeDirectories) -ExcludeFiles @($CodexConfig.hooks.excludeFiles)
    Sync-DirectoryTree -SourceRelativePath $CodexConfig.agentMemory.source -TargetRelativePath $CodexConfig.agentMemory.target -Label "MEMORY"
    Sync-DirectoryTree -SourceRelativePath $CodexConfig.outputStyles.source -TargetRelativePath $CodexConfig.outputStyles.target -Label "OUTPUT-STYLES"
    Sync-DirectoryTree -SourceRelativePath $CodexConfig.assets.source -TargetRelativePath $CodexConfig.assets.target -Label "ASSETS"

    foreach ($runtimeFile in $CodexConfig.runtimeFiles) {
        $sourcePath = Resolve-RepoPath ([string]$runtimeFile.source)
        $targetPath = Resolve-RepoPath ([string]$runtimeFile.target)
        if (-not (Test-Path $sourcePath)) {
            Write-Detail "Skipped missing runtime file: $($runtimeFile.source)"
            continue
        }

        Copy-TransformedFile -SourceFile $sourcePath -TargetFile $targetPath
    }

    Generate-HooksJson
    Generate-ConfigToml
    Generate-RuntimeReadme
    Initialize-ImprovementStore
}

$separator = "==========================================="
$startTime = Get-Date

Write-Status $separator "Magenta"
Write-Status " tri-ai-kit -> Codex Sync" "Magenta"
if ($DryRun) {
    Write-Status " MODE: DRY RUN (no files written)" "Yellow"
}
Write-Status $separator "Magenta"
Write-Status " Root      : $RepoRoot"
Write-Status " Package   : $($CodexConfig.packageRoot)"
Write-Status " Agents    : $($CodexConfig.agents.target)"
Write-Status " Skills    : $($CodexConfig.skills.target)"

try {
    $pathsToClear = New-Object System.Collections.Generic.List[string]
    if (-not $SkillsOnly) {
        foreach ($path in @($CodexConfig.documents.instructionOutput, $CodexConfig.documents.workflowOutput, $CodexConfig.agents.target)) {
            $pathsToClear.Add([string]$path)
        }
    }
    if (-not $AgentsOnly) {
        $pathsToClear.Add([string]$CodexConfig.skills.target)
    }
    if (-not $AgentsOnly -and -not $SkillsOnly) {
        foreach ($path in @(
            $CodexConfig.hooks.target,
            "codex/.codex/hooks.json",
            "codex/.codex/config.toml",
            "codex/.codex/runtime",
            $CodexConfig.agentMemory.target,
            $CodexConfig.outputStyles.target,
            "codex/.codex/.tri-ai-kit.json",
            "codex/.codex/.tri-ignore",
            $CodexConfig.improvementStore.target
        )) {
            $pathsToClear.Add([string]$path)
        }
    }

    Remove-GeneratedPaths -RelativePaths @($pathsToClear | Select-Object -Unique)

    if (-not $SkillsOnly) {
        Generate-AgentsDocument
        Generate-WorkflowDocument
        Sync-Agents
    }

    if (-not $AgentsOnly) {
        Sync-Skills
        Sync-SkillIndex
    }

    if (-not $AgentsOnly -and -not $SkillsOnly) {
        Sync-RuntimeSupport
    }
}
catch {
    $Stats.Errors++
    throw
}
finally {
    $elapsed = (Get-Date) - $startTime
    Write-Host ""
    Write-Status $separator "Magenta"
    Write-Status " Codex Sync Complete" "Magenta"
    Write-Status $separator "Magenta"
    Write-Host " Documents      : $($Stats.DocumentsGenerated)" -ForegroundColor White
    Write-Host " Agents synced  : $($Stats.AgentsSynced)" -ForegroundColor White
    Write-Host " Skills synced  : $($Stats.SkillsSynced)" -ForegroundColor White
    Write-Host " Files copied   : $($Stats.FilesCopied)" -ForegroundColor White
    if ($Stats.Errors -gt 0) {
        Write-Host " Errors         : $($Stats.Errors)" -ForegroundColor Red
    }
    Write-Host " Duration       : $([math]::Round($elapsed.TotalSeconds, 1))s" -ForegroundColor DarkGray
    if ($DryRun) {
        Write-Host ""
        Write-Host "Run without -DryRun to apply changes." -ForegroundColor Yellow
    }
}
