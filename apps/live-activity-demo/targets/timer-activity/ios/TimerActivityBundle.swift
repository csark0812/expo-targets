import WidgetKit
import SwiftUI

@main
struct TimerActivityBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 16.1, *) {
            TimerActivityLiveActivity()
        }
    }
}
