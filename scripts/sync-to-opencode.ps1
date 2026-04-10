<#
.SYNOPSIS
    Sync the reusable Claude package to the generated OpenCode package layout.
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
$OpenCodeConfig = $Config.opencode
if ($null -eq $OpenCodeConfig) {
    throw "The sync config does not define an opencode block."
}

$Stats = @{
    AgentsSynced       = 0
    CommandsGenerated  = 0
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
        }
        else {
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
            }
            else {
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
            }
            else {
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

    foreach ($pattern in $OpenCodeConfig.transforms.removeLineContaining) {
        $escaped = [regex]::Escape($pattern)
        $filteredLines = foreach ($line in ($result -split "`n")) {
            if ($line -notmatch $escaped) {
                $line
            }
        }
        $result = ($filteredLines -join "`n")
    }

    foreach ($replacement in $OpenCodeConfig.transforms.replacements) {
        $hasIsRegex = Test-HasProperty $replacement "isRegex"
        if ($hasIsRegex -and $replacement.isRegex -eq $true) {
            $updated = [regex]::Replace($result, [string]$replacement.from, [string]$replacement.to)
        }
        else {
            $updated = $result.Replace([string]$replacement.from, [string]$replacement.to)
        }

        if ($updated -ne $result) {
            Write-Detail "Transformed text using pattern '$($replacement.from)'"
        }

        $result = $updated
    }

    $result = [regex]::Replace($result, '\bAgent tool\b', 'OpenCode subagent dispatch')
    $result = [regex]::Replace($result, '\bspawn_agent\b', 'subagent dispatch')
    $result = [regex]::Replace($result, '\bAskUserQuestion\b', 'ask the user')
    $result = $result.Replace('set-active-plan fails', 'plan activation step fails')
    $result = $result.Replace('via the OpenCode subagent dispatch', 'via OpenCode subagent dispatch')
    $result = $result.Replace('the OpenCode subagent dispatch', 'subagent dispatch')
    $result = $result.Replace('Agents declare which skills they activate in their frontmatter (`skills: [core, golang-pro]`).', 'Agents load relevant skills on demand from `.agents/skills/` via the OpenCode skill tool.')
    $result = [regex]::Replace(
        $result,
        'Read every file in `\.opencode/agents/`\.\s+For each agent extract `name`, `description`, and `skills` from the frontmatter\.',
        'Read every file in `.opencode/agents/`. For each agent extract the filename-based agent name, the `description` frontmatter, and the prompt body.'
    )
    $result = [regex]::Replace(
        $result,
        '(?m)^Frontmatter:\s*`name`, `description`, `model`, `color`, `skills`, `memory`, `permissionMode`, `handoffs`$',
        'Frontmatter: `description`, `mode`, optional `permission`, and optional model/provider fields supported by OpenCode.'
    )
    $result = [regex]::Replace(
        $result,
        '(?s)1\. \*\*Activate the plan\*\* \(REQUIRED .*?This stamps `status: active` in `plan\.md` so `/cook` picks it up automatically\.',
        '1. **Activate the plan** (REQUIRED - do not skip): update `plan.md` to `status: active` so `/cook` picks it up automatically.'
    )

    $result
}

function Escape-YamlSingleQuotedString {
    param([string]$Value)

    if ($null -eq $Value) {
        return ""
    }

    $Value.Replace("'", "''")
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
        }
        elseif (-not [string]::IsNullOrWhiteSpace($agent)) {
            $entry += $agent
        }
        else {
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

function Is-ReadOnlyAgent {
    param([string]$AgentName)

    @($OpenCodeConfig.agents.readOnlyAgents) -contains $AgentName
}

function Is-CoordinatorAgent {
    param([string]$AgentName)

    @($OpenCodeConfig.agents.coordinatorAgents) -contains $AgentName
}

function Build-AgentPrompt {
    param([hashtable]$Agent)

    $ruleLines = New-Object System.Collections.Generic.List[string]
    $ruleLines.Add('## OpenCode Execution Rules')
    $ruleLines.Add('- You are a tri-ai-kit OpenCode subagent.')
    if (Is-CoordinatorAgent $Agent.Name) {
        $ruleLines.Add('- Dispatch other subagents only when the workflow explicitly requires specialist routing.')
    }
    else {
        $ruleLines.Add('- Do not spawn or delegate to other subagents.')
    }
    $ruleLines.Add('- Load relevant skills from `.agents/skills/` when the task context matches them.')
    if (Is-ReadOnlyAgent $Agent.Name) {
        $ruleLines.Add('- Stay read-only: analyze, review, or plan without editing files.')
    }

    $sections = New-Object System.Collections.Generic.List[string]
    $sections.Add(($ruleLines -join "`n"))

    $body = Apply-TextTransforms $Agent.Body
    if (-not [string]::IsNullOrWhiteSpace($body)) {
        $sections.Add($body.Trim())
    }

    if (-not [string]::IsNullOrWhiteSpace($Agent.Memory)) {
        $sections.Add(@'
## OpenCode Packaging Notes
- The source `memory:` setting has no native OpenCode field. Preserve long-lived context through plans, reports, and repository artifacts instead of assuming automatic project memory.
'@.Trim())
    }

    $handoffSection = Format-HandoffsSection $Agent.Handoffs
    if (-not [string]::IsNullOrWhiteSpace($handoffSection)) {
        $sections.Add($handoffSection)
    }

    (($sections -join "`n`n").Trim() + "`n")
}

function Build-AgentMarkdown {
    param([hashtable]$Agent)

    if ([string]::IsNullOrWhiteSpace($Agent.Name)) {
        throw "Agent '$($Agent.SourceName)' is missing a name field."
    }
    if ([string]::IsNullOrWhiteSpace($Agent.Description)) {
        throw "Agent '$($Agent.SourceName)' is missing a description field."
    }

    $escapedDescription = Escape-YamlSingleQuotedString $Agent.Description
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add('---')
    $lines.Add("description: '$escapedDescription'")
    $lines.Add('mode: subagent')
    $lines.Add('permission:')
    if (Is-CoordinatorAgent $Agent.Name) {
        $lines.Add('  task:')
        $lines.Add('    "*": allow')
    }
    else {
        $lines.Add('  task: deny')
    }
    $lines.Add('  skill:')
    $lines.Add('    "*": allow')
    if (Is-ReadOnlyAgent $Agent.Name) {
        $lines.Add('  edit: deny')
    }
    $lines.Add('---')
    $lines.Add((Build-AgentPrompt $Agent).TrimEnd())

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

    Write-Utf8NoBomFile -Path $absolutePath -Content $Content
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
        '|-- AGENTS.md            # Repo-wide OpenCode instructions',
        '|-- WORKFLOW.md          # tri-ai-kit delivery workflow',
        '|-- opencode.json        # Project-level OpenCode config',
        '|-- .agents/',
        '|   `-- skills/          # Repo-scoped OpenCode skills',
        '`-- .opencode/',
        '    |-- agents/          # Custom OpenCode subagents (*.md)',
        '    `-- commands/        # Custom slash commands (*.md)',
        '```'
    ) -join "`n"
    $runtimeReplacement = @(
        '### OpenCode Runtime Surface',
        '- Root instructions are loaded from `AGENTS.md`.',
        '- Project config is loaded from `opencode.json`.',
        '- Custom subagents live in `.opencode/agents/`.',
        '- Custom commands live in `.opencode/commands/`.',
        '- Skills live in `.agents/skills/`.',
        '',
        '## Package Validation',
        '',
        'Run these checks after generating or installing the package:',
        '',
        '```powershell',
        'opencode agent list',
        'opencode debug skill',
        'opencode debug config',
        '```'
    ) -join "`n"
    $maintenanceReplacement = @(
        '## Package Maintenance',
        '',
        '- When maintaining tri-ai-kit itself, edit the Claude source package under `claude/` and rerun `scripts/sync-to-opencode.ps1`.',
        '- When using the exported OpenCode kit in another repository, edit `AGENTS.md`, `opencode.json`, `.opencode/agents/`, `.opencode/commands/`, and `.agents/skills/` directly in that target repository.',
        '',
        '## Decision Authority'
    ) -join "`n"

    $result = [regex]::Replace(
        $result,
        'tri-ai-kit is a multi-agent development toolkit for OpenCode\..*?Agents never spawn other agents\.',
        'tri-ai-kit is a multi-agent development toolkit for OpenCode. It provides 22 specialized agents, 60+ skills, custom commands, and a 15-phase production delivery workflow. The main conversation always acts as orchestrator - it routes to the right specialist via OpenCode subagent dispatch and merges results. Coordinator agents may dispatch specialists when the workflow requires it.'
    )
    $result = [regex]::Replace(
        $result,
        'This is the `claude/` subdirectory of the tri-ai-kit monorepo\..*?sync scripts\.',
        'This package is intended to be installed at the target repository root. Treat `AGENTS.md`, `opencode.json`, `.opencode/agents/`, `.opencode/commands/`, and `.agents/skills/` as the OpenCode runtime surface.'
    )
    $result = [regex]::Replace($result, '(?ms)^## Architecture\n.*?^## Key Concepts', $architectureReplacement + "`n`n## Key Concepts")
    $result = [regex]::Replace($result, '(?ms)^### Hooks System\n.*?^## Sync Commands', $runtimeReplacement + "`n`n## Sync Commands")
    $result = [regex]::Replace($result, '(?ms)^## Sync Commands\n.*?^## Decision Authority', $maintenanceReplacement)
    $result = [regex]::Replace(
        $result,
        '\*\*New agent\*\*: Create `\.opencode/agents/\{name\}\.md`.*',
        '**New agent**: Create `.opencode/agents/{name}.md` with frontmatter (`description`, `mode`, optional `permission`) and the agent prompt body. Rerun `scripts/sync-to-opencode.ps1` after source changes.'
    )
    $result = [regex]::Replace(
        $result,
        '\*\*New skill\*\*: Create `\.claude/skills/\{name\}/SKILL\.md`.*',
        '**New skill**: Create `.agents/skills/{name}/SKILL.md` with the standard skill frontmatter and any supporting `references/`, `scripts/`, or assets the skill requires.'
    )

    ($result.TrimEnd() + "`n")
}

function Generate-AgentsDocument {
    $basePath = Resolve-RepoPath $OpenCodeConfig.documents.instructionBase
    $supplementPath = Resolve-RepoPath $OpenCodeConfig.documents.instructionSupplement
    $outputPath = [string]$OpenCodeConfig.documents.instructionOutput

    if (-not (Test-Path $basePath)) {
        throw "Instruction base file not found: $($OpenCodeConfig.documents.instructionBase)"
    }

    $baseContent = Get-Content $basePath -Raw -Encoding UTF8
    $baseBody = Normalize-Newlines $baseContent
    $baseBody = [regex]::Replace($baseBody, '(?im)^#\s+CLAUDE\.md\s*\n*', '')
    $baseBody = [regex]::Replace($baseBody, '(?is)^This file provides guidance to .*?repository\.\s*\n*', '')
    $baseBody = (Apply-TextTransforms $baseBody).Trim()

    $sections = New-Object System.Collections.Generic.List[string]
    $sections.Add('# AGENTS.md')
    $sections.Add('')
    $sections.Add('This file provides guidance to OpenCode when working with code in this repository.')
    $sections.Add('')
    $sections.Add('> Auto-generated from `claude/CLAUDE.md` and selected sections of `claude/AGENTS.md`. Do not edit directly.')
    $sections.Add('')
    $sections.Add($baseBody)

    if (Test-Path $supplementPath) {
        $supplementContent = Get-Content $supplementPath -Raw -Encoding UTF8
        $selectedSections = New-Object System.Collections.Generic.List[string]
        foreach ($heading in $OpenCodeConfig.documents.supplementSections) {
            $section = Get-MarkdownSection -Content $supplementContent -Heading ([string]$heading)
            if ($null -ne $section) {
                $selectedSections.Add((Apply-TextTransforms $section).Trim())
            }
            else {
                Write-Detail "Supplement section not found: $heading"
            }
        }

        if ($selectedSections.Count -gt 0) {
            $sections.Add('')
            $sections.Add('---')
            $sections.Add('')
            $sections.Add(($selectedSections -join "`n`n"))
        }
    }

    $document = ($sections -join "`n").TrimEnd() + "`n"
    $document = Apply-AgentsDocumentOverrides $document
    Write-GeneratedFile -RelativePath $outputPath -Content $document
    $Stats.DocumentsGenerated++
}

function Generate-WorkflowDocument {
    $sourcePath = Resolve-RepoPath $OpenCodeConfig.documents.workflowSource
    $outputPath = [string]$OpenCodeConfig.documents.workflowOutput

    if (-not (Test-Path $sourcePath)) {
        throw "Workflow source file not found: $($OpenCodeConfig.documents.workflowSource)"
    }

    $content = Get-Content $sourcePath -Raw -Encoding UTF8
    $transformed = Apply-TextTransforms $content
    Write-GeneratedFile -RelativePath $outputPath -Content ($transformed.TrimEnd() + "`n")
    $Stats.DocumentsGenerated++
}

function Sync-Agents {
    $sourcePath = Resolve-RepoPath $OpenCodeConfig.agents.source
    $targetPath = Resolve-RepoPath $OpenCodeConfig.agents.target

    if (-not (Test-Path $sourcePath)) {
        throw "Agent source directory not found: $($OpenCodeConfig.agents.source)"
    }

    Ensure-Directory $targetPath

    $agentFiles = Get-ChildItem -Path $sourcePath -Filter '*.md' -File | Sort-Object Name
    Write-Host ''
    Write-Status "[AGENTS] Syncing $($agentFiles.Count) agents -> $($OpenCodeConfig.agents.target)" 'White'

    foreach ($file in $agentFiles) {
        try {
            $agent = Parse-AgentDefinition -FilePath $file.FullName
            $targetRelativePath = Join-Path $OpenCodeConfig.agents.target ($file.BaseName + '.md')
            $content = Build-AgentMarkdown -Agent $agent
            Write-GeneratedFile -RelativePath $targetRelativePath -Content $content
            $Stats.AgentsSynced++
            Write-Detail "Prepared OpenCode subagent: $targetRelativePath"
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
    if ($fileName -like 'LICENSE*') {
        return $true
    }

    $extension = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
    ($OpenCodeConfig.textExtensions -contains $extension)
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
    }
    else {
        Copy-Item -LiteralPath $SourceFile -Destination $TargetFile -Force
    }

    $Stats.FilesCopied++
}

function Sync-Skills {
    $sourcePath = Resolve-RepoPath $OpenCodeConfig.skills.source
    $targetPath = Resolve-RepoPath $OpenCodeConfig.skills.target

    if (-not (Test-Path $sourcePath)) {
        throw "Skill source directory not found: $($OpenCodeConfig.skills.source)"
    }

    Ensure-Directory $targetPath

    $skillDirectories = Get-ChildItem -Path $sourcePath -Directory | Sort-Object Name
    Write-Host ''
    Write-Status "[SKILLS] Syncing $($skillDirectories.Count) skills -> $($OpenCodeConfig.skills.target)" 'White'

    foreach ($skillDirectory in $skillDirectories) {
        if ($OpenCodeConfig.skills.excludeDirectories -contains $skillDirectory.Name) {
            continue
        }

        $targetSkillDirectory = Join-Path $targetPath $skillDirectory.Name
        Ensure-Directory $targetSkillDirectory

        $files = Get-ChildItem -Path $skillDirectory.FullName -File -Recurse | Sort-Object FullName
        foreach ($file in $files) {
            if ($OpenCodeConfig.skills.excludeFiles -contains $file.Name) {
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
    $sourcePath = Resolve-RepoPath $OpenCodeConfig.skillIndex.source
    $outputPath = [string]$OpenCodeConfig.skillIndex.output

    if (-not (Test-Path $sourcePath)) {
        throw "Skill index source not found: $($OpenCodeConfig.skillIndex.source)"
    }

    $indexObject = Get-Content $sourcePath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($OpenCodeConfig.skillIndex.normalizePathSeparators -eq $true) {
        foreach ($skill in $indexObject.skills) {
            if ((Test-HasProperty $skill 'path') -and $skill.path) {
                $skill.path = ([string]$skill.path).Replace('\', '/')
            }
        }
    }

    $json = $indexObject | ConvertTo-Json -Depth 100
    Write-GeneratedFile -RelativePath $outputPath -Content ($json.TrimEnd() + "`n")
}

function Build-CommandMarkdown {
    param($Entry)

    if (-not (Test-HasProperty $Entry 'name') -or [string]::IsNullOrWhiteSpace([string]$Entry.name)) {
        throw 'OpenCode command entry is missing a name.'
    }
    if (-not (Test-HasProperty $Entry 'description') -or [string]::IsNullOrWhiteSpace([string]$Entry.description)) {
        throw "OpenCode command '$($Entry.name)' is missing a description."
    }
    if (-not (Test-HasProperty $Entry 'template') -or [string]::IsNullOrWhiteSpace([string]$Entry.template)) {
        throw "OpenCode command '$($Entry.name)' is missing a template."
    }

    $escapedDescription = Escape-YamlSingleQuotedString ([string]$Entry.description)
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add('---')
    $lines.Add("description: '$escapedDescription'")
    if ((Test-HasProperty $Entry 'agent') -and -not [string]::IsNullOrWhiteSpace([string]$Entry.agent)) {
        $lines.Add("agent: $([string]$Entry.agent)")
    }
    if ((Test-HasProperty $Entry 'subtask') -and $Entry.subtask -eq $true) {
        $lines.Add('subtask: true')
    }
    $lines.Add('---')
    $lines.Add((Apply-TextTransforms ([string]$Entry.template)).Trim())

    (($lines -join "`n").TrimEnd() + "`n")
}

function Generate-Commands {
    $targetPath = Resolve-RepoPath $OpenCodeConfig.commands.target
    Ensure-Directory $targetPath

    $entries = @($OpenCodeConfig.commands.entries)
    Write-Host ''
    Write-Status "[COMMANDS] Generating $($entries.Count) commands -> $($OpenCodeConfig.commands.target)" 'White'

    foreach ($entry in $entries) {
        $name = [string]$entry.name
        $targetRelativePath = Join-Path $OpenCodeConfig.commands.target ($name + '.md')
        $content = Build-CommandMarkdown -Entry $entry
        Write-GeneratedFile -RelativePath $targetRelativePath -Content $content
        $Stats.CommandsGenerated++
        Write-Detail "Prepared command: $targetRelativePath"
    }
}

function Generate-OpenCodeConfig {
    $configObject = [ordered]@{
        '$schema'      = 'https://opencode.ai/config.json'
        default_agent  = [string]$OpenCodeConfig.config.defaultAgent
        instructions   = @($OpenCodeConfig.config.instructions)
        agent          = [ordered]@{
            build = [ordered]@{
                permission = [ordered]@{
                    skill = [ordered]@{ '*' = 'allow' }
                    task  = [ordered]@{ '*' = 'allow' }
                }
            }
            plan  = [ordered]@{
                permission = [ordered]@{
                    skill = [ordered]@{ '*' = 'allow' }
                    task  = [ordered]@{ '*' = 'allow' }
                }
            }
        }
    }

    $json = $configObject | ConvertTo-Json -Depth 100
    Write-GeneratedFile -RelativePath ([string]$OpenCodeConfig.config.output) -Content ($json.TrimEnd() + "`n")
    $Stats.DocumentsGenerated++
}

$separator = '==========================================='
$startTime = Get-Date

Write-Status $separator 'Magenta'
Write-Status ' tri-ai-kit -> OpenCode Sync' 'Magenta'
if ($DryRun) {
    Write-Status ' MODE: DRY RUN (no files written)' 'Yellow'
}
Write-Status $separator 'Magenta'
Write-Status " Root      : $RepoRoot"
Write-Status " Package   : $($OpenCodeConfig.packageRoot)"
Write-Status " Agents    : $($OpenCodeConfig.agents.target)"
Write-Status " Commands  : $($OpenCodeConfig.commands.target)"
Write-Status " Skills    : $($OpenCodeConfig.skills.target)"

try {
    $pathsToClear = New-Object System.Collections.Generic.List[string]
    if (-not $SkillsOnly) {
        foreach ($path in @(
            $OpenCodeConfig.documents.instructionOutput,
            $OpenCodeConfig.documents.workflowOutput,
            $OpenCodeConfig.config.output,
            $OpenCodeConfig.agents.target,
            $OpenCodeConfig.commands.target
        )) {
            $pathsToClear.Add([string]$path)
        }
    }
    if (-not $AgentsOnly) {
        $pathsToClear.Add([string]$OpenCodeConfig.skills.target)
    }

    Remove-GeneratedPaths -RelativePaths @($pathsToClear | Select-Object -Unique)

    if (-not $SkillsOnly) {
        Generate-AgentsDocument
        Generate-WorkflowDocument
        Generate-OpenCodeConfig
        Sync-Agents
        Generate-Commands
    }

    if (-not $AgentsOnly) {
        Sync-Skills
        Sync-SkillIndex
    }
}
catch {
    $Stats.Errors++
    throw
}
finally {
    $elapsed = (Get-Date) - $startTime
    Write-Host ''
    Write-Status $separator 'Magenta'
    Write-Status ' OpenCode Sync Complete' 'Magenta'
    Write-Status $separator 'Magenta'
    Write-Host " Documents      : $($Stats.DocumentsGenerated)" -ForegroundColor White
    Write-Host " Agents synced  : $($Stats.AgentsSynced)" -ForegroundColor White
    Write-Host " Commands       : $($Stats.CommandsGenerated)" -ForegroundColor White
    Write-Host " Skills synced  : $($Stats.SkillsSynced)" -ForegroundColor White
    Write-Host " Files copied   : $($Stats.FilesCopied)" -ForegroundColor White
    if ($Stats.Errors -gt 0) {
        Write-Host " Errors         : $($Stats.Errors)" -ForegroundColor Red
    }
    Write-Host " Duration       : $([math]::Round($elapsed.TotalSeconds, 1))s" -ForegroundColor DarkGray
    if ($DryRun) {
        Write-Host ''
        Write-Host 'Run without -DryRun to apply changes.' -ForegroundColor Yellow
    }
}
