// Action Extension Data Loading

private var actionText: String?
private var actionURL: String?
private var actionImages: [String] = []
private var actionFiles: [String] = []

private func loadActionContent() async {
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
                            self.actionText = text
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
                            self.actionURL = url.absoluteString
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
                            self.actionImages.append(url.absoluteString)
                        }
                    } else if let image = data as? UIImage, let pngData = image.pngData() {
                        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".png")
                        try? pngData.write(to: tempURL)
                        await MainActor.run {
                            self.actionImages.append(tempURL.absoluteString)
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
                            self.actionFiles.append(url.absoluteString)
                        }
                    }
                }
            }
        }
    }
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

private func getActionDataProps() -> [String: Any] {
    var data: [String: Any] = [:]

    if let text = actionText {
        data["text"] = text
    }

    if let url = actionURL {
        data["url"] = url
    }

    if !actionImages.isEmpty {
        data["images"] = actionImages
    }

    if !actionFiles.isEmpty {
        data["files"] = actionFiles
    }

    return data
}

