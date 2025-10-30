require 'json'

package = JSON.parse(File.read(File.join(__dir__, '../../../../package.json')))

Pod::Spec.new do |s|
  s.name           = 'ExpoTargetsExtension'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = 'Expo Targets Extension Module - Extension utilities for share, action, and clip extensions'
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platforms      = { :ios => '13.0' }
  s.swift_version  = '5.4'
  s.source         = { git: 'https://github.com/expo/expo.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end

