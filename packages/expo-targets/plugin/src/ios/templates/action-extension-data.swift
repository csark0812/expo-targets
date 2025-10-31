// Action Extension Data Loading

private var actionType: String?
private var inputItems: [[String: Any]] = []

private func loadActionContent() {
    guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else {
        return
    }

    for extensionItem in extensionItems {
        var itemData: [String: Any] = [:]

        if let attachments = extensionItem.attachments {
            var attachmentData: [[String: Any]] = []

            for attachment in attachments {
                var attachmentInfo: [String: Any] = [:]

                if attachment.hasItemConformingToTypeIdentifier("public.plain-text") {
                    let semaphore = DispatchSemaphore(value: 0)
                    attachment.loadItem(forTypeIdentifier: "public.plain-text", options: nil) { data, error in
                        if let text = data as? String {
                            attachmentInfo["text"] = text
                        }
                        semaphore.signal()
                    }
                    semaphore.wait()
                }

                attachmentData.append(attachmentInfo)
            }

            itemData["attachments"] = attachmentData
        }

        inputItems.append(itemData)
    }
}

private func getActionDataProps() -> [String: Any] {
    return [
        "inputItems": inputItems
    ]
}

