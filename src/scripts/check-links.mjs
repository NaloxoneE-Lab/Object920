// 本地无 lychee 时跳过;CI 由 lychee-action 安装后强制执行(spec 9.2)
import { execSync } from 'node:child_process';

function hasLychee() {
  try {
    execSync('lychee --version', { stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

if (!hasLychee()) {
  console.warn('[check:links] lychee not installed — skipping locally (CI provides it)');
  process.exit(0);
}

// --root-dir:lychee 解析根相对链接(/zh/ 等)必须指定文件系统根,否则全量报 Cannot resolve(spec 9.2)
execSync('lychee --offline --no-progress --root-dir dist "dist/**/*.html"', { stdio: 'inherit' });
