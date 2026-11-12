'use strict';

const fs = require('fs');
const path = require('path');
const { findWorkspace, hookEnabled, readState, writeState } = require('./workspace.cjs');

function loadConfig() {
  const ws = findWorkspace(process.cwd());
  const custom = ws ? path.join(ws.root, '.ai-kit', 'scout-ignore') : null;
  return {
    hooks: {
      scout: {
        enabled: hookEnabled('scout'),
        ignoreFile: custom && fs.existsSync(custom) ? custom : path.join(process.cwd(), '.ai-kit', 'scout-ignore')
      }
    }
  };
}

function isHookEnabled(name) {
  return hookEnabled(name);
}

module.exports = {
  loadConfig,
  isHookEnabled,
  readSessionState: readState,
  writeSessionState: writeState
};
