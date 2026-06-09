const { existsSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

const clientIndex = join(__dirname, '..', 'client', 'dist', 'index.html');
if (existsSync(clientIndex)) {
  console.log('Frontend build found.');
  process.exit(0);
}

console.log('Frontend build missing. Building client before server start...');

execSync('npm ci --prefix client --include=dev', {
  stdio: 'inherit',
  shell: true,
});

execSync('npm run build --prefix client', {
  stdio: 'inherit',
  shell: true,
});
