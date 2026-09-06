// src/lib/__tests__/redirects.test.ts
import { describe, it, expect } from 'vitest';
import { validateRedirectManifest, validateGeneratedRoutes } from '../redirects';

describe('validateRedirectManifest', () => {
  it('passes for valid empty map', () => {
    expect(validateRedirectManifest({}).valid).toBe(true);
  });
  it('passes for valid single redirect', () => {
    expect(validateRedirectManifest({ '/en/articles/old/': '/en/articles/new/' }).valid).toBe(true);
  });
  it('fails when source does not start with /', () => {
    const r = validateRedirectManifest({ 'en/old/': '/en/new/' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('/');
  });
  it('fails when source equals target', () => {
    const r = validateRedirectManifest({ '/en/foo/': '/en/foo/' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('same');
  });
  it('fails on cycle A->B B->A', () => {
    const r = validateRedirectManifest({ '/en/a/': '/en/b/', '/en/b/': '/en/a/' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('cycle');
  });
  it('fails on chain A->B->C (MVP)', () => {
    const r = validateRedirectManifest({ '/en/a/': '/en/b/', '/en/b/': '/en/c/' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('chain');
  });
  it('fails when target is external domain', () => {
    const r = validateRedirectManifest({ '/old/': 'https://example.com/new/' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('external');
  });
  it('fails when trailing slash inconsistent', () => {
    const r = validateRedirectManifest({ '/en/old': '/en/new/' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('trailing');
  });
});

describe('validateGeneratedRoutes', () => {
  const routes = new Set(['/en/articles/new/', '/zh/articles/hello/', '/zh/']);
  it('passes when target exists and source does not', () => {
    expect(
      validateGeneratedRoutes({ '/en/articles/old/': '/en/articles/new/' }, routes).valid,
    ).toBe(true);
  });
  it('fails when target does not exist', () => {
    const r = validateGeneratedRoutes({ '/en/old/': '/en/nonexistent/' }, routes);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('target');
  });
  it('fails when source still exists as route', () => {
    const r = validateGeneratedRoutes({ '/zh/': '/zh/articles/hello/' }, routes);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('source');
  });
});
