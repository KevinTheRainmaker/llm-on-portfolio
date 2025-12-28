/**
 * Copy python/llm_chat to api/llm_chat for Vercel deployment
 * This script runs during Vercel build to include Python modules
 */

import { cpSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const pythonDir = join(process.cwd(), 'python', 'llm_chat');
const apiPythonDir = join(process.cwd(), 'api', 'llm_chat');
const pythonDataDir = join(process.cwd(), 'python', 'data');
const apiDataDir = join(process.cwd(), 'api', 'data');

console.log('Copying Python modules for Vercel deployment...');

// Copy llm_chat module
if (existsSync(pythonDir)) {
  if (!existsSync(apiPythonDir)) {
    mkdirSync(apiPythonDir, { recursive: true });
  }
  cpSync(pythonDir, apiPythonDir, { recursive: true });
  console.log(`✓ Copied ${pythonDir} to ${apiPythonDir}`);
} else {
  console.warn(`⚠ Python directory not found: ${pythonDir}`);
}

// Copy data directory
if (existsSync(pythonDataDir)) {
  if (!existsSync(apiDataDir)) {
    mkdirSync(apiDataDir, { recursive: true });
  }
  cpSync(pythonDataDir, apiDataDir, { recursive: true });
  console.log(`✓ Copied ${pythonDataDir} to ${apiDataDir}`);
} else {
  console.warn(`⚠ Data directory not found: ${pythonDataDir}`);
}

console.log('Python modules copied successfully!');

