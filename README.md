# wky-cv-web

王匡义的静态个人作品集，包含首页、面试自我介绍时间线、项目详情页与独立个人展示页。

## 本地预览

可以直接打开 `index.html`，也可以在项目根目录启动静态服务器：

```powershell
python -m http.server 8000
```

然后访问 `http://localhost:8000/`。

## 页面结构

- `index.html`：作品集首页
- `timeline/`：纵向可视化履历，用于面试自我介绍
- `projects/`：项目详情页
- `projects/netease/`：网易实习，涵盖 Text2SQL、Agent Eval、Code Review、APM Platform 等工作
- `projects/text2sql/`：旧网址兼容入口，自动跳转至 `projects/netease/`；启用 JavaScript 时保留查询参数与章节锚点
- `personal/`：摄影与个人记录
- `assets/`：共享样式

## GitHub Pages

仓库设置中进入 `Settings → Pages`，选择：

- Source：`Deploy from a branch`
- Branch：`main`
- Folder：`/ (root)`

保存后等待 Pages 构建完成即可。

自定义域名使用 `wky.wang`，对应配置保存在根目录的 `CNAME` 文件中。

## 网站图标

全站使用深蓝底、米白 W 字母图标。`favicon.svg` 用于支持 SVG 的浏览器，
`favicon.ico` 和 16/32 像素 PNG 用作兼容图标，`apple-touch-icon.png` 用于手机主屏幕收藏。
大尺寸预览位于 `assets/wky-icon.png`。所有页面使用相对路径，支持本地预览和 GitHub Pages 子目录。

如需调整图形或配色，修改 `scripts/build-favicons.py` 后重新生成（需要 Pillow）：

```powershell
python scripts/build-favicons.py
```

更新图标后，同时更新各页面图标链接的 `v` 参数，帮助浏览器刷新缓存。
