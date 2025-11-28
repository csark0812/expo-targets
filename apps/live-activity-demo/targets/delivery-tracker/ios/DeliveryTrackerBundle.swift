import WidgetKit
import SwiftUI

@main
struct DeliveryTrackerBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 16.1, *) {
            DeliveryTrackerLiveActivity()
        }
    }
}
