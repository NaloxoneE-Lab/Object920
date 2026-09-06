// src/components/article/ArticleImageEnhancer.ts
const LB_CLICK_KEY = '__lb_click_init__';
const BROKEN_PLACEHOLDER = '/images/image-broken.svg';

export function initArticleImageEnhancer(): void {
  if (!(window as unknown as Record<string, unknown>)[LB_CLICK_KEY]) {
    (window as unknown as Record<string, unknown>)[LB_CLICK_KEY] = true;
    document.addEventListener('click', (e) => {
      const target = e.target as Element | null;
      const img = target?.closest?.('[data-lightbox]') as HTMLImageElement | null;
      if (!img || img.tagName !== 'IMG') return;
      e.preventDefault();
      document.dispatchEvent(
        new CustomEvent('open-lightbox', {
          detail: {
            src: img.currentSrc || img.src,
            alt: img.alt,
            srcset: img.getAttribute('srcset') || undefined,
            groupId: img.getAttribute('data-lightbox-group') || 'content-images',
          },
        }),
      );
    });
  }

  const imgs = document.querySelectorAll<HTMLImageElement>(
    'img[data-article-image]:not([data-img-error-bound])',
  );
  imgs.forEach((img) => {
    img.setAttribute('data-img-error-bound', '');
    img.addEventListener('error', () => {
      if (img.src === BROKEN_PLACEHOLDER) return;
      img.src = BROKEN_PLACEHOLDER;
    });
  });
}
