import WidgetKit
import SwiftUI

@main
struct WorkoutTrackerBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 16.1, *) {
            WorkoutTrackerLiveActivity()
        }
    }
}
