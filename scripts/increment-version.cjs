const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageJsonPath = path.join(__dirname, '../package.json');

try {
  // Read and parse package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = packageJson.version;
  
  if (!currentVersion) {
    console.error('Could not find version in package.json');
    process.exit(1);
  }
  
  const parts = currentVersion.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    console.error(`Invalid version format: ${currentVersion}`);
    process.exit(1);
  }
  
  // Increment patch version
  parts[2] += 1;
  const newVersion = parts.join('.');
  
  // Update package.json object
  packageJson.version = newVersion;
  
  // Write back to package.json with pretty print formatting (2 spaces spacing)
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  
  console.log(`🚀 Automatically bumped package.json version: ${currentVersion} ➔ ${newVersion}`);
  
  // Stage package.json so it's included in the current commit
  execSync('git add package.json');
} catch (err) {
  console.error('Failed to auto-increment package.json version:', err);
  process.exit(1);
}
