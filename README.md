<div align="center">

# PeroPix Plugins

**The plugin list for [PeroPix](https://github.com/mrm987/PeroPix3).**<br>
Your code stays in your repository. This repository holds only the list.

[![Check index](https://github.com/mrm987/peropix-plugins/actions/workflows/check.yml/badge.svg)](https://github.com/mrm987/peropix-plugins/actions/workflows/check.yml)
[![License](https://img.shields.io/badge/license-MIT-informational)](LICENSE)

**English** · [한국어](README.ko.md) · [日本語](README.ja.md)

</div>

---

PeroPix shows this list in **Plugins → Manage → Plugin list**. Each entry points at a tag in
the author's own GitHub repository; the app downloads that tag as a zip and drops it into
its `plugins/` folder. Nothing is copied here, so your license, your issues, and your
release cycle stay yours. If you have published a ComfyUI custom node, this is the same
idea: code in your repo, an entry in the list.

- **Only a list** — `index.json` is the whole registry. Pull requests here change one entry.
- **Only the app installs** — nothing is fetched or updated until a user clicks Install.
- **Full access** — a plugin runs with the same access as the app. What it does is the
  author's responsibility, and installing it is the user's decision.

## Publishing a plugin

1. **Put `plugin.json` at the root of your repository** and push it to GitHub. The layout
   is described under [Writing a plugin](#writing-a-plugin).

2. **Push a tag.** For example `git tag v1.0.0 && git push --tags`. The app downloads
   `https://github.com/<owner>/<repo>/archive/refs/tags/<tag>.zip` — nothing else is read
   from your repository. Push a new tag for every new version.

3. **Open a pull request that adds one entry to [`index.json`](index.json).**

   ```json
   {
     "id": "my-plugin",
     "repo": "owner/my-plugin",
     "tag": "v1.0.0",
     "name": "My plugin",
     "description": "One line about what it does"
   }
   ```

   | Field | Required | Notes |
   |---|---|---|
   | `id` | yes | Must equal the `id` in your `plugin.json` and be unique in the list. Lowercase letters, digits, `-`, `_`. |
   | `repo` | yes | `owner/repository` on GitHub. |
   | `tag` | yes | The git tag to install. |
   | `name` | yes | Shown in the app. |
   | `description` | no | One line, shown under the name. |
   | `version` | no | Defaults to the tag without a leading `v`. The app offers an update when this is higher than the installed version. |
   | `sha256` | no | If present, the app compares it against the downloaded zip. |

   CI fetches `plugin.json` from that tag and checks that its `id` matches the entry. It does
   not review your code. When the check is green the entry is merged and appears in the app
   the next time a user opens the Manage tab.

   **`official` is not yours to set.** It is the flag the app uses to draw the "official" badge, so only the
   PeroPix team adds it. CI rejects a pull request that contains it.

   **Ids and names are unique.** An id or name that is already in the list is rejected. Once
   registered, an id is bound to its repository: only the original author can move it to
   another repository.

**Releasing a new version** is the same: push a new tag, then open a pull request that
changes `tag` (and `version`, if you set it).

**Taking a plugin down** is a pull request that removes the entry. Users who already
installed it keep their copy.

## Writing a plugin

A plugin is a folder. Drop it into the app's `plugins/<id>/` folder (the folder button on the
Manage tab opens it) and it is loaded on the next start. Your repository root *is* that
folder — when installing from a tag, the app strips the single top-level folder of the
archive.

```
my-plugin/
  plugin.json        required
  server.py          optional  exports a FastAPI `router`, mounted at /plug/<id>/…
  web/index.html     optional  a canvas — one tab in the Plugins mode
  ext/main.js        optional  JavaScript that runs inside the app page (buttons, menus)
  requirements.txt   optional  pip-installed into `_lib/` with the app's Python on install
  _data/             (not created by the app) what the plugin downloads — survives updates; see below
```

`plugin.json`:

```json
{
  "id": "my-plugin",
  "name": "My plugin",
  "version": "1.0.0",
  "description": "One line about what it does",
  "server": "server.py",
  "web": "web",
  "ext": ["ext/main.js"],
  "contributes": {
    "buttons": [{ "slot": "generate.footer", "label": "Open", "do": "openCanvas" }]
  }
}
```

- `id` must equal the folder name.
- **Python** (`server.py`): other files in the folder are imported as a package
  (`from . import x`). The app's own modules can be imported directly. To make the app do
  something, `from plugins import host` and `await host.action("<action>", {...})`.
  Actions and their arguments are what `GET /api/agent/tools` returns.
- **Shared assets** — the app serves two files from the same origin as your plugin. Two lines in your page's head:
  ```html
  <link rel="stylesheet" href="/plug/_app/base.css">
  <script src="/plug/_app/peropix.js"></script>
  ```
  Lay the window out with `<header>` (toolbar), `<main>` (body) and `<footer>` (status) and the page behaves like a small
  app: growing the window grows only the body, while the toolbar and status keep their height. Put anything that should fill
  the leftover room while keeping its aspect ratio (a drawing surface, a preview) in `<div class="stage">`.
  To make the window non-resizable, set `canvas: { resize: false }` in `plugin.json`; it always opens at `width`x`height`.
  `base.css` styles bare `<button>`, `<input>` and `<table>` to match the app and follows the app theme.
  `peropix.js` gives you `peropix.action(...)`, `state()`, `toast()`, `theme()`, `onTheme()` and `openCanvas()`.
  Opened outside the app (plain browser) `peropix.inApp` is false and app calls fail quietly, so you can build in Chrome.
- **Canvas** (`web/`): served from the app backend, so the page can call the backend API
  directly. To make the app do something, post a message to the parent window:
  `parent.postMessage({ type: "peropix", id: 1, call: "action", name: "<action>", args: {...} }, "*")`
  and read the reply `{ type: "peropix", id: 1, ok, result | error }`. `call` is one of
  `action`, `state`, `openCanvas`, `toast`, `theme`, `t`, `plugin`. The page owns its background: leave it unpainted and the app's
  canvas background shows through, following the theme; or paint it yourself, either from `theme("--panel")` to follow the
  theme or with one fixed color (set your own text color either way).
  `canvas: { width, height, minWidth, minHeight, fit }` in `plugin.json` sets the frame's initial and minimum size and how it
  fits: `"flow"` (default: the frame is a real browser window — text stays its natural size and the page reflows as you resize)
  or `"scale"` (the page is laid out at its design width and CSS-scaled to the frame width; text blurs, so only for fixed boards).
  Omitted: flow, 720×480. To let content grow with the frame, avoid a max-width on your page and use `width: 100%`.
  When the theme changes the app posts `{ type: "peropix", event: "theme", theme: "dark" | "light" }` to every open canvas;
  to follow it, re-read `theme("--panel")` etc. then (`theme` with no name returns the current theme name). The simplest
  layout is to paint your content in the colors you intend and leave only the outside transparent (the camera plugin does this).
- **Extension** (`ext/*.js`): starts with
  `window.peropix.registerExtension({ name, setup(api) })`. The `api` offers
  `addButton("generate.footer" | "nav.right", { label, icon, onClick })`,
  `addMenuItem("image.send", { label, onClick(img) })`, `action(name, args)`, `state()`,
  `openCanvas(id)`, `theme(name)` and `toast(text)`.
- **Buttons without code**: `contributes.buttons` adds a button to a slot; `do` is either
  `"openCanvas"` or `{ "action": "<action>", "args": {...} }`.
- Working examples: [Camera Angle](https://github.com/mrm987/peropix-plugin-camera) (canvas only) and
  [Tag Roll](https://github.com/mrm987/peropix-plugin-tag-roll) (a Python router plus a 960 MB index it downloads itself). Official plugins live in their author's repository and ship through
  this list like every other plugin — nothing is bundled with the app.

Install, remove, and drop-in all take effect after the app restarts; the Manage tab shows a
restart button when that is needed.

## What survives an update — `_data/`

Anything too large to ship in the package — an index, a model, a cache — is downloaded by the plugin
itself into `plugins/<id>/_data/`. When a new version is installed, the app moves only that folder from
the old copy into the new one. So a plugin never has to reach outside its own folder, and bumping a
version does not re-download the heavy files.

```
plugins/my-plugin/
  plugin.json          shipped in the package (replaced on update)
  server.py            〃
  _lib/                created by pip on install — reinstalled per version
  _data/               created by the plugin — carried over between versions
    model.onnx
    index/…
```

- **The plugin creates it.** The app neither creates it nor looks inside; the layout is yours.
- **Do not ship it in the package.** Folders starting with `_` are not read as plugins, and belong in
  `.gitignore` in your repository — a tag archive must not grow with them.
- **Downloading is the plugin's job.** The app does not fetch data for you: show progress, verify
  (size, hash), and offer cancel and delete in your own screen. GitHub **release assets** are a good
  host for big files (under 2 GiB each, up to 1000 per release, no total size or bandwidth limit) and
  support resuming with `Range`.
- **Removing the plugin sends `_data/` to the recycle bin with it.** If you want a "delete the data
  only" button, put it in your own screen.
- If the move fails (a file is in use), the data stays in the old folder `_old-<id>-<time>/_data/`.
- A working example: `index.py` in [Tag Roll](https://github.com/mrm987/peropix-plugin-tag-roll) — it
  downloads 13 files (960 MB) from a release, checks each sha256, and puts "Manage index" in its footer.

## License

This repository — the list and the check script — is [MIT](LICENSE). Each plugin is licensed
by its author in its own repository.
