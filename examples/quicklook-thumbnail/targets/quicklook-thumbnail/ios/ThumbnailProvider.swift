import QuickLookThumbnailing
import UIKit

/// Quick Look thumbnail principal — Files browse of `.etqlt` should invoke this.
@objc(ThumbnailProvider)
class ThumbnailProvider: QLThumbnailProvider {
  override func provideThumbnail(
    for request: QLFileThumbnailRequest,
    _ handler: @escaping (QLThumbnailReply?, Error?) -> Void
  ) {
    let defaults = UserDefaults(suiteName: "group.com.expotargets.example.quicklook-thumbnail")
    defaults?.set(request.fileURL.lastPathComponent, forKey: "qlThumb:lastFile")
    defaults?.set("ET QL Thumb", forKey: "qlThumb:marker")
    defaults?.set(Date().timeIntervalSince1970, forKey: "qlThumb:lastAt")
    defaults?.synchronize()

    let size = request.maximumSize
    handler(
      QLThumbnailReply(contextSize: size, currentContextDrawing: {
        UIColor.systemTeal.setFill()
        UIBezierPath(rect: CGRect(origin: .zero, size: size)).fill()

        let label = "ET QL Thumb" as NSString
        let attrs: [NSAttributedString.Key: Any] = [
          .font: UIFont.boldSystemFont(ofSize: max(10, min(size.width, size.height) * 0.14)),
          .foregroundColor: UIColor.white,
        ]
        let textSize = label.size(withAttributes: attrs)
        let origin = CGPoint(
          x: (size.width - textSize.width) / 2,
          y: (size.height - textSize.height) / 2
        )
        label.draw(at: origin, withAttributes: attrs)
        return true
      }),
      nil
    )
  }
}
