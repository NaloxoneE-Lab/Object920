// public/admin/index.js — Sveltia CMS 自定义预览模板
// 依赖 Sveltia 注入的全局:CMS / createClass / h(Decap 兼容的 React 组件模型,无 JSX)
// 仅使用官方文档化的 props:entry / widgetFor / widgetsFor / getAsset
// entry.data 跟随当前编辑的语言版本,zh/en 共用同一模板

const STATUS_ZH = {
  ongoing: '进行中',
  completed: '已完成',
  archived: '已归档',
  planned: '计划中',
};

const dateOnly = (value) => (value ? String(value).slice(0, 10) : '');
const text = (data, key) => data.get(key) || '';
const list = (data, key) => (data.get(key) ? data.get(key).toJS() : []);
// getAsset 把媒体路径解析成 blob URL(本地刚选、未上传的图也能预览);缺失时返回 undefined
const assetUrl = (getAsset, path) => {
  if (!path) return null;
  const asset = getAsset(path);
  return asset && asset.url ? asset.url : null;
};

/* === 文章预览:对应主站 ArticleLayout(标题 → 日期 → prose 正文)=== */
const ArticlePreview = createClass({
  render: function () {
    const { entry, widgetFor, getAsset } = this.props;
    const data = entry.get('data');
    const coverUrl = assetUrl(getAsset, data.get('cover'));
    const tags = list(data, 'tags');

    return h(
      'div',
      { className: 'preview-page is-article' },
      data.get('draft') && h('span', { className: 'draft-badge' }, '草稿'),
      coverUrl && h('img', { className: 'cover', src: coverUrl, alt: text(data, 'coverAlt') }),
      h(
        'p',
        { className: 'meta-line' },
        `${dateOnly(data.get('pubDate'))} · ${text(data, 'category')}`,
      ),
      h('h1', { className: 'page-title' }, text(data, 'title')),
      tags.length > 0 &&
        h(
          'ul',
          { className: 'tag-list' },
          tags.map((tag) => h('li', { className: 'tag' }, tag)),
        ),
      h('div', { className: 'prose' }, widgetFor('body')),
    );
  },
});

/* === 工程预览:对应主站 ProjectLayout(标题 → 正文 → 图廊 → 规格 → 数据手册 → 相关链接)=== */
const ProjectPreview = createClass({
  render: function () {
    const { entry, widgetFor, widgetsFor, getAsset } = this.props;
    const data = entry.get('data');
    const status = text(data, 'status');
    const coverUrl = assetUrl(getAsset, data.get('cover'));
    const gallery = widgetsFor('gallery');
    const specs = widgetsFor('specs');
    const datasheets = widgetsFor('datasheets');
    const relatedLinks = list(data, 'relatedLinks');

    return h(
      'div',
      { className: 'preview-page is-project' },
      data.get('draft') && h('span', { className: 'draft-badge' }, '草稿'),
      coverUrl && h('img', { className: 'cover', src: coverUrl, alt: text(data, 'coverAlt') }),
      h('p', { className: 'meta-line' }, dateOnly(data.get('pubDate'))),
      h('h1', { className: 'page-title' }, text(data, 'title')),
      h(
        'p',
        { className: 'meta-line' },
        h('span', { className: 'chip chip-accent' }, text(data, 'category')),
        h('span', { className: 'chip' }, STATUS_ZH[status] || status),
      ),
      h('div', { className: 'prose' }, widgetFor('body')),
      gallery.length > 0 &&
        h(
          'div',
          { className: 'gallery' },
          gallery.map((item) => {
            const path = item.getIn(['data', 'image']);
            const url = assetUrl(getAsset, path);
            return h(
              'figure',
              { className: 'gallery-item', key: path },
              url && h('img', { src: url, alt: item.getIn(['data', 'alt']) || '' }),
              h('figcaption', null, item.getIn(['data', 'caption'])),
            );
          }),
        ),
      specs.length > 0 &&
        h(
          'table',
          { className: 'spec-table' },
          h(
            'tbody',
            null,
            specs.map((item) =>
              h(
                'tr',
                { key: item.getIn(['data', 'label']) },
                h('th', null, item.getIn(['data', 'label'])),
                h('td', null, item.getIn(['data', 'value'])),
              ),
            ),
          ),
        ),
      datasheets.length > 0 &&
        h(
          'ul',
          { className: 'datasheet-list' },
          datasheets.map((item) =>
            h(
              'li',
              { key: item.getIn(['data', 'filename']) },
              h('span', { className: 'ds-name' }, item.getIn(['data', 'name'])),
              ' ',
              h('code', null, item.getIn(['data', 'filename'])),
              item.getIn(['data', 'size']) &&
                h('span', { className: 'ds-size' }, ` · ${item.getIn(['data', 'size'])}`),
            ),
          ),
        ),
      relatedLinks.length > 0 &&
        h(
          'div',
          { className: 'related-links' },
          h('h2', null, '相关链接'),
          h(
            'ul',
            null,
            relatedLinks.map((link) =>
              h(
                'li',
                { key: link.get('url') },
                h('a', { href: link.get('url') }, link.get('label')),
              ),
            ),
          ),
        ),
    );
  },
});

CMS.registerPreviewStyle('/admin/preview.css');
CMS.registerPreviewTemplate('articles', ArticlePreview);
CMS.registerPreviewTemplate('projects', ProjectPreview);
