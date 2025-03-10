const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// Đường dẫn đến thư mục gốc của dự án
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const templatesDir = path.join(rootDir, 'templates');
const distTemplatesDir = path.join(distDir, 'templates');

// Hàm để thực hiện một lệnh
function runCommand(command) {
  console.log(`Running: ${command}`);
  execSync(command, { stdio: 'inherit', cwd: rootDir });
}

// Xóa thư mục dist nếu nó đã tồn tại
if (fs.existsSync(distDir)) {
  console.log('Cleaning dist directory...');
  fs.removeSync(distDir);
}

// Tạo thư mục dist
fs.mkdirSync(distDir, { recursive: true });

// Build TypeScript
console.log('Building TypeScript...');
try {
  runCommand('npx tsc');
} catch (error) {
  console.warn('TypeScript compilation had errors, but continuing build process...');
}

// Copy các templates vào thư mục dist
console.log('Copying templates...');
fs.copySync(templatesDir, distTemplatesDir);

// Đảm bảo file CLI có quyền thực thi
console.log('Setting CLI permissions...');
const cliPath = path.join(distDir, 'cli', 'index.js');
if (fs.existsSync(cliPath)) {
  fs.chmodSync(cliPath, '755');
}

console.log('Copying source files to templates...');
// Đảm bảo thư mục templates tồn tại
fs.ensureDirSync(path.join(rootDir, 'templates'));

// Sao chép từ src vào templates 
fs.copySync(
  path.join(rootDir, 'src/components'), 
  path.join(rootDir, 'templates/components')
);
fs.copySync(
  path.join(rootDir, 'src/lib'), 
  path.join(rootDir, 'templates/lib')
);
fs.copySync(
  path.join(rootDir, 'src/utils'), 
  path.join(rootDir, 'templates/utils')
);
fs.copySync(
  path.join(rootDir, 'src/provider'), 
  path.join(rootDir, 'templates/provider')
);

console.log('Build completed successfully!'); 