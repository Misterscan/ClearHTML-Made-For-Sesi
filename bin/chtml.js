#!/usr/bin/env node
'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const command = args[0];

const commands = {
  'build': { script: 'compiler.sesi', desc: 'Compile src/*.chtml to out/*.html (supports --debug)' },
  'fetch': { script: 'fetch.sesi', desc: 'Fetch remote content (defined in fetch.sesi)' },
  'lint': { script: 'bin/lint.sesi', desc: 'Audit ClearHTML and Sesi files' },
  'customize': { script: 'customize_css.sesi', desc: 'Sesi powered CSS generation' },
  'watch': { desc: 'Watch src/ for changes and recompile' }
};

function showHelp() {
  console.log('\x1b[1mClearHTML CLI\x1b[0m');
  console.log('\nUsage:');
  console.log('  chtml <command> [args]');
  console.log('\nCommands:');
  for (const [cmd, info] of Object.entries(commands)) {
    console.log(`  ${cmd.padEnd(12)} ${info.desc}`);
  }
  console.log('\nOptions:');
  console.log('  -h, --help   Show this help');
  console.log('  -v, --version Show version');
}

if (!command || command === '-h' || command === '--help') {
  showHelp();
  process.exit(0);
}

if (command === '-v' || command === '--version') {
  const pkg = require('../package.json');
  console.log(`chtml v${pkg.version}`);
  process.exit(0);
}

if (!commands[command]) {
  console.error(`Unknown command: ${command}`);
  showHelp();
  process.exit(1);
}

if (command === 'watch') {
  runWatch();
} else {
  runSesiScript(commands[command].script, args.slice(1));
}

function runSesiScript(script, extraArgs) {
  const scriptPath = path.resolve(__dirname, '..', script);
  if (!fs.existsSync(scriptPath)) {
    console.error(`Error: Script not found at ${scriptPath}`);
    process.exit(1);
  }

  const sesiBin = path.resolve(__dirname, 'sesi.js');
  const child = spawn('node', [sesiBin, '-l', scriptPath, ...extraArgs], {
    stdio: 'inherit'
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

function runWatch() {
  console.log('Starting watch mode...');
  const srcDir = path.resolve(__dirname, '..', 'src');
  
  // Simple watch using fs.watch
  fs.watch(srcDir, { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith('.chtml')) {
      console.log(`\nChange detected in ${filename}. Recompiling...`);
      // Run the build command
      const sesiBin = path.resolve(__dirname, 'sesi.js');
      const compilerScript = path.resolve(__dirname, '..', 'compiler.sesi');
      
      const child = spawn('node', [sesiBin, '-l', compilerScript], {
        stdio: 'inherit'
      });
      
      child.on('exit', (code) => {
        if (code === 0) {
          console.log('✓ Recompiled successfully.');
        } else {
          console.error('✗ Recompile failed.');
        }
      });
    }
  });

  console.log(`Watching ${srcDir} for changes... (Press Ctrl+C to stop)`);
}
