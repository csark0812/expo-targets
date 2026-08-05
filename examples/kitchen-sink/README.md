# Kitchen Sink example

Five targets in one host sharing `group.com.expotargets.example.kitchensink`: ks-share, ks-action, ks-clip, ks-widgets, ks-messages.

Stickers are intentionally omitted: iOS allows only one `com.apple.message-payload-provider` extension per app, so messages and stickers cannot coexist. Use [`examples/stickers`](../stickers) for the stickers path.

Devicewright journeys live under `examples/.devicewright/` (kitchen-sink rows when present).

## OS path

Build once, exercise each section from the host or via the corresponding extension.
