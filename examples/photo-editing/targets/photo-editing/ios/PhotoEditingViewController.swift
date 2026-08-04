import Photos
import PhotosUI
import UIKit
import CoreImage

/// Minimal photo-editing extension — applies a grayscale filter and returns output.
@objc(PhotoEditingViewController)
class PhotoEditingViewController: UIViewController, PHContentEditingController {
  private var input: PHContentEditingInput?
  private let appGroup = "group.com.expotargets.example.photo-editing"
  private let imageView = UIImageView()
  private let markerLabel: UILabel = {
    let label = UILabel()
    label.text = "ET PhotoEdit Extension"
    label.textAlignment = .center
    label.font = .systemFont(ofSize: 15, weight: .semibold)
    label.textColor = .white
    label.translatesAutoresizingMaskIntoConstraints = false
    label.accessibilityIdentifier = "photo-edit-marker"
    return label
  }()

  private let formatIdentifier = "com.expotargets.example.photo-editing.grayscale"
  private let formatVersion = "1.0"

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .black
    imageView.contentMode = .scaleAspectFit
    imageView.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(imageView)
    view.addSubview(markerLabel)
    NSLayoutConstraint.activate([
      imageView.topAnchor.constraint(equalTo: view.topAnchor),
      imageView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      imageView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      imageView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
      markerLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      markerLabel.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
    ])
  }

  var shouldShowCancelConfirmation: Bool { false }

  func canHandle(_ adjustmentData: PHAdjustmentData) -> Bool {
    adjustmentData.formatIdentifier == formatIdentifier
      && adjustmentData.formatVersion == formatVersion
  }

  func startContentEditing(
    with contentEditingInput: PHContentEditingInput,
    placeholderImage: UIImage
  ) {
    input = contentEditingInput
    imageView.image = grayscale(placeholderImage) ?? placeholderImage
  }

  func finishContentEditing(
    completionHandler: @escaping (PHContentEditingOutput?) -> Void
  ) {
    guard let input else {
      completionHandler(nil)
      return
    }
    let output = PHContentEditingOutput(contentEditingInput: input)
    output.adjustmentData = PHAdjustmentData(
      formatIdentifier: formatIdentifier,
      formatVersion: formatVersion,
      data: Data("grayscale".utf8)
    )

    // Done-persistence marker for host Devicewright asserts.
    if let defaults = UserDefaults(suiteName: appGroup) {
      defaults.set("expo-targets uitest photo-edit done", forKey: "photoEdit:lastDone")
      defaults.set(Date().timeIntervalSince1970, forKey: "photoEdit:lastDoneAt")
      defaults.set("grayscale", forKey: "photoEdit:lastFilter")
      defaults.synchronize()
    }

    DispatchQueue.global(qos: .userInitiated).async {
      defer { completionHandler(output) }
      guard
        let url = input.fullSizeImageURL,
        let data = try? Data(contentsOf: url),
        let image = UIImage(data: data),
        let gray = self.grayscale(image),
        let jpeg = gray.jpegData(compressionQuality: 0.92)
      else {
        return
      }
      try? jpeg.write(to: output.renderedContentURL, options: .atomic)
    }
  }

  func cancelContentEditing() {}

  private func grayscale(_ image: UIImage) -> UIImage? {
    guard let ciImage = CIImage(image: image) else { return nil }
    let filter = CIFilter(name: "CIPhotoEffectMono")
    filter?.setValue(ciImage, forKey: kCIInputImageKey)
    guard let output = filter?.outputImage else { return nil }
    let context = CIContext()
    guard let cg = context.createCGImage(output, from: output.extent) else {
      return nil
    }
    return UIImage(cgImage: cg)
  }
}
