import AppIntents

/// Empty AppIntentsExtension — keeps the `appintents-extension` pluginkit proof
/// and room for future out-of-process intents.
///
/// Shortcuts-listable intents + AppShortcutsProvider are CNG-generated into the
/// host app (`ios/*/ExpoTargetsGenerated/`). Perform hooks live under
/// `targets/<name>/ios/` (user-owned). Do not duplicate Shortcuts intents here.
@main
struct ETAppIntentsExtension: AppIntentsExtension {}
