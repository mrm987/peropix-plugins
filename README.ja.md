<div align="center">

# PeroPix Plugins

**[PeroPix](https://github.com/mrm987/PeroPix3) のプラグイン一覧。**<br>
コードは作者のリポジトリに置き、ここには一覧だけがあります。

[![Check index](https://github.com/mrm987/peropix-plugins/actions/workflows/check.yml/badge.svg)](https://github.com/mrm987/peropix-plugins/actions/workflows/check.yml)
[![License](https://img.shields.io/badge/license-MIT-informational)](LICENSE)

[English](README.md) · [한국어](README.ko.md) · **日本語**

</div>

---

PeroPix はこの一覧を **プラグイン → 管理 → プラグイン一覧** に表示します。各項目は作者の GitHub リポジトリの
タグひとつを指し、アプリはそのタグを zip で取得して自分の `plugins/` フォルダに置きます。ここへコピーされる
ものはないので、ライセンス・Issue・リリース周期はすべて作者のものです。ComfyUI のカスタムノードを公開した
ことがあれば、同じ仕組みです: コードは自分のリポジトリに、一覧には項目をひとつ。

- **一覧だけ** — `index.json` がレジストリのすべてで、ここへの PR は項目をひとつ変えるものです。
- **インストールはアプリでユーザーが押したときだけ** — 押す前には何も取得も更新もしません。
- **権限はアプリと同じ** — プラグインはアプリと同じ権限で動きます。プラグインの動作は作者の責任で、
  入れるかどうかはユーザーの判断です。

## プラグインを公開する

1. **リポジトリのルートに `plugin.json` を置き**、GitHub に push します。フォルダ構成は
   [プラグインを作る](#プラグインを作る) を見てください。

2. **タグを付けます。** 例: `git tag v1.0.0 && git push --tags`。アプリは
   `https://github.com/<owner>/<repo>/archive/refs/tags/<tag>.zip` を取得します。リポジトリから読むのはそれ
   だけです。バージョンを上げるたびに新しいタグを付けます。

3. **[`index.json`](index.json) に項目をひとつ追加する PR を開きます。**

   ```json
   {
     "id": "my-plugin",
     "repo": "owner/my-plugin",
     "tag": "v1.0.0",
     "name": "My plugin",
     "description": "何をするかを一行で"
   }
   ```

   | フィールド | 必須 | 説明 |
   |---|---|---|
   | `id` | はい | `plugin.json` の `id` と同じで、一覧の中で一意であること。小文字・数字・`-`・`_`。 |
   | `repo` | はい | GitHub の `owner/repository`。 |
   | `tag` | はい | インストールする git タグ。 |
   | `name` | はい | アプリに表示される名前。 |
   | `description` | いいえ | 名前の下に表示される一行。 |
   | `version` | いいえ | 省略するとタグから先頭の `v` を除いた値。インストール済みより高いとアプリが更新を提案します。 |
   | `sha256` | いいえ | 書くと、アプリが取得した zip と照合します。 |

   CI がそのタグの `plugin.json` を取得し、`id` が項目と一致するかを確認します。コードは見ません。
   チェックが通れば統合され、ユーザーが次に管理タブを開いたとき一覧に現れます。

   **id と名前は一意です。** アプリに同梱の公式プラグインと同じ id・名前、すでに一覧にある id・名前は
   拒否されます。一度登録した id はそのリポジトリに結び付きます。別のリポジトリへ移す PR は元の作者だけが出せます。

**新しいバージョンを出す**のも同じです。新しいタグを付け、`tag`(書いたなら `version` も)を変える PR を開きます。

**一覧から下ろす**には項目を削除する PR を開きます。すでにインストールしたユーザーの分はそのまま残ります。

## プラグインを作る

プラグインはフォルダひとつです。アプリの `plugins/<id>/` に置くと(管理タブのフォルダボタンがその場所を開きます)
次回起動時に読み込まれます。リポジトリのルートがそのフォルダです。タグからインストールするとき、アプリは
アーカイブの最上位フォルダ一段を外して置きます。

```
my-plugin/
  plugin.json        必須
  server.py          任意  FastAPI の `router` を公開すると /plug/<id>/… にマウントされます
  web/index.html     任意  キャンバス — プラグインモードのタブひとつ
  ext/main.js        任意  アプリのページ内で動く JS (ボタン・メニューの追加)
  requirements.txt   任意  インストール時にアプリの Python で `_lib/` に pip インストールされます
```

`plugin.json`:

```json
{
  "id": "my-plugin",
  "name": "My plugin",
  "version": "1.0.0",
  "description": "何をするかを一行で",
  "server": "server.py",
  "web": "web",
  "ext": ["ext/main.js"],
  "contributes": {
    "buttons": [{ "slot": "generate.footer", "label": "開く", "do": "openCanvas" }]
  }
}
```

- `id` はフォルダ名と同じでなければなりません。
- **Python** (`server.py`): フォルダ内の他のファイルはパッケージとして import します(`from . import x`)。
  アプリ自身のモジュールもそのまま import できます。アプリに何かをさせるには `from plugins import host` の
  あと `await host.action("<アクション>", {...})`。アクション名と引数は `GET /api/agent/tools` が返すものと同じです。
- **共通アセット** — アプリがプラグインと同じオリジンで 2 つを配信します。ページの head に 2 行入れるだけです:
  ```html
  <link rel="stylesheet" href="/plug/_app/base.css">
  <script src="/plug/_app/peropix.js"></script>
  ```
  `base.css` はクラスなしでも `<button>`・`<input>`・`<table>` をアプリの見た目にし、アプリのテーマに追従します。
  `peropix.js` は `peropix.action(...)`・`state()`・`toast()`・`theme()`・`onTheme()`・`openCanvas()` を提供します。
  アプリ外(ただのブラウザ)で開くと `peropix.inApp` が false になり、アプリ呼び出しは静かに失敗します。
- **キャンバス** (`web/`): アプリのバックエンドが配信するので、ページからバックエンド API を直接呼べます。
  アプリに何かをさせるには親ウィンドウへメッセージを送ります:
  `parent.postMessage({ type: "peropix", id: 1, call: "action", name: "<アクション>", args: {...} }, "*")`
  返事は `{ type: "peropix", id: 1, ok, result | error }` です。`call` は `action`・`state`・`openCanvas`・
  `toast`・`theme`・`t`・`plugin` のいずれかです。背景色はページ側で決めます — 塗らなければアプリのキャンバス背景がテーマどおりに
  透け、塗るなら `theme("--panel")` などでアプリの色を受け取ってテーマに追従させても、一色に固定しても自由です (文字色は自分で塗ってください)。
  `plugin.json` の `canvas: { width, height, minWidth, minHeight, fit }` がキャンバスフレームの初期・最小サイズと合わせ方です。
  `fit` は `"flow"`(既定: フレームは本物のブラウザウィンドウ — 文字は元の大きさ、広げるとページが流れ直す) か `"scale"`(設計幅の
  ページをフレーム幅に合わせて CSS で拡大縮小、文字がにじむので固定ボード向け)。省略すると flow の 720×480 です。
  フレームを広げたときコンテンツも広がるように、ページ幅に上限(max-width)を置かず `width: 100%` にしてください。
  テーマが変わるとアプリがキャンバスに `{ type: "peropix", event: "theme", theme: "dark" | "light" }` を送るので、
  追従したければそのとき `theme("--panel")` などを取り直して塗ってください (`theme` を名前なしで呼ぶと今のテーマ名)。
  コンテンツは意図した色で塗り、その外だけ透明にしておくのが最も単純です (カメラプラグインがそうしています)。
- **拡張** (`ext/*.js`): `window.peropix.registerExtension({ name, setup(api) })` から始めます。`api` には
  `addButton("generate.footer" | "nav.right", { label, icon, onClick })`,
  `addMenuItem("image.send", { label, onClick(img) })`, `action(name, args)`, `state()`, `openCanvas(id)`,
  `theme(name)`, `toast(text)` があります。
- **コードなしのボタン**: `contributes.buttons` がスロットにボタンを追加します。`do` は `"openCanvas"` か
  `{ "action": "<アクション>", "args": {...} }` です。
- 動く例: アプリのリポジトリの [`plugins-official/camera`](https://github.com/mrm987/PeroPix3/tree/master/plugins-official/camera)
  (キャンバスだけのプラグイン)。

インストール・削除・フォルダへの直接配置は、アプリを再起動すると反映されます。必要なときは管理タブに再起動ボタンが出ます。

## ライセンス

このリポジトリ(一覧とチェックスクリプト)は [MIT](LICENSE) です。各プラグインのライセンスは作者が自分のリポジトリで定めます。
