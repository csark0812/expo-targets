require 'json'

package = JSON.parse(File.read(File.join(__dir__, '../package.json')))

Pod::Spec.new do |s|
  s.name           = 'ExpoTargetsStorage'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = 'Expo Targets Storage Module - App Group storage, widgets, File Provider, Content Blocker, Live Activities'
  s.license        = package['license']
  s.authors        = package['author']
  s.homepage       = package['homepage']
  s.platforms      = { :ios => '13.0' }
  s.swift_version  = '5.4'
  s.source         = { :git => package['repository']['url'], :tag => "v#{package['version']}" }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Only host/storage surfaces — do not share source_files with ExpoTargetsExtension
  # or Live Activity bridge registration and the JS module resolve to different copies.
  s.source_files = [
    'ExpoTargetsStorageModule.swift',
    'ExpoTargetsExtensionBundleModule.swift',
    'ExpoTargetsFileProviderModule.swift',
    'ExpoTargetsContentBlockerModule.swift',
    'ExpoTargetsLiveActivityModule.swift',
    'ExpoTargetsLiveActivityBridge.swift',
  ]
end
