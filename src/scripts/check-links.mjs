// 本地无 lychee 时跳过;CI 里必须硬失败——静默跳过会让死链一路合进 main。
// 教训(2026-10-15):压力测试样张里一条故意放的坏图正是这样绕过本地 pnpm build、
// 只在 CI 的 Build 步骤爆掉(run 153/154)。
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
  if (process.env.CI) {
    console.error(
      '[check:links] lychee 未安装,但当前处于 CI 环境(CI 变量已设置)。\n' +
        '  CI 必须提供 lychee:workflow 中需有 lycheeverse/lychee-action@v2 且 install: true。\n' +
        '  这里拒绝静默跳过——否则死链会绕过死链检查直接合入 main。',
    );
    process.exit(1);
  }
  console.warn('[check:links] lychee not installed — skipping locally (CI provides it)');
  process.exit(0);
}

// --root-dir:lychee 解析根相对链接(/zh/ 等)必须指定文件系统根,否则全量报 Cannot resolve(spec 9.2)
execSync('lychee --offline --no-progress --root-dir dist "dist/**/*.html"', { stdio: 'inherit' });
