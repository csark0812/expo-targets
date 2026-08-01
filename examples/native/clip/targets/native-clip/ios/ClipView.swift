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
                Text(itemName)
                Text(price)
                    .fontWeight(.semibold)
                    .foregroundColor(Color("AccentColor"))
                Button("Complete checkout") {
                    storeCheckout()
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
    }

    private func storeCheckout() {
        let defaults = UserDefaults(suiteName: "group.com.expotargets.example.native.clip")
        defaults?.set(itemName, forKey: "native-clip:lastItemName")
        defaults?.set(price, forKey: "native-clip:lastPrice")
        defaults?.set(Date().timeIntervalSince1970, forKey: "native-clip:checkoutTimestamp")
    }
}
