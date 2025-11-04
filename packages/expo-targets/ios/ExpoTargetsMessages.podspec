require 'json'

package = JSON.parse(File.read(File.join(__dir__, '../package.json')))

Pod::Spec.new do |s|
  s.name           = 'ExpoTargetsMessages'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = 'Expo Targets Messages Module - Messages framework integration for iMessage apps'
  s.license        = package['license']
  s.authors        = package['author']
  s.homepage       = package['homepage']
  s.platforms      = { :ios => '13.0' }
  s.swift_version  = '5.4'
  s.source         = { :git => package['repository']['url'], :tag => "v#{package['version']}" }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Messages'

  s.source_files = "ExpoTargetsMessagesModule.swift"
end

