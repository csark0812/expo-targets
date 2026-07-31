# Stickers example

Asset-only iMessage sticker pack (no `withTargetsMetro`). Host shows pack status for Maestro smoke.

## Devicewright host contract

`status-pack-catalog` / `text-last-payload` show the installed pack catalog
(`pack: Fun Stickers (brutus, happy, excited)`), kept in sync with
`targets/stickers/expo-target.config.json`. Asset-only packs cannot write App
Group on sticker selection — this is the honest host marker for suite bar A.

## OS path

1. Build and run on iOS
2. Messages → Stickers → Fun Stickers
