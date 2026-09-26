# 发布说明（作者使用）

## 第一次上传

1. 在 `ayan-atelier` 账号下创建独立公开仓库 `yantai-interface`。
2. 把本目录里的文件和子目录上传到仓库根目录。打开仓库后，应直接看到 `manifest.json`、`index.js`、`style.css`、`src` 和 `shared`，不要再套一层版本文件夹，也不要只上传 ZIP。
3. 提交说明可填 `Publish yantai-interface v0.2.2`。
4. 提交成功后，先在自己的酒馆里用 README 中的链接安装，确认显示版本 0.2.2。

这份仓库直接提供原生扩展所需文件，无需构建后才能安装；第一次发布也不依赖 Actions。

## 后续更新

- 保持仓库地址与设置键 `yantaiInterface` 不变。
- 更新 `manifest.json`、`package.json` 和 `src/app.js` 中的版本号，同时更新 README 与更新记录。
- 将验证过的完整扩展文件提交到默认分支，用户即可通过酒馆的扩展管理更新。
- 不要将其他砚台插件的文件放入此仓库，也不要把聊天记录、账号设置、API 密钥或本地运行依赖一起上传。

0.2.2 发布包的 JavaScript/CSS 与用户验收的 0.2.2 文件夹版一致；发布整理只补充文档与仓库主页字段。
