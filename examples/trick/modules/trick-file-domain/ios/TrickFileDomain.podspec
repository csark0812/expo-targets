Pod::Spec.new do |s|
  s.name           = 'TrickFileDomain'
  s.version        = '1.0.0'
  s.summary        = 'Register NSFileProviderDomain for ET Trick Files'
  s.description    = 'Host-side File Provider domain registration for the Trick showcase'
  s.license        = 'MIT'
  s.author         = 'expo-targets'
  s.homepage       = 'https://github.com/csark0812/expo-targets'
  s.platforms      = { :ios => '16.0' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'FileProvider'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
