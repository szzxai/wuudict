# 東吳詞典 · wuudict

「東吳詞典」（wuudict）是一个面向吴语区的在线方言词典计划，仿照 [萌典](https://www.moedict.tw) 的界面与交互方式，全站默认使用繁体字，支持繁简转换。本仓库目前上线的是第一个板块——**蘇州閑話**（苏州话词典）。

## 特性

- **词条**：收录多字词语与单字字头；多字词条显示释义，单字字头在有来源释义/备注时显示，并按读音分组列出包含该字的词语。
- **注音**：采用吳語學堂式拼音（无调拼音，苏州话），并提供苏州话 IPA 对照。
- **检索**：支持繁体字、简体字、吳語學堂拼音三种方式搜索，拼音支持无调查询。
- **字形**：全站默认繁体显示，可一键切换为简体；词条内词语中的单字可点击跳转到对应字头词条。
- **用户与信箱**：支持注册、登录、普通用户/超级管理员权限、反馈私信、未读提示、封禁与用户资料管理；词条/字头反馈附带跳转卡片。
- **在线维护**：超级管理员可在词条/字头页面编辑完整记录；原始词库保持不变，修改保存于 D1。
- **Cloudflare Workers + D1**：静态词典由 Workers Assets 提供，账户与消息由 Worker API 和 D1 持久化。

## 資料來源

詞目及拼音資料整理自吳語學堂蘇州詞典查詢結果：<https://wugniu.com/dict?word=%25&dict=suzhou_dict>。由該詞典單字面板整理的 954 個不同單字讀音與字義/備註，重複字清單見 [`docs/苏州单字重复字清单.md`](docs/苏州单字重复字清单.md)。讀音拼寫採吳語學堂式拼音，調類依來源拼音或其 IPA 可判定資料整理；不能確認時保留原始拼音，不猜補調號。

另從吳語學堂首頁的「單地查詢」字音入口（<https://wugniu.com/search?char=字&table=suzhou_zi>）批量補錄蘇州單字：對基本漢字、CJK 擴展 A–J 及兼容區等 103,072 個候選字逐批查詢，命中 576 個字頭；新增 420 個，合併去重 156 個已有字頭。此頁的吳拼/IPA 以 SVG 顯示，本次讀音依發音音頻檔名錄入，不推測 IPA；重複清單見 [`docs/苏州单地查询重复字清单.md`](docs/苏州单地查询重复字清单.md)。抓取腳本為 `tools/scrape_single_place_chars.mjs`；原始 HTML 快照位於被 `.gitignore` 排除的 `data/raw/wugniu_live/`。未編碼字符與站點私用字形映射不在本次 Unicode 候選範圍內，詳見清單。

這些詞條內容與葉祥苓《現代漢語方言大詞典·蘇州方言詞典》（江蘇教育出版社，1993）相關，但本站資料並非由所附掃描 PDF 逐頁 OCR 或逐條校勘而來，不能視為已對原書完成驗證。PDF 為掃描圖像，且不納入倉庫；引用或研究用途請以原書及吳語學堂來源為準。原始抓取快照位於被 `.gitignore` 排除的 `data/raw/`，不隨倉庫提交。要重跑字頭匯入，需先準備 `data/raw/parsed.json`，再執行 `node tools/import_single_chars.mjs --dry-run` 預覽或移除參數正式生成。

## 本地预览

只查看词典静态页面时，可运行：

```sh
python -m http.server 8080
# 或
npx serve .
```

要测试注册、登录、信箱等后端功能，请使用 Wrangler 本地 Worker 和 D1；配置 `.dev.vars` 中的 `REGISTRATION_INVITE_CODE` 与 `BOOTSTRAP_ADMIN_KEY`（该文件不要提交），再按下方本地开发命令启动。

## 部署

本项目的用户系统需要 Cloudflare Worker 和 D1，不能仅托管到 GitHub Pages。

1. 创建 D1 数据库：`npx wrangler d1 create wuu-dict-users`，并将输出的数据库 ID 填入 `wrangler.toml` 的 `database_id`（替换占位 UUID）。
2. 初始化数据库：`npx wrangler d1 migrations apply wuu-dict-users --remote`。
3. 首次部署 Worker：`npx wrangler deploy`。
4. 设置注册邀请码和一次性超级管理员初始化密钥：分别运行 `npx wrangler secret put REGISTRATION_INVITE_CODE` 与 `npx wrangler secret put BOOTSTRAP_ADMIN_KEY`，在 Wrangler 提示中输入邀请码 `wuusinuser` 与自设的随机初始化密钥。邀请码只保存在 Worker Secret，不写入前端或仓库。
5. 使用邀请码注册一个账户，再向 `POST /api/admin/bootstrap` 发送 `{ "username": "该用户名" }`，并在 `X-Bootstrap-Key` 请求头中带上初始化密钥。此接口只可成功一次；请妥善保管密钥。首次提升权限后重新登入以刷新权限。注册接口在 `REGISTRATION_INVITE_CODE` Secret 设置前会拒绝注册。

本地开发可运行 `npx wrangler d1 migrations apply wuu-dict-users --local` 和 `npx wrangler dev`；在被 `.gitignore` 排除的 `.dev.vars` 中设置 `REGISTRATION_INVITE_CODE=wuusinuser` 与自设的 `BOOTSTRAP_ADMIN_KEY`。注册邀请码由服务端验证，不在注册界面展示。

## 目录结构

```
.
├── index.html          # 单页入口
├── assets/
│   ├── app.js          # 检索、繁简转换、词条渲染逻辑
│   └── style.css       # 萌典风格样式
├── data/
│   ├── entries.js      # 词目与释义数据
│   ├── chars.js        # 单字索引（读音、释义、读音组与组词）
│   └── conv.js         # 繁简转换表
├── docs/
│   ├── 苏州单字重复字清单.md
│   └── 苏州单地查询重复字清单.md
└── tools/
    ├── import_single_chars.mjs       # 合併詞典單字面板
    ├── scrape_single_place_chars.mjs # 抓取單地查詢字音並去重合併
    └── check.mjs                     # 資料/程式檢查
```
