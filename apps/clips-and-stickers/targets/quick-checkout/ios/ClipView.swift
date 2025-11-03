import SwiftUI

struct ClipView: View {
    let invocationURL: URL?
    @State private var itemName: String = "Premium Item"
    @State private var price: String = "$29.99"
    @State private var showConfirmation = false

    init(invocationURL: URL?) {
        self.invocationURL = invocationURL

        // Parse URL parameters if available
        if let url = invocationURL,
           let components = URLComponents(url: url, resolvingAgainstBaseURL: false) {
            if let itemParam = components.queryItems?.first(where: { $0.name == "item" })?.value {
                _itemName = State(initialValue: itemParam)
            }
            if let priceParam = components.queryItems?.first(where: { $0.name == "price" })?.value {
                _price = State(initialValue: "$\(priceParam)")
            }
        }
    }

    var body: some View {
        ZStack {
            Color("BackgroundColor")
                .ignoresSafeArea()

            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "cart.fill")
                        .font(.system(size: 60))
                        .foregroundColor(Color("AccentColor"))

                    Text("Quick Checkout")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(Color("PrimaryText"))

                    Text("Complete your purchase in seconds")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 40)

                // Item Card
                VStack(alignment: .leading, spacing: 12) {
                    Text(itemName)
                        .font(.title2)
                        .fontWeight(.semibold)

                    HStack {
                        Text("Price:")
                            .foregroundColor(.secondary)
                        Spacer()
                        Text(price)
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(Color("AccentColor"))
                    }

                    Divider()

                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.shield.fill")
                            .foregroundColor(.green)
                        Text("Secure checkout with Apple Pay")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.gray.opacity(0.1))
                )

                Spacer()

                // Action Buttons
                VStack(spacing: 12) {
                    Button(action: {
                        // Simulate checkout
                        storeCheckoutData()
                        showConfirmation = true

                        // Auto-dismiss after 2 seconds
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                            showConfirmation = false
                        }
                    }) {
                        HStack {
                            Image(systemName: "applelogo")
                            Text("Pay with Apple Pay")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color("AccentColor"))
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }

                    Button(action: {
                        // Open full app
                        if let url = URL(string: "clipsandstickers://checkout") {
                            UIApplication.shared.open(url)
                        }
                    }) {
                        Text("Open Full App")
                            .fontWeight(.medium)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.gray.opacity(0.2))
                            .foregroundColor(Color("PrimaryText"))
                            .cornerRadius(12)
                    }
                }

                // App Clip Badge
                HStack {
                    Image(systemName: "app.badge")
                        .font(.caption)
                    Text("This is an App Clip - lightweight and instant")
                        .font(.caption)
                }
                .foregroundColor(.secondary)
                .padding(.bottom, 20)
            }
            .padding(.horizontal, 20)

            // Confirmation Overlay
            if showConfirmation {
                VStack {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.green)
                    Text("Purchase Complete!")
                        .font(.title2)
                        .fontWeight(.bold)
                        .padding(.top, 8)
                }
                .padding(40)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color("BackgroundColor"))
                        .shadow(radius: 20)
                )
            }
        }
    }

    private func storeCheckoutData() {
        let defaults = UserDefaults(suiteName: "group.com.test.clipsandstickers")
        defaults?.set(itemName, forKey: "lastItemName")
        defaults?.set(price, forKey: "lastPrice")
        defaults?.set(Date().timeIntervalSince1970, forKey: "checkoutTimestamp")
    }
}

#Preview {
    ClipView(invocationURL: URL(string: "https://clipadvanced.example.com?item=Premium%20Item&price=29.99"))
}

