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
   | `name` | yes | Shown in the app. Either one string or a per-language object (`{"ko": "…", "en": "…", "ja": "…"}`). |
   | `description` | no | One line, shown under the name. |
   | `version` | no | Defaults to the tag without a leading `v`. The app offers an update when this is higher than the installed version. |
   | `sha256` | no | If present, the app compares it against the downloaded zip. |

   CI fetches `plugin.json` from that tag, checks that its `id` matches the entry, and lists
   code patterns that look risky. A person also reads the code before merging. **Passing the
   check does not mean the plugin is safe** — a plugin runs with the same permissions as the
   app, and installing it is the user's call. Once merged, the entry appears in the app the
   next time a user opens the Manage tab.

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
  <link rel="stylesheet" href="../../_app/base.css">
  <script src="../../_app/peropix.js"></script>
  ```
  Your page is served at `/plug/<id>/web/`, so that relative path points at the shared folder — count the `../`
  again if your page sits deeper. An absolute path (`/plug/_app/…`) works on recent app versions too, but the
  relative form is safe on every version.
  Lay the window out with `<header>` (toolbar), `<main>` (body) and `<footer>` (status) and the page behaves like a small
  app: growing the window grows only the body, while the toolbar and status keep their height. Put anything that should fill
  the leftover room while keeping its aspect ratio (a drawing surface, a preview) in `<div class="stage">`.
  To make the window non-resizable, set `canvas: { resize: false }` in `plugin.json`; it always opens at `width`x`height`.
  `base.css` styles bare `<button>`, `<input>` and `<table>` to match the app and follows the app theme.
  **Font and text size match too** — the app serves its bundled fonts from the same place and `peropix.js` applies the font and
  text size the user picked in settings (changing either updates your page without a reload). The size multiplies the `--text-*`
  tokens, so if you use them there is nothing for you to do.
  `peropix.js` gives you `peropix.action(...)`, `state()`, `scene()`, `toast()`, `theme()`, `onTheme()`, `locale()`,
  `onLocale()` and `openCanvas()`.
  Opened outside the app (plain browser) `peropix.inApp` is false and app calls fail quietly, so you can build in Chrome.
- **Canvas** (`web/`): served from the app backend, so the page can call the backend API
  directly. To make the app do something, post a message to the parent window:
  `parent.postMessage({ type: "peropix", id: 1, call: "action", name: "<action>", args: {...} }, "*")`
  and read the reply `{ type: "peropix", id: 1, ok, result | error }`. `call` is one of
  `action`, `state`, `scene`, `openCanvas`, `toast`, `theme`, `t`, `locale`, `plugin`. The page owns its background: leave it unpainted and the app's
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
  `addButton("generate.primary" | "generate.footer" | "nav.right", { label, icon, onClick })`,
  `addMenuItem("image.send", { label, onClick(img) })`, `action(name, args)`, `state()`,
  `scene()`, `locale()`, `openCanvas(id)`, `theme(name)` and `toast(text)`.
- **Button slots** — `generate.primary` sits **next to the Generate button** and splits that row with it
  (same shape, half the width; the row is unchanged when no plugin uses it). `generate.footer` is the line
  under it, and `nav.right` is the end of the bottom mode bar.
- **The scene you see**: `scene()` returns the live blocks of the current scene — `{ base, chars }`, each block with an `id`.
  Use it, not `action("get_workspace")`, when you write blocks and read them back: `get_workspace` reads the **saved file**,
  so it does not know what you just changed.
- **Languages are up to you**: `locale()` returns the app language (`"ko"`, `"en"`, `"ja"`) and `onLocale(fn)` fires when the
  user changes it; a canvas also receives `{ type: "peropix", event: "locale", locale }`. The app imposes no dictionary format —
  translate as you like, or ship one language. (The official plugins carry all three. A simple way: use your own wording as the
  key, keep a table for the other languages, and redraw on `onLocale`.) In `plugin.json` the `name`, `description` and a button's `label` may each be
  either one string or a per-language object (`{ "ko": "…", "en": "…", "ja": "…" }`); the app picks the one for its language and
  falls back to English, then Korean. That is what the plugin list, the canvas title and the button show.
- **Buttons without code**: `contributes.buttons` adds a button to a slot; `do` is either
  `"openCanvas"` or `{ "action": "<action>", "args": {...} }`.
- Working examples: [Camera Angle](https://github.com/mrm987/peropix-plugin-camera) (canvas only) and
  [Tag Roll](https://github.com/mrm987/peropix-plugin-tag-roll) (a Python router plus a 960 MB index it downloads itself). Official plugins live in their author's repository and ship through
  this list like every other plugin — nothing is bundled with the app.

Install, remove, and drop-in all take effect after the app restarts; the Manage tab shows a
restart button when that is needed.

## What survives an update

The app records the files it installed in `_files.json` and touches only those. On update it writes the
files that changed, deletes the ones the new version dropped, and leaves everything else alone — so
**whatever your plugin created stays put, wherever you put it and whatever you named it.**

- **No folder name is required.** Anything too large to ship in the package — an index, a model, a cache —
  is downloaded by the plugin into its own folder, and the app neither creates that place nor looks inside.
- **Do not ship downloads in the package.** A tag archive must not grow with them — keep them out with
  `.gitignore`. (Two names are the app's: `_files.json` and `_lib/`. Leave those to it.)
- **Downloading is the plugin's job.** The app does not fetch data for you: show progress, verify
  (size, hash), and offer cancel and delete in your own screen. GitHub **release assets** are a good
  host for big files (under 2 GiB each, up to 1000 per release, no total size or bandwidth limit) and
  support resuming with `Range`.
- **Removing the plugin deletes the whole folder**, downloads included, and it does not go through the
  recycle bin. If you want a "delete the data only" button, put it in your own screen.
- **`_lib/` is replaced when `requirements.txt` changes**, not on every update.
- If a file cannot be replaced because it is in use, the install stops and reports which ones. Restart the
  app and try again — it picks up where it left off.
- A working example: `index.py` in [Tag Roll](https://github.com/mrm987/peropix-plugin-tag-roll) — it
  downloads 13 files (960 MB) from a release and checks each sha256, showing a gate screen until they are there.

## License

This repository — the list and the check script — is [MIT](LICENSE). Each plugin is licensed
by its author in its own repository.
