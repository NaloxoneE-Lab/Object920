// src/scripts/__tests__/check-links.test.ts
// 用真实子进程跑脚本、断言真实退出码:守卫是「CI 里 lychee 缺失必须 fail」,
// 而不是靠 mock 内部函数来证明。
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

  it('fails when lychee is missing and CI is set', () => {
    const r = run({ PATH: base, CI: 'true' });
    expect(r.code).not.toBe(0);
    expect(r.out).toMatch(/lychee/i);
  });

  it('skips (exit 0) when lychee is missing outside CI', () => {
    const r = run({ PATH: base, CI: '' });
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/skipping locally/i);
  });

  it('runs the real check (exit 0) when lychee is present', () => {
    const r = run({ PATH: withOk, CI: 'true' });
    expect(r.code).toBe(0);
    expect(r.out).not.toMatch(/skipping locally/i);
  });

  it('propagates lychee failure even outside CI', () => {
    const r = run({ PATH: withFail, CI: '' });
    expect(r.code).not.toBe(0);
  });
});
