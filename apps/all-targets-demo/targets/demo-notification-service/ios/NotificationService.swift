import UserNotifications

class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        guard let bestAttemptContent = bestAttemptContent else {
            contentHandler(request.content)
            return
        }

        print("🔔 NotificationService: Processing notification - \(bestAttemptContent.title)")

        // Modify the notification content
        let originalTitle = bestAttemptContent.title
        bestAttemptContent.title = "✨ \(originalTitle)"

        // Add a badge indicating this was processed
        bestAttemptContent.body = "\(bestAttemptContent.body)\n\n[Processed by NotificationService]"

        // Add custom data to show it was modified
        var userInfo = bestAttemptContent.userInfo
        userInfo["processedByService"] = true
        userInfo["processedAt"] = Date().timeIntervalSince1970
        bestAttemptContent.userInfo = userInfo

        // If there's an image URL in the payload, download and attach it
        if let imageURLString = request.content.userInfo["imageURL"] as? String,
           let imageURL = URL(string: imageURLString) {
            downloadImage(from: imageURL) { attachment in
                if let attachment = attachment {
                    bestAttemptContent.attachments = [attachment]
                }
                contentHandler(bestAttemptContent)
            }
        } else {
            contentHandler(bestAttemptContent)
        }
    }

    override func serviceExtensionTimeWillExpire() {
        // Called just before the extension will be terminated by the system
        // Deliver whatever we have
        if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
            bestAttemptContent.title = "⏱️ \(bestAttemptContent.title)"
            contentHandler(bestAttemptContent)
        }
    }

    private func downloadImage(from url: URL, completion: @escaping (UNNotificationAttachment?) -> Void) {
        let task = URLSession.shared.downloadTask(with: url) { localURL, response, error in
            guard let localURL = localURL, error == nil else {
                completion(nil)
                return
            }

            // Move to a temp location with proper extension
            let tempDirectory = FileManager.default.temporaryDirectory
            let tempFile = tempDirectory.appendingPathComponent(UUID().uuidString + ".jpg")

            do {
                try FileManager.default.moveItem(at: localURL, to: tempFile)
                let attachment = try UNNotificationAttachment(identifier: "image", url: tempFile, options: nil)
                completion(attachment)
            } catch {
                print("Failed to create attachment: \(error)")
                completion(nil)
            }
        }
        task.resume()
    }
}

