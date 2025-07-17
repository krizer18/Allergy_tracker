// Simple script to copy the content script to the public folder
const fs = require('fs');
const path = require('path');

// Create the scripts directory if it doesn't exist
const scriptsDir = path.join(__dirname, '../public');
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir, { recursive: true });
}

// Copy the content script
const contentScriptSrc = path.join(__dirname, '../src/content-script.ts');
const contentScriptDest = path.join(__dirname, '../public/content-script.js');

// Read the content script
const contentScript = fs.readFileSync(contentScriptSrc, 'utf8');

// Write it to the public folder with a simple wrapper
fs.writeFileSync(
  contentScriptDest,
  `// This is a development version of the content script
${contentScript}
// Log that the content script has loaded
console.log('Allergy Tracker content script loaded (development version)');`
);

console.log('Content script copied to public folder');