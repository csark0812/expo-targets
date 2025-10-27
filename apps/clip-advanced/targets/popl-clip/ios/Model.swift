struct ContactFormData: Codable {
  var displayName: String?
  var givenName: String?
  var middleName: String?
  var familyName: String?
  var jobTitle: String?
  var company: String?
  var urlAddresses: [URLAddress]?
  var emailAddresses: [LabeledEmail]?
  var phoneNumbers: [LabeledPhoneNumber]?
  var note: String?
  var postalAddresses: [PostalAddress]?
  var hasThumbnail: Bool?
  var thumbnailPath: String?
}

struct URLAddress: Codable {
  var url: String
  var label: String
}

struct PostalAddress: Codable {
  var label: String
  var formattedAddress: String?
  var street: String?
  var pobox: String?
  var neighborhood: String?
  var city: String?
  var region: String?
  var state: String?
  var postCode: String?
  var country: String?
}

struct LabeledEmail: Codable {
  let label: String
  let email: String
}

struct LabeledPhoneNumber: Codable {
  let label: String
  let number: String
}

struct ContactAPIResponse: Codable {
  var message: String
  var data: ContactData?
}

struct ContactData: Codable {
  var newContact: ContactFormData?
}

