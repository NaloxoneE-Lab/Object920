// src/components/article/CodeBlockEnhancer.ts
const CB_KEY = '__cb_init__';

export function initCodeBlockEnhancer(): void {
  if ((window as unknown as Record<string, unknown>)[CB_KEY]) return;
  (window as unknown as Record<string, unknown>)[CB_KEY] = true;
  document.addEventListener('click', (e) => {
    const target = e.target as Element | null;
    const btn = target?.closest?.('[data-copy-button]') as HTMLButtonElement | null;
    if (!btn) return;
    const block = btn.closest('[data-code-block]');
    const code = block?.querySelector('code');
    const text = code?.textContent ?? btn.getAttribute('data-code') ?? '';
    const live = document.getElementById('copy-live');
    const done = () => {
      if (live) {
        live.textContent = '已复制';
        window.setTimeout(() => {
          live.textContent = '';
        }, 1500);
      }
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(done)
        .catch(() => {});
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        done();
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
  });
}
