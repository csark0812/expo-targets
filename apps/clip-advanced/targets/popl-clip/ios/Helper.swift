import UIKit
import ContactsUI

class ContentHelper: NSObject, CNContactViewControllerDelegate {
  private var poplContactURL = "https://api.popl.co/api/v4/appleappclip/getcontactcard"

  var onContactFormDismissed: (() -> Void)?

  func warmUpContactView() {
    DispatchQueue.main.async {
      let dummyContact = CNMutableContact()
      let contactVC = CNContactViewController(forNewContact: dummyContact)
      _ = contactVC.view
    }
  }

  func showContactForm(with data: ContactFormData, onDismiss: (() -> Void)? = nil) {
    self.onContactFormDismissed = onDismiss

    guard let topVC = UIApplication.shared.topMostViewController() else {
      return
    }

    let newContact = CNMutableContact()
    newContact.givenName = data.givenName ?? ""
    newContact.middleName = data.middleName ?? ""
    newContact.familyName = data.familyName ?? ""
    newContact.jobTitle = data.jobTitle ?? ""
    newContact.organizationName = data.company ?? ""
    newContact.note = data.note ?? ""

    if let phones = data.phoneNumbers {
      newContact.phoneNumbers = phones.map {
        CNLabeledValue(label: $0.label, value: CNPhoneNumber(stringValue: $0.number))
      }
    }

    if let emails = data.emailAddresses {
      newContact.emailAddresses = emails.map {
        CNLabeledValue(label: $0.label, value: $0.email as NSString)
      }
    }

    if let urls = data.urlAddresses {
      newContact.urlAddresses = urls.map {
        CNLabeledValue(label: $0.label, value: $0.url as NSString)
      }
    }

    if let addresses = data.postalAddresses {
      newContact.postalAddresses = addresses.map {
        let postal = CNMutablePostalAddress()
        postal.street = $0.street ?? ""
        postal.city = $0.city ?? ""
        postal.state = $0.state ?? ""
        postal.postalCode = $0.postCode ?? ""
        postal.country = $0.country ?? ""
        return CNLabeledValue(label: $0.label, value: postal)
      }
    }

    let contactVC = CNContactViewController(forNewContact: newContact)
    contactVC.delegate = self

    let containerVC = UIViewController()
    containerVC.modalPresentationStyle = .overFullScreen

    let nav = UINavigationController(rootViewController: contactVC)
    nav.view.layer.cornerRadius = 16
    nav.view.clipsToBounds = true
    nav.view.translatesAutoresizingMaskIntoConstraints = false

    containerVC.addChild(nav)
    containerVC.view.addSubview(nav.view)
    nav.didMove(toParent: containerVC)

    NSLayoutConstraint.activate([
      nav.view.leadingAnchor.constraint(equalTo: containerVC.view.leadingAnchor),
      nav.view.trailingAnchor.constraint(equalTo: containerVC.view.trailingAnchor),
      nav.view.bottomAnchor.constraint(equalTo: containerVC.view.bottomAnchor),
      nav.view.heightAnchor.constraint(equalTo: containerVC.view.heightAnchor, multiplier: 0.8)
    ])

    topVC.present(containerVC, animated: true)
  }

  func contactViewController(_ viewController: CNContactViewController, didCompleteWith contact: CNContact?) {
    viewController.dismiss(animated: true) {
      self.onContactFormDismissed?()
      self.onContactFormDismissed = nil
    }
  }

  func handleUniversalLink(_ url: URL, onDismiss: (() -> Void)? = nil) {
    let appClipUrlPrefix = "https://appclip.apple.com/id?p=com.nfc.popl.Clip&link="
    var link = url.absoluteString
    if link.contains(appClipUrlPrefix) {
      link = link.replacingOccurrences(of: appClipUrlPrefix, with: "")
    }
    makePostRequest(urlString: poplContactURL, parameters: ["link": link]) { result in
      DispatchQueue.main.async {
        switch result {
          case .success(let data):
            do {
              let decodedResponse = try JSONDecoder().decode(ContactAPIResponse.self, from: data)
              if let newContact = decodedResponse.data?.newContact {
                self.showContactForm(with: newContact) {
                  let additionalParam = link.contains("?did=") ? "&novcard=true" : "?novcard=true"
                  let finalURLString = "\(link)\(additionalParam)"
                  if let finalURL = URL(string: finalURLString) {
                    UIApplication.shared.open(finalURL)
                  } else {
                    print("Invalid URL: \(finalURLString)")
                  }
                }
                print("newContact:", newContact)
              } else {
                print("No 'newContact' found in response.")
              }
            } catch {
              print("JSON decoding error:", error)
            }

          case .failure(let error):
            print("Network error:", error)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
          onDismiss?()
        }
      }
    }
  }
}

extension UIApplication {
  func topMostViewController(
    base: UIViewController? = UIApplication.shared.connectedScenes
      .compactMap { ($0 as? UIWindowScene)?.keyWindow }
      .first?.rootViewController
  ) -> UIViewController? {

    if let nav = base as? UINavigationController {
      return topMostViewController(base: nav.visibleViewController)
    }
    if let tab = base as? UITabBarController {
      return topMostViewController(base: tab.selectedViewController)
    }
    if let presented = base?.presentedViewController {
      return topMostViewController(base: presented)
    }
    return base
  }
}

func makePostRequest(urlString: String, parameters: [String: Any], completion: @escaping (Result<Data, Error>) -> Void) {
  guard let url = URL(string: urlString) else {
    completion(.failure(URLError(.badURL)))
    return
  }

  var request = URLRequest(url: url)
  request.httpMethod = "POST"
  request.setValue("application/json", forHTTPHeaderField: "Content-Type")

  do {
    let jsonData = try JSONSerialization.data(withJSONObject: parameters, options: [])
    request.httpBody = jsonData
  } catch {
    completion(.failure(error))
    return
  }

  let task = URLSession.shared.dataTask(with: request) { data, response, error in
    if let error = error {
      completion(.failure(error))
      return
    }

    guard let data = data,
          let httpResponse = response as? HTTPURLResponse,
          (200...299).contains(httpResponse.statusCode) else {
      completion(.failure(URLError(.badServerResponse)))
      return
    }

    completion(.success(data))
  }
  task.resume()
}

