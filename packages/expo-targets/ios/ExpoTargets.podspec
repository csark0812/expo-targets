Pod::Spec.new do |s|
  s.name           = 'ExpoTargets'
  s.version        = '0.1.0'
  s.summary        = 'Expo module for Apple targets'
  s.license        = 'MIT'
  s.author         = ''
  s.homepage       = 'https://github.com/your-org/expo-targets'
  s.platform       = :ios, '13.0'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
end

