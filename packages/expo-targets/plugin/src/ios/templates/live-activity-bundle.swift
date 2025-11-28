// Live Activity Widget Bundle
// Main entry point for your Live Activity widget extension

import WidgetKit
import SwiftUI

@main
struct {{ACTIVITY_NAME}}Bundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 16.1, *) {
            {{ACTIVITY_NAME}}LiveActivity()
        }
    }
}
