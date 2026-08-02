Pod::Spec.new do |s|
  s.name           = 'TrickLiveActivity'
  s.version        = '1.0.0'
  s.summary        = 'Start/end ActivityKit Live Activities for ET Trick'
  s.description    = 'Host-side Live Activity control for the Trick showcase'
  s.license        = 'MIT'
  s.author         = 'expo-targets'
  s.homepage       = 'https://github.com/csark0812/expo-targets'
  s.platforms      = { :ios => '16.2' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'ActivityKit'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
