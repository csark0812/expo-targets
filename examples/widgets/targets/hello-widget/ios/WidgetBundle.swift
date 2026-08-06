import SwiftUI
import WidgetKit

@main
struct HelloWidgetBundle: WidgetBundle {
  var body: some Widget {
    HelloWidget()
    HelloWidgetLiveActivity()
  }
}
