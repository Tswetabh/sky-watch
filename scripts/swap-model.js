#!/usr/bin/env node

/**
 * Skywatch Model Swap Script
 * Usage: npm run swap-model -- <model_name>
 * Example: npm run swap-model -- gemma3:4b
 * Example: npm run swap-model -- gemma:2b
 * Example: npm run swap-model -- llama3.2:3b
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.resolve(__dirname, '../src/config/modelConfig.json');

// Parse argument
const args = process.argv.slice(2).filter((arg) => arg !== '--');
const targetModel = args[0];

if (!targetModel) {
  console.log('\n❌ Error: Please specify target model name.\n');
  console.log('Usage: npm run swap-model -- <model_name>');
  console.log('Examples:');
  console.log('  npm run swap-model -- gemma3:4b');
  console.log('  npm run swap-model -- gemma:2b');
  console.log('  npm run swap-model -- llama3.2:3b');
  process.exit(1);
}

try {
  const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const previousModel = currentConfig.model;

  currentConfig.model = targetModel;
  fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2) + '\n', 'utf8');

  console.log('\n✨ [Skywatch Model Swap Successful]');
  console.log(`-----------------------------------------------`);
  console.log(`Previous Model : ${previousModel}`);
  console.log(`Active Model   : ${targetModel}`);
  console.log(`Ollama Host    : ${currentConfig.ollamaHost}`);
  console.log(`Config File    : src/config/modelConfig.json`);
  console.log(`-----------------------------------------------`);
  console.log(`Restart or reload Vite dev server to apply immediately.\n`);
} catch (err) {
  console.error('Failed to swap model:', err);
  process.exit(1);
}
