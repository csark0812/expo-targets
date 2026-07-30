# Example app icon brand kit

Shared mark for the thin `examples/*` hosts: concentric **target** + **extension slot**.

Each package gets the same geometry with a distinct accent so apps are recognizable on a simulator home screen.

| Package       | Accent    |
| ------------- | --------- |
| share         | `#2DD4BF` |
| action        | `#F59E0B` |
| clip          | `#38BDF8` |
| messages      | `#4ADE80` |
| stickers      | `#FB7185` |
| widgets       | `#A3A3A3` |
| kitchen-sink  | `#FBBF24` |
| native/share  | `#14B8A6` |
| native/action | `#D97706` |
| native/clip   | `#0EA5E9` |

## Regenerate

```bash
python3 -m venv /tmp/icon-venv
/tmp/icon-venv/bin/pip install Pillow
/tmp/icon-venv/bin/python examples/_brand/render_icons.py
```

Writes `icon.png`, `adaptive-icon.png`, and `splash-icon.png` into each package’s `assets/`, plus the stickers `targetIcon`. Re-run `npx expo prebuild` (or clean) before expecting native `AppIcon` catalogs to pick up changes.
