// src/lib/og.ts
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const OG_TEMPLATE_VERSION = '1';
export const OG_FONT_VERSION = '1';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = resolve(__dirname, '..', '..', 'public', 'fonts', 'og');

export interface OgEntryInfo {
  title: string;
  description: string;
  locale: string;
  collection: string;
  slug: string;
  siteName: string;
}

export function computeOgHash(
  title: string,
  description: string,
  locale: string,
  collection: string,
  slug: string,
): string {
  const input = `${title}|${description}|${locale}|${collection}|${slug}|${OG_TEMPLATE_VERSION}|${OG_FONT_VERSION}`;
  return createHash('sha1').update(input, 'utf-8').digest('hex');
}

export interface OgFont {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: 'normal';
  lang: string;
}

export function loadOgFonts(locale: string): OgFont[] {
  const fonts: OgFont[] = [];
  const interRegular = tryReadFont(resolve(FONTS_DIR, 'Inter-Regular.ttf'));
  if (interRegular)
    fonts.push({ name: 'Inter', data: interRegular, weight: 400, style: 'normal', lang: 'en' });
  const interBold = tryReadFont(resolve(FONTS_DIR, 'Inter-Bold.ttf'));
  if (interBold)
    fonts.push({ name: 'Inter', data: interBold, weight: 700, style: 'normal', lang: 'en' });
  if (locale === 'zh' || locale === 'ja') {
    const cjk = tryReadFont(resolve(FONTS_DIR, 'NotoSansSC-Regular.ttf'));
    if (cjk)
      fonts.push({ name: 'NotoSansSC', data: cjk, weight: 400, style: 'normal', lang: locale });
  }
  return fonts;
}

function tryReadFont(path: string): Buffer | null {
  try {
    return readFileSync(path);
  } catch {
    console.warn(`[og] font not found: ${path}`);
    return null;
  }
}

export function buildOgElementTree(info: OgEntryInfo): Record<string, unknown> {
  return {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#0f172a',
        color: '#f1f5f9',
        padding: '60px',
        fontFamily: 'Inter, NotoSansSC, sans-serif',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { fontSize: '28px', fontWeight: 400, opacity: 0.7 },
            children: info.siteName,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              flex: 1,
              justifyContent: 'center',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: { fontSize: '52px', fontWeight: 700, lineHeight: 1.3 },
                  children: info.title,
                },
              },
              {
                type: 'div',
                props: {
                  style: { fontSize: '28px', fontWeight: 400, opacity: 0.8, lineHeight: 1.5 },
                  children: info.description.slice(0, 120),
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', justifyContent: 'flex-end', fontSize: '24px', opacity: 0.6 },
            children: info.locale.toUpperCase(),
          },
        },
      ],
    },
  };
}

export async function renderOgImage(
  elementTree: Record<string, unknown>,
  fonts: OgFont[],
): Promise<Buffer> {
  const satori = (await import('satori')).default;
  const { Resvg } = await import('@resvg/resvg-js');
  const svg = await satori(elementTree as never, {
    width: 1200,
    height: 630,
    fonts: fonts as never,
  });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  return Buffer.from(resvg.render().asPng());
}
