import AuthenticationServices
import Foundation

/// App SSO identity-provider extension — authorization request handler principal.
@objc(AuthenticationServicesHandler)
class AuthenticationServicesHandler: NSObject,
  ASAuthorizationProviderExtensionAuthorizationRequestHandler
{
  func prepareInterface(
    for authorizationRequest: ASAuthorizationProviderExtensionAuthorizationRequest
  ) {
    authorizationRequest.completeRequest()
  }
}
