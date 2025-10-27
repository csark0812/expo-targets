import SwiftUI
import ContactsUI

extension Color {
  init(hex: String) {
    let hex = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    var rgb: UInt64 = 0
    Scanner(string: hex.hasPrefix("#") ? String(hex.dropFirst()) : hex).scanHexInt64(&rgb)
    self.init(
      red: Double((rgb >> 16) & 0xFF) / 255.0,
      green: Double((rgb >> 8) & 0xFF) / 255.0,
      blue: Double(rgb & 0xFF) / 255.0
    )
  }
}

struct ContentView: View {
  var url: URL?
  var isContactLoading: Bool?
  let poplLogoUrl = URL(string: "https://firebasestorage.googleapis.com/v0/b/poplco.appspot.com/o/new-popl-logo-rebrand.png?alt=media&token=9c492d54-f87c-4f7c-8728-77bf6552418e")!
  let subTitle = "The #1 Digital Business Card for\nteams and individuals"
  let subTitleWhileLoading = "Loading contact card"

  var body: some View {
    ZStack {
      Color(hex: "#F9F4EF")
        .ignoresSafeArea()

      VStack(spacing: 20) {
        if isContactLoading == false {
          AsyncImage(url: poplLogoUrl) { image in
            image
              .resizable()
              .aspectRatio(contentMode: .fit)
              .frame(width: UIScreen.main.bounds.width * 0.34)
          } placeholder: { }
        }

        HStack {
          Text(isContactLoading == true ? subTitleWhileLoading : subTitle)
            .multilineTextAlignment(.center)
            .font(.system(size: isContactLoading == true ? 22 : 18, weight: isContactLoading == true ? .bold : .regular))
            .foregroundColor(Color(hex: "#000000"))
          if isContactLoading == true {
            ProgressView()
              .progressViewStyle(CircularProgressViewStyle())
              .scaleEffect(1.2)
              .tint(Color.black.opacity(0.8))
              .padding(.leading, 8)
          }
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal)
        .padding()

        if isContactLoading == false {
          Button(action: {
            let digitalCardAdURL = URL(string: "https://poplco.app.link/modern")!
            UIApplication.shared.open(digitalCardAdURL)
          }) {
            Text("Create your digital card")
              .font(.headline)
              .foregroundColor(Color(hex: "#FFFFFF"))
              .padding()
              .frame(maxWidth: .infinity)
              .background(Color(hex: "#000000"))
          }
          .cornerRadius(100)
          .padding(.horizontal, 50)

          Button(action: {
            let teamAdURL = URL(string: "https://popl.co/pages/popl-teams")!
            UIApplication.shared.open(teamAdURL)
          }) {
            Text("Set your team up with Popl")
              .font(.headline)
              .foregroundColor(Color(hex: "#000000"))
              .padding()
              .frame(maxWidth: .infinity)
              .background(Color(hex: "#F9F4EF"))
          }
          .overlay(
            RoundedRectangle(cornerRadius: 100)
              .stroke(Color(hex: "#000000"), lineWidth: 2)
          )
          .cornerRadius(100)
          .padding(.horizontal, 50)
        }
      }
    }
  }
}

#Preview {
  ContentView()
}

