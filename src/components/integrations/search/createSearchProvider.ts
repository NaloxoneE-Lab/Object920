import type { SearchProvider } from './SearchProvider';
import { PagefindProvider } from './PagefindProvider';

export function createSearchProvider(): SearchProvider | null {
  const provider = import.meta.env.PUBLIC_SEARCH_PROVIDER || 'pagefind';
  switch (provider) {
    case 'pagefind':
      return new PagefindProvider();
    // case 'orama': return new OramaProvider(); // 未来,不实现
    case 'none':
      return null;
    default:
      throw new Error(`Unknown search provider: ${provider}`);
  }
}
