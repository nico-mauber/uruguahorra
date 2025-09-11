#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Expo web build...');

// Check if we have expo CLI available
const expoPaths = [
  'node_modules/.bin/expo',
  'node_modules/@expo/cli/bin/cli.js', 
  'node_modules/expo/bin/cli.js'
];

let expoCmd = null;

for (const expoPath of expoPaths) {
  const fullPath = path.join(__dirname, expoPath);
  console.log(`Checking: ${fullPath}`);
  
  if (fs.existsSync(fullPath)) {
    if (expoPath.includes('.bin')) {
      expoCmd = fullPath;
    } else {
      expoCmd = `node ${fullPath}`;
    }
    console.log(`✅ Found Expo CLI: ${expoCmd}`);
    break;
  }
}

if (!expoCmd) {
  console.error('❌ No Expo CLI found. Installing @expo/cli...');
  try {
    execSync('npm install @expo/cli --no-save', { 
      stdio: 'inherit',
      cwd: __dirname 
    });
    expoCmd = `node node_modules/@expo/cli/bin/cli.js`;
  } catch (error) {
    console.error('Failed to install @expo/cli:', error.message);
    process.exit(1);
  }
}

// Run expo export
const exportCmd = `${expoCmd} export --platform web --output-dir dist`;
console.log(`Executing: ${exportCmd}`);

try {
  execSync(exportCmd, { 
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ Expo export completed successfully!');
} catch (error) {
  console.error('❌ Expo export failed:', error.message);
  process.exit(1);
}