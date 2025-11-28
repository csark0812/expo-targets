require 'json'

package = JSON.parse(File.read(File.join(__dir__, '../package.json')))

Pod::Spec.new do |s|
  s.name           = 'ExpoTargetsLiveActivity'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = 'Expo Targets Live Activity Module - iOS Dynamic Island and Live Activities support'
  s.license        = package['license']
  s.authors        = package['author']
  s.homepage       = package['homepage']
  s.platforms      = { :ios => '16.1' }
  s.swift_version  = '5.4'
  s.source         = { :git => package['repository']['url'], :tag => "v#{package['version']}" }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "ExpoTargetsLiveActivityModule.swift"
  s.exclude_files = "Tests/**/*"
end
