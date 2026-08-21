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
- `personal/`：摄影与个人记录
- `assets/`：共享样式

## GitHub Pages

仓库设置中进入 `Settings → Pages`，选择：

- Source：`Deploy from a branch`
- Branch：`main`
- Folder：`/ (root)`

保存后等待 Pages 构建完成即可。

自定义域名使用 `wky.wang`，对应配置保存在根目录的 `CNAME` 文件中。
