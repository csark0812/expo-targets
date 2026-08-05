/** One-shot Live Activity UI bootstrap (user-owned under targets/<name>/ios/). */
export function getLiveActivityUiTemplate(options: {
  attributesName: string;
  widgetName: string;
}): string {
  const { attributesName, widgetName } = options;
  return `import ActivityKit
import SwiftUI
import WidgetKit

/// User-owned Live Activity UI — safe to edit; prebuild will not overwrite.
/// Attributes type \`${attributesName}\` is CNG-generated into ios/*/ExpoTargetsGenerated/.
struct ${widgetName}LiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: ${attributesName}.self) { context in
      VStack(alignment: .leading, spacing: 4) {
        Text("Live Activity")
          .font(.headline)
        // Customize with context.attributes / context.state fields from config
      }
      .padding()
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.center) {
          Text("Live Activity")
        }
      } compactLeading: {
        Image(systemName: "circle.fill")
      } compactTrailing: {
        Text("…")
          .font(.caption2)
      } minimal: {
        Image(systemName: "circle.fill")
      }
    }
  }
}
`;
}

export function getWidgetBundleTemplate(options: {
  pascalName: string;
  includeLiveActivity: boolean;
}): string {
  const { pascalName, includeLiveActivity } = options;
  const liveLine = includeLiveActivity
    ? `\n    ${pascalName}LiveActivity()`
    : '';
  return `
@main
struct ${pascalName}Bundle: WidgetBundle {
  var body: some Widget {
    ${pascalName}()${liveLine}
  }
}
`;
}

export function getPerformHookStub(
  hookName: string,
  intentTitle: string,
  appGroup: string
): string {
  return `import Foundation

/// User-owned App Intent perform hook — safe to edit; prebuild will not overwrite.
enum ${hookName} {
  private static let appGroupId = "${appGroup}"

  static func perform() async throws {
    // TODO: implement "${intentTitle}"
    _ = UserDefaults(suiteName: appGroupId)
  }
}
`;
}
