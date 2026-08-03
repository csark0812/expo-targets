Pod::Spec.new do |s|
  s.name           = 'BlockerReload'
  s.version        = '1.0.0'
  s.summary        = 'Reload Safari content blocker from host'
  s.description    = 'SFContentBlockerManager.reloadContentBlocker for ET Blocker'
  s.license        = 'MIT'
  s.author         = 'expo-targets'
  s.homepage       = 'https://github.com/csark0812/expo-targets'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'SafariServices'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
