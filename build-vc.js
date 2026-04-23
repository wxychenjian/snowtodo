const { execSync } = require('child_process');
process.chdir('D:\\todo-electron\\app');
try {
  const result = execSync('node node_modules/electron-builder/cli.js --win --x64', { stdio: 'inherit', encoding: 'utf8' });
  console.log('Done:', result);
} catch (e) {
  console.error('Exit code:', e.status);
}
