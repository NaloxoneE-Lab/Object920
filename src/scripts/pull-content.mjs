// src/scripts/pull-content.mjs
import { execSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync, chmodSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CONTENT_DIR = resolve(process.cwd(), 'src/content');
const projectRoot = process.cwd();
const CONTENT_REPO = process.env.CONTENT_REPO ?? 'YourUser/object920-content';
const GITHUB_TOKEN = process.env.CONTENT_GITHUB_TOKEN;
const FORCE_SYNC = process.env.FORCE_CONTENT_SYNC === 'true';
const IS_IF_MISSING = process.argv.includes('--if-missing');

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', encoding: 'utf-8', ...opts });
}

function getCloneUrl() {
  return `https://github.com/${CONTENT_REPO}.git`;
}

function validateContentRepo() {
  if (!existsSync(join(CONTENT_DIR, '.git'))) return false;
  try {
    const originUrl = run('git -C src/content remote get-url origin', {
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (!originUrl.includes(CONTENT_REPO)) return false;
    const branch = run('git -C src/content branch --show-current', {
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (branch !== 'main') return false;
    return true;
  } catch {
    return false;
  }
}

function clone() {
  console.log(`[pull-content] Cloning ${CONTENT_REPO}...`);
  const url = getCloneUrl();
  if (GITHUB_TOKEN) {
    // GIT_ASKPASS + Basic:token 走环境变量(不进进程列表/URL),git 以 x-access-token:token 构造凭据
    const askpass = resolve(projectRoot ?? process.cwd(), '.git-askpass.tmp');
    writeFileSync(askpass, '#!/bin/sh\necho "$OBJECT920_GIT_TOKEN"\n');
    chmodSync(askpass, 0o755);
    const env = {
      ...process.env,
      OBJECT920_GIT_TOKEN: GITHUB_TOKEN.trim(),
      GIT_ASKPASS: askpass,
      GIT_TERMINAL_PROMPT: '0',
    };
    try {
      run(`git clone --depth 1 ${url} src/content`, { env });
    } catch {
      console.error(
        '[pull-content] 带认证克隆失败:请核对 CONTENT_GITHUB_TOKEN 是否为 fine-grained PAT、' +
          'Repository access 是否勾选了本 content 仓、权限是否为 Contents: Read-only。',
      );
      throw new Error('authenticated clone failed');
    } finally {
      try {
        unlinkSync(askpass);
      } catch {
        /* already gone */
      }
    }
  } else {
    run(`git clone --depth 1 ${url} src/content`);
  }
  console.log('[pull-content] Clone complete.');
}

function pull() {
  if (!validateContentRepo()) {
    console.log('[pull-content] Repo invalid, re-cloning...');
    rmSync(CONTENT_DIR, { recursive: true, force: true });
    clone();
    return;
  }
  if (FORCE_SYNC) {
    console.log('[pull-content] Force sync (CI mode)...');
    run('git -C src/content fetch origin main --depth=1');
    run('git -C src/content reset --hard origin/main');
  } else {
    // 本地非 destructive:有未提交修改时报错退出,绝不自动 reset --hard
    const status = run('git -C src/content status --porcelain', {
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (status) {
      console.error(
        '[pull-content] src/content/ has uncommitted changes. Commit or stash first, or use FORCE_CONTENT_SYNC=true for CI.',
      );
      process.exit(1);
    }
    console.log('[pull-content] Pulling (ff-only)...');
    // depth 必须大于 1:--depth=1 会让本地 HEAD 与远端新 commit 的父链接同时被截断,
    // 两个浅根无法建立 merge-base,ff-only 必然报"无关历史"(实测)。depth=100 成本可忽略。
    run('git -C src/content fetch origin main --depth=100');
    try {
      run('git -C src/content merge --ff-only origin/main');
    } catch {
      // ff 失败 = 浅历史仍不连通或远端被 force-push;工作区已验证 clean,重 clone 安全
      console.log('[pull-content] Fast-forward not possible, re-cloning...');
      rmSync(CONTENT_DIR, { recursive: true, force: true });
      clone();
    }
  }
  console.log('[pull-content] Up to date.');
}

// 主逻辑
if (IS_IF_MISSING && existsSync(CONTENT_DIR)) {
  console.log('[pull-content] --if-missing: src/content/ exists, skipping.');
  process.exit(0);
}

if (!existsSync(CONTENT_DIR)) {
  clone();
} else {
  pull();
}

// 输出 content 元数据(供 build-meta.mjs 消费)
const commitHash = run('git -C src/content rev-parse HEAD', {
  stdio: ['pipe', 'pipe', 'pipe'],
}).trim();
const commitDate = run('git -C src/content log -1 --format=%cI', {
  stdio: ['pipe', 'pipe', 'pipe'],
}).trim();
console.log(`::content-commit=${commitHash}`);
console.log(`::content-updated=${commitDate}`);
