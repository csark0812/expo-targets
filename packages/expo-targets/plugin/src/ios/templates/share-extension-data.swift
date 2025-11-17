// Share Extension Data Loading

private var sharedText: String?
private var sharedURL: String?
private var sharedImages: [String] = []
private var sharedFiles: [String] = []
private var preprocessedWebData: [String: Any]?

private func loadSharedContent() async {
    guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
          let attachments = extensionItem.attachments else {
        return
    }

    await withTaskGroup(of: Void.self) { group in
        for attachment in attachments {
            // Load text
            if attachment.hasItemConformingToTypeIdentifier("public.plain-text") {
                group.addTask {
                    let data = await self.loadAttachmentItem(attachment, typeIdentifier: "public.plain-text")
                    if let text = data as? String {
                        await MainActor.run {
                            self.sharedText = text
                        }
                    }
                }
            }

            // Load URL
            if attachment.hasItemConformingToTypeIdentifier("public.url") {
                group.addTask {
                    let data = await self.loadAttachmentItem(attachment, typeIdentifier: "public.url")
                    if let url = data as? URL {
                        await MainActor.run {
                            self.sharedURL = url.absoluteString
                        }
                    }
                }
            }

            // Load images
            if attachment.hasItemConformingToTypeIdentifier("public.image") {
                group.addTask {
                    let data = await self.loadAttachmentItem(attachment, typeIdentifier: "public.image")
                    if let url = data as? URL {
                        await MainActor.run {
                            self.sharedImages.append(url.absoluteString)
                        }
                    } else if let image = data as? UIImage, let pngData = image.pngData() {
                        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".png")
                        try? pngData.write(to: tempURL)
                        await MainActor.run {
                            self.sharedImages.append(tempURL.absoluteString)
                        }
                    }
                }
            }

            // Load files
            if attachment.hasItemConformingToTypeIdentifier("public.file-url") {
                group.addTask {
                    let data = await self.loadAttachmentItem(attachment, typeIdentifier: "public.file-url")
                    if let url = data as? URL {
                        await MainActor.run {
                            self.sharedFiles.append(url.absoluteString)
                        }
                    }
                }
            }
        }
    }

    {{PREPROCESSING_DATA_LOAD}}
}

private func loadAttachmentItem(_ attachment: NSItemProvider, typeIdentifier: String) async -> NSSecureCoding? {
    await withCheckedContinuation { continuation in
        attachment.loadItem(forTypeIdentifier: typeIdentifier, options: nil) { data, error in
            if error != nil {
                continuation.resume(returning: nil)
            } else {
                continuation.resume(returning: data)
            }
        }
    }
}

private func getSharedDataProps() -> [String: Any] {
    var data: [String: Any] = [:]

    if let text = sharedText {
        data["text"] = text
    }

    if let url = sharedURL {
        data["url"] = url
    }

    if !sharedImages.isEmpty {
        data["images"] = sharedImages
    }

    if !sharedFiles.isEmpty {
        data["files"] = sharedFiles
    }

    if let preprocessedData = preprocessedWebData {
        data["preprocessedWebData"] = preprocessedData
    }

    return data
}

