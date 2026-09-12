// deploy/cf-relay/worker.js
// Object920 部署中继:GitHub Actions 上传产物,R2 存储,ECS 轮询拉取。
// 全程只依赖 Cloudflare,不需要入站 SSH(海外 → 阿里云 22 端口不可达)。
//
// 绑定:R2 桶 → 变量名 DEPLOY_BUCKET;Secret:DEPLOY_TOKEN
// 路由:
//   PUT /dist.tgz   上传部署包(CI,先传)
//   PUT /version    写入版本标记(CI,后写;轮询端见新标记即拉取)
//   GET /dist.tgz   下载部署包(ECS)
//   GET /version    读取版本标记(ECS)
// 其余一律 404。所有请求需 Authorization: Bearer <DEPLOY_TOKEN>。

const VERSION_KEY = 'version';
const DIST_KEY = 'dist.tgz';

export default {
  async fetch(request, env) {
    const auth = request.headers.get('Authorization') || '';
    if (auth !== `Bearer ${env.DEPLOY_TOKEN}`) {
      return new Response('unauthorized\n', { status: 401 });
    }

    const key = new URL(request.url).pathname.replace(/^\/+/, '');
    if (key !== DIST_KEY && key !== VERSION_KEY) {
      return new Response('not found\n', { status: 404 });
    }

    if (request.method === 'PUT') {
      // 版本标记必须在部署包存在之后才能写入,保证轮询端看到新标记时载荷已就绪
      if (key === VERSION_KEY && (await env.DEPLOY_BUCKET.head(DIST_KEY)) === null) {
        return new Response('conflict: upload dist.tgz first\n', { status: 409 });
      }
      const body = await request.arrayBuffer();
      await env.DEPLOY_BUCKET.put(key, body);
      return new Response('ok\n');
    }

    if (request.method === 'GET') {
      const obj = await env.DEPLOY_BUCKET.get(key);
      if (obj === null) return new Response('not found\n', { status: 404 });
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set('etag', obj.httpEtag);
      headers.set('content-type', key === VERSION_KEY ? 'text/plain' : 'application/octet-stream');
      return new Response(obj.body, { headers });
    }

    return new Response('method not allowed\n', { status: 405 });
  },
};
