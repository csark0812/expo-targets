// Share Extension Data Loading

private var sharedText: String?
private var sharedURL: String?
private var sharedImages: [String] = []
private var sharedFiles: [String] = []
private var preprocessedWebData: [String: Any]?

private func loadSharedContent() {
    guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
          let attachments = extensionItem.attachments else {
        return
    }

    let group = DispatchGroup()

    for attachment in attachments {
        // Load text
        if attachment.hasItemConformingToTypeIdentifier("public.plain-text") {
            group.enter()
            attachment.loadItem(forTypeIdentifier: "public.plain-text", options: nil) { data, error in
                defer { group.leave() }
                if let text = data as? String {
                    self.sharedText = text
                }
            }
        }

        // Load URL
        if attachment.hasItemConformingToTypeIdentifier("public.url") {
            group.enter()
            attachment.loadItem(forTypeIdentifier: "public.url", options: nil) { data, error in
                defer { group.leave() }
                if let url = data as? URL {
                    self.sharedURL = url.absoluteString
                }
            }
        }

        // Load images
        if attachment.hasItemConformingToTypeIdentifier("public.image") {
            group.enter()
            attachment.loadItem(forTypeIdentifier: "public.image", options: nil) { data, error in
                defer { group.leave() }
                // Handle image data
                if let url = data as? URL {
                    self.sharedImages.append(url.absoluteString)
                } else if let image = data as? UIImage, let pngData = image.pngData() {
                    let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".png")
                    try? pngData.write(to: tempURL)
                    self.sharedImages.append(tempURL.absoluteString)
                }
            }
        }

        // Load files
        if attachment.hasItemConformingToTypeIdentifier("public.file-url") {
            group.enter()
            attachment.loadItem(forTypeIdentifier: "public.file-url", options: nil) { data, error in
                defer { group.leave() }
                if let url = data as? URL {
                    self.sharedFiles.append(url.absoluteString)
                }
            }
        }
    }

    {{PREPROCESSING_DATA_LOAD}}

    group.wait()
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

