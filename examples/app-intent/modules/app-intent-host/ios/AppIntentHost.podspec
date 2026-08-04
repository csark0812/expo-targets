Pod::Spec.new do |s|
  s.name           = 'AppIntentHost'
  s.version        = '1.0.0'
  s.summary        = 'Host App Shortcuts for ET AppIntent'
  s.description    = 'Donates ET Greet App Shortcuts from the main app target'
  s.license        = 'MIT'
  s.author         = 'expo-targets'
  s.homepage       = 'https://github.com/csark0812/expo-targets'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AppIntents'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
