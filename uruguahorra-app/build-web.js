#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Try different ways to find and run expo export
const expoPaths = [
  'node_modules/.bin/expo',
  'node_modules/@expo/cli/bin/cli.js',
  'node_modules/expo/bin/cli.js'
];

async function runExpoExport() {
  for (const expoPath of expoPaths) {
    const fullPath = path.join(__dirname, expoPath);
    
    console.log(`Trying expo path: ${fullPath}`);
    
    try {
      const result = await new Promise((resolve, reject) => {
        const child = spawn('node', [fullPath, 'export', '--platform', 'web', '--output-dir', 'dist'], {
          stdio: 'inherit',
          cwd: __dirname
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            resolve(true);
          } else {
            reject(new Error(`Expo export failed with code ${code}`));
          }
        });
        
        child.on('error', reject);
      });
      
      if (result) {
        console.log('✅ Expo export completed successfully');
        return;
      }
    } catch (error) {
      console.log(`❌ Failed with ${expoPath}: ${error.message}`);
      continue;
    }
  }
  
  throw new Error('Could not find working expo CLI');
}

runExpoExport().catch(error => {
  console.error('Build failed:', error.message);
  process.exit(1);
});