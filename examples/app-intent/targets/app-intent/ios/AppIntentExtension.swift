import AppIntents

/// ExtensionKit App Intents entry — pluginkit appintents-extension proof.
/// Runnable App Shortcuts live in the main app (`ETAppShortcuts.swift`).
/// Do not declare a second ET Greet here — Shortcuts may bind the tile to the
/// appex intent and fail with "Unable to run App Shortcut".
@main
struct ETAppIntentsExtension: AppIntentsExtension {}
