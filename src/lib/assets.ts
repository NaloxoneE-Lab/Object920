// src/lib/assets.ts
export interface Datasheet {
  name: string;
  filename: string;
  ref?: string;
  size?: string;
  mirror: Array<'jsdelivr' | 'raw' | 'release'>;
  releaseTag?: string;
}

export interface DownloadUrl {
  mirror: string;
  url: string;
}

/**
 * assets 仓库账户信息:优先 process.env(脚本/Vitest 场景),
 * 其次 import.meta.env(Astro 构建期注入 .env),与 spec 附录 C 一致。
 */
function assetsOwner(): { user: string; repo: string } {
  const env =
    typeof import.meta !== 'undefined' && 'env' in import.meta
      ? (import.meta.env as Record<string, string | undefined>)
      : {};
  const user = process.env.PUBLIC_ASSETS_USER ?? env.PUBLIC_ASSETS_USER ?? 'YourUser';
  const repo = process.env.PUBLIC_ASSETS_REPO ?? env.PUBLIC_ASSETS_REPO ?? 'object920-assets';
  return { user, repo };
}

export function buildDownloadUrls(datasheet: Datasheet): DownloadUrl[] {
  const { user, repo } = assetsOwner();
  const ref = datasheet.ref ?? 'main';
  // spec 7.5 仓库结构约定:jsDelivr/raw 走 datasheets/ 目录;Release 资产在仓库根
  // CMS 侧 filename 只填文件名,目录前缀由这里统一承担
  const repoPath = `datasheets/${datasheet.filename}`;

  return datasheet.mirror.map((m) => {
    let url: string;
    switch (m) {
      case 'jsdelivr':
        url = `https://cdn.jsdelivr.net/gh/${user}/${repo}@${ref}/${repoPath}`;
        break;
      case 'raw':
        url = `https://raw.githubusercontent.com/${user}/${repo}/${ref}/${repoPath}`;
        break;
      case 'release':
        if (!datasheet.releaseTag) {
          throw new Error(`releaseTag required for release mirror: ${datasheet.filename}`);
        }
        url = `https://github.com/${user}/${repo}/releases/download/${datasheet.releaseTag}/${datasheet.filename}`;
        break;
    }
    return { mirror: m, url };
  });
}
