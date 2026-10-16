// src/scripts/__tests__/check-links.test.ts
// 用真实子进程跑脚本、断言真实退出码:守卫是「GitHub Actions 里 lychee 缺失必须 fail」,
// 而不是靠 mock 内部函数来证明。
//
// 判据是 GITHUB_ACTIONS 而不是 CI(2026-10-17):Cloudflare Workers Builds 也设 CI=1,
// 但它的容器里没有 lychee(由 GitHub workflow 的 lychee-action 安装),用 CI 当判据会让
// 部署构建稳定失败、线上停在旧构建。下面「Cloudflare 式环境」一例就是这个回归的守门测试。
// 注意:跑测的机器本身可能在 GitHub Actions 里,所以每个用例都显式设置 GITHUB_ACTIONS,
// 不能依赖它"不存在"。
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve('src/scripts/check-links.mjs');

let base: string; // 无 lychee 的 PATH
let withOk: string; // lychee 存在且成功
let withFail: string; // lychee 存在但报错

/** 造一个假 lychee:只验证脚本是否正确发现并调用它、是否透传退出码 */
function stubLychee(dir: string, exitCode: number): void {
  mkdirSync(dir, { recursive: true });
  const p = join(dir, 'lychee');
  writeFileSync(
    p,
    `#!/bin/sh\nif [ "$1" = "--version" ]; then echo "lychee 0.0.0-stub"; exit 0; fi\nexit ${exitCode}\n`,
  );
  chmodSync(p, 0o755);
}

function run(env: Record<string, string>) {
  // spawnSync:成功与失败路径都能拿到 stderr(execFileSync 成功时不回传 stderr)
  const r = spawnSync(process.execPath, [SCRIPT], {
    encoding: 'utf-8',
    env: { ...process.env, ...env },
  });
  return { code: r.status ?? -1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

describe('check-links CI 守卫', () => {
  beforeAll(() => {
    base = mkdtempSync(join(tmpdir(), 'nolych-'));
    withOk = mkdtempSync(join(tmpdir(), 'lychok-'));
    withFail = mkdtempSync(join(tmpdir(), 'lychfail-'));
    stubLychee(withOk, 0);
    stubLychee(withFail, 2);
  });

  afterAll(() => {
    for (const d of [base, withOk, withFail]) rmSync(d, { recursive: true, force: true });
  });

  it('fails when lychee is missing in GitHub Actions', () => {
    const r = run({ PATH: base, GITHUB_ACTIONS: 'true' });
    expect(r.code).not.toBe(0);
    expect(r.out).toMatch(/lychee/i);
  });

  it('skips (exit 0) when lychee is missing outside GitHub Actions', () => {
    const r = run({ PATH: base, GITHUB_ACTIONS: '', CI: '' });
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/skipping/i);
  });

  it('skips (exit 0) in a non-GitHub CI such as Cloudflare Workers Builds', () => {
    // 回归守卫:Cloudflare 构建容器设 CI=1 但没有 lychee。
    // 曾经用 process.env.CI 当判据 → 每次部署都死在 check:links,线上停在旧构建。
    const r = run({ PATH: base, GITHUB_ACTIONS: '', CI: '1' });
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/skipping/i);
  });

  it('runs the real check (exit 0) when lychee is present in GitHub Actions', () => {
    const r = run({ PATH: withOk, GITHUB_ACTIONS: 'true' });
    expect(r.code).toBe(0);
    expect(r.out).not.toMatch(/skipping/i);
  });

  it('propagates lychee failure even outside CI', () => {
    const r = run({ PATH: withFail, GITHUB_ACTIONS: '', CI: '' });
    expect(r.code).not.toBe(0);
  });
});
