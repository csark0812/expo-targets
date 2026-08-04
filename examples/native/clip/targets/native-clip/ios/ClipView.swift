import SwiftUI

struct ClipView: View {
    let invocationURL: URL?
    @State private var itemName = "Native Clip Item"
    @State private var price = "$29.99"

    var body: some View {
        ZStack {
            Color("BackgroundColor").ignoresSafeArea()
            VStack(spacing: 20) {
                Image(systemName: "cart.fill")
                    .font(.system(size: 48))
                    .foregroundColor(Color("AccentColor"))
                Text("Native App Clip")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(Color("PrimaryText"))
                    .accessibilityIdentifier("clip-native-title")
                Text("expo-targets uitest clip invocation")
                    .font(.caption)
                    .accessibilityIdentifier("clip-invocation-marker")
                Text(itemName)
                Text(price)
                    .fontWeight(.semibold)
                    .foregroundColor(Color("AccentColor"))
                Button("Complete checkout") {
                    storeCheckout(path: "clip-checkout")
                }
                .buttonStyle(.borderedProminent)
                Button("Open full app") {
                    if let url = URL(string: "expotargets-native-clip://checkout") {
                        UIApplication.shared.open(url)
                    }
                }
            }
            .padding()
        }
        .onAppear {
            storeCheckout(path: "clip-launch")
        }
    }

    private func storeCheckout(path: String) {
        let defaults = UserDefaults(suiteName: "group.com.expotargets.example.native.clip")
        defaults?.set(itemName, forKey: "native-clip:lastItemName")
        defaults?.set(price, forKey: "native-clip:lastPrice")
        defaults?.set(Date().timeIntervalSince1970, forKey: "native-clip:checkoutTimestamp")
        defaults?.set(true, forKey: "native-clip:invoked")
        defaults?.set(path, forKey: "native-clip:invocationPath")
        defaults?.synchronize()
    }
}
