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

   **Ids and names are unique.** An id or name that belongs to a plugin bundled with the app,
   or that is already in the list, is rejected. Once registered, an id is bound to its
   repository: only the original author can move it to another repository.

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
- **Canvas** (`web/`): served from the app backend, so the page can call the backend API
  directly. To make the app do something, post a message to the parent window:
  `parent.postMessage({ type: "peropix", id: 1, call: "action", name: "<action>", args: {...} }, "*")`
  and read the reply `{ type: "peropix", id: 1, ok, result | error }`. `call` is one of
  `action`, `state`, `openCanvas`, `toast`, `theme`, `t`, `plugin`.
- **Extension** (`ext/*.js`): starts with
  `window.peropix.registerExtension({ name, setup(api) })`. The `api` offers
  `addButton("generate.footer" | "nav.right", { label, icon, onClick })`,
  `addMenuItem("image.send", { label, onClick(img) })`, `action(name, args)`, `state()`,
  `openCanvas(id)`, `theme(name)` and `toast(text)`.
- **Buttons without code**: `contributes.buttons` adds a button to a slot; `do` is either
  `"openCanvas"` or `{ "action": "<action>", "args": {...} }`.
- A working example: [`plugins-official/camera`](https://github.com/mrm987/PeroPix3/tree/master/plugins-official/camera)
  in the app repository — a canvas-only plugin.

Install, remove, and drop-in all take effect after the app restarts; the Manage tab shows a
restart button when that is needed.

## License

This repository — the list and the check script — is [MIT](LICENSE). Each plugin is licensed
by its author in its own repository.
