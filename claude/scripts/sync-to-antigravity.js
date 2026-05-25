const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../..'); // ai-kit root
const CLAUDE_DIR = path.join(ROOT_DIR, 'claude', '.claude');
const OUT_DIR = path.join(ROOT_DIR, '.agent');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// 1. Create target directories
ensureDir(OUT_DIR);
ensureDir(path.join(OUT_DIR, 'skills'));
ensureDir(path.join(OUT_DIR, 'agents'));
ensureDir(path.join(OUT_DIR, 'hooks'));

// 2. Generate plugin.json
const pluginJson = {
    name: "tri-ai-kit",
    version: "1.0.0",
    description: "Antigravity plugin migrated from Claude kit",
    author: "tri-ai-kit"
};
fs.writeFileSync(path.join(OUT_DIR, 'plugin.json'), JSON.stringify(pluginJson, null, 2));
console.log('✅ Generated plugin.json');

// 3. Migrate Skills
console.log('Migrating skills...');
const skillsDir = path.join(CLAUDE_DIR, 'skills');
if (fs.existsSync(skillsDir)) {
    fs.cpSync(skillsDir, path.join(OUT_DIR, 'skills'), { recursive: true });
    console.log('✅ Copied skills to .agent/skills');
}

// 4. Migrate Hooks
console.log('Migrating hooks...');
const hooksDir = path.join(CLAUDE_DIR, 'hooks');
if (fs.existsSync(hooksDir)) {
    fs.cpSync(hooksDir, path.join(OUT_DIR, 'hooks'), { recursive: true });
    console.log('✅ Copied hooks to .agent/hooks');
}

// 5. Migrate Agents
console.log('Migrating agents...');
const agentsDir = path.join(CLAUDE_DIR, 'agents');
if (fs.existsSync(agentsDir)) {
    const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
    let agentCount = 0;
    
    for (const file of agentFiles) {
        const filePath = path.join(agentsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Simple YAML frontmatter parser
        const fmRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
        const match = content.match(fmRegex);
        
        let agentDef = {
            name: file.replace('.md', ''),
            description: "",
            system_prompt: content,
            enable_mcp_tools: true,
            enable_subagent_tools: true,
            enable_write_tools: true
        };
        
        if (match) {
            const fmText = match[1];
            const body = match[2].trim();
            
            // Extract name and description from yaml
            const nameMatch = fmText.match(/^name:\s*(.+)$/m);
            if (nameMatch) agentDef.name = nameMatch[1].trim();
            
            const descMatch = fmText.match(/^description:\s*(.+)$/m);
            if (descMatch) agentDef.description = descMatch[1].trim();
            
            agentDef.system_prompt = body;
        }
        
        const outFileName = agentDef.name + '.json';
        fs.writeFileSync(
            path.join(OUT_DIR, 'agents', outFileName),
            JSON.stringify(agentDef, null, 2)
        );
        agentCount++;
    }
    console.log(`✅ Converted ${agentCount} agents to .agent/agents`);
}

console.log('🎉 Migration to Antigravity CLI structure complete!');
