#!/usr/bin/env bash
# Attach Share Sheet UI tests into an example's generated ios/ project after prebuild.
# Usage: ./examples/_harness/uitests/scripts/attach-after-prebuild.sh examples/share
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
EXAMPLE_REL="${1:-}"
if [[ -z "$EXAMPLE_REL" ]]; then
  echo "usage: $0 examples/<share|action|native/share|native/action>" >&2
  exit 1
fi

EXAMPLE_DIR="$ROOT/$EXAMPLE_REL"
IOS_DIR="$EXAMPLE_DIR/ios"
HARNESS_DIR="$ROOT/examples/_harness/uitests"
DEST_DIR="$IOS_DIR/ExpoTargetsShareSheetUITests"

if [[ ! -d "$IOS_DIR" ]]; then
  echo "missing $IOS_DIR — run: cd $EXAMPLE_REL && npx expo prebuild --platform ios" >&2
  exit 1
fi

# Defaults match target ios.displayName (Share Sheet row), not host CFBundleDisplayName.
# Share Sheet row title usually matches the host CFBundleDisplayName on modern iOS.
# Always reset per-example defaults (ignore stale exported UITEST_* from the caller shell).
# Override with UITEST_*_OVERRIDE when needed.
case "$EXAMPLE_REL" in
  examples/share)
    UITEST_HOST_BUNDLE_ID="${UITEST_HOST_BUNDLE_ID_OVERRIDE:-com.expotargets.example.share}"
    UITEST_HOST_DISPLAY_NAME="${UITEST_HOST_DISPLAY_NAME_OVERRIDE:-ET Share}"
    UITEST_EXTENSION_NAME="${UITEST_EXTENSION_NAME_OVERRIDE:-ET Share}"
    UITEST_EXTENSION_BUNDLE_ID="${UITEST_EXTENSION_BUNDLE_ID_OVERRIDE:-com.expotargets.example.share.share}"
    ;;
  examples/action)
    UITEST_HOST_BUNDLE_ID="${UITEST_HOST_BUNDLE_ID_OVERRIDE:-com.expotargets.example.action}"
    UITEST_HOST_DISPLAY_NAME="${UITEST_HOST_DISPLAY_NAME_OVERRIDE:-ET Action}"
    UITEST_EXTENSION_NAME="${UITEST_EXTENSION_NAME_OVERRIDE:-ET Action}"
    UITEST_EXTENSION_BUNDLE_ID="${UITEST_EXTENSION_BUNDLE_ID_OVERRIDE:-com.expotargets.example.action.action}"
    ;;
  examples/native/share)
    UITEST_HOST_BUNDLE_ID="${UITEST_HOST_BUNDLE_ID_OVERRIDE:-com.expotargets.example.native.share}"
    UITEST_HOST_DISPLAY_NAME="${UITEST_HOST_DISPLAY_NAME_OVERRIDE:-ET N Share}"
    UITEST_EXTENSION_NAME="${UITEST_EXTENSION_NAME_OVERRIDE:-ET N Share}"
    UITEST_EXTENSION_BUNDLE_ID="${UITEST_EXTENSION_BUNDLE_ID_OVERRIDE:-com.expotargets.example.native.share.share}"
    ;;
  examples/native/action)
    UITEST_HOST_BUNDLE_ID="${UITEST_HOST_BUNDLE_ID_OVERRIDE:-com.expotargets.example.native.action}"
    UITEST_HOST_DISPLAY_NAME="${UITEST_HOST_DISPLAY_NAME_OVERRIDE:-ET N Action}"
    UITEST_EXTENSION_NAME="${UITEST_EXTENSION_NAME_OVERRIDE:-ET N Action}"
    UITEST_EXTENSION_BUNDLE_ID="${UITEST_EXTENSION_BUNDLE_ID_OVERRIDE:-com.expotargets.example.native.action.action}"
    ;;
esac
export UITEST_HOST_BUNDLE_ID UITEST_HOST_DISPLAY_NAME UITEST_EXTENSION_NAME UITEST_EXTENSION_BUNDLE_ID

mkdir -p "$DEST_DIR"
cp "$HARNESS_DIR/ShareSheetSmoke.swift" "$DEST_DIR/ShareSheetSmoke.swift"

# Prefer ruby + xcodeproj when available; otherwise print manual Xcode steps.
if command -v ruby >/dev/null 2>&1 && ruby -e "require 'xcodeproj'" 2>/dev/null; then
  EXAMPLE_DIR="$EXAMPLE_DIR" ruby <<'RUBY'
require 'xcodeproj'
require 'pathname'

example = Pathname.new(ENV.fetch('EXAMPLE_DIR'))
ios = example.join('ios')
projects = Dir.glob(ios.join('*.xcodeproj').to_s)
abort "no xcodeproj under #{ios}" if projects.empty?
project_path = projects.first
project = Xcodeproj::Project.open(project_path)
# Prefer the non-App Clip host application (on-demand-install-capable is the clip).
host = project.targets.find do |t|
  t.product_type == 'com.apple.product-type.application' &&
    t.build_configurations.any? { |c|
      c.build_settings['PRODUCT_BUNDLE_IDENTIFIER'].to_s !~ /\.clip$/i
    }
end || project.targets.find { |t| t.product_type == 'com.apple.product-type.application' }
abort 'no application target' unless host

name = 'ExpoTargetsShareSheetUITests'
host_bundle = host.build_configurations
  .map { |c| c.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] }
  .find { |id| !id.to_s.empty? } || 'com.expotargets.example.uitests'
group = project.main_group.find_subpath('ExpoTargetsShareSheetUITests', true)
group.set_source_tree('<group>')
group.set_path('ExpoTargetsShareSheetUITests')

target = project.targets.find { |t| t.name == name }
unless target
  target = project.new_target(:ui_test_bundle, name, :ios, '15.1')
  target.add_dependency(host)
  puts "added UI test target #{name} -> #{host.name}"
else
  puts "UI test target #{name} already present"
end

# Group path is ExpoTargetsShareSheetUITests/, so the file path must be basename-only.
# (Earlier attaches used a doubled path and broke the Swift compile.)
smoke_refs = group.files.select { |f| File.basename(f.path.to_s) == 'ShareSheetSmoke.swift' }
smoke_refs.each do |bad|
  next if bad.path == 'ShareSheetSmoke.swift'
  target.source_build_phase.files.each do |bf|
    bf.remove_from_project if bf.file_ref == bad
  end
  bad.remove_from_project
end
ref = group.files.find { |f| f.path == 'ShareSheetSmoke.swift' }
unless ref
  ref = group.new_file('ShareSheetSmoke.swift')
end
unless target.source_build_phase.files_references.include?(ref)
  target.add_file_references([ref])
end

# Always sync build settings — xcodeproj leaves PRODUCT_NAME/SWIFT_VERSION empty,
# which yields -Runner.app/PlugIns/.xctest and SWIFT_VERSION '' build failures.
target.build_configurations.each do |config|
  config.build_settings['PRODUCT_NAME'] = name
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = "#{host_bundle}.uitests"
  config.build_settings['SWIFT_VERSION'] = '5.0'
  config.build_settings['TEST_TARGET_NAME'] = host.name
  config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
  config.build_settings['GENERATE_INFOPLIST_FILE'] = 'YES'
  config.build_settings['TARGETED_DEVICE_FAMILY'] = '1,2'
  config.build_settings['CODE_SIGNING_ALLOWED'] = 'YES'
  config.build_settings['CODE_SIGNING_REQUIRED'] = 'NO'
end
project.save

# Wire into the host shared scheme Test action (required for xcodebuild test).
schemes = Dir.glob(File.join(project_path, 'xcshareddata/xcschemes/*.xcscheme'))
abort "no shared xcscheme under #{project_path}" if schemes.empty?
scheme_path = schemes.find { |s| File.basename(s, '.xcscheme') == host.name } || schemes.first
scheme = Xcodeproj::XCScheme.new(scheme_path)

# Drop testables whose targets were removed (e.g. Expo template *Tests).
known = project.targets.map(&:name)
before = scheme.test_action.testables
kept = before.reject do |testable|
  testable.buildable_references.any? { |ref| !known.include?(ref.target_name) }
end
if kept.length != before.length
  scheme.test_action.testables = kept
  puts "removed #{before.length - kept.length} stale scheme testable(s)"
end

already = scheme.test_action.testables.any? do |testable|
  testable.buildable_references.any? { |ref| ref.target_name == name }
end
unless already
  scheme.add_test_target(target)
  puts "added #{name} to scheme #{File.basename(scheme_path)} Test action"
else
  puts "#{name} already in scheme Test action"
end

# Share Sheet needs a Release-installed extension process.
scheme.test_action.build_configuration = 'Release'
scheme.launch_action.build_configuration = 'Release'

# Surface UITEST_* into the test runner process.
# Must re-assign: getter may create a detached EnvironmentVariables node.
env_vars = scheme.test_action.environment_variables
%w[
  UITEST_HOST_BUNDLE_ID
  UITEST_HOST_DISPLAY_NAME
  UITEST_EXTENSION_NAME
  UITEST_EXTENSION_BUNDLE_ID
].each do |key|
  next if ENV[key].to_s.empty?
  env_vars[key] = ENV[key]
end
scheme.test_action.environment_variables = env_vars
scheme.test_action.should_use_launch_scheme_args_env = true
scheme.save!
puts "updated scheme #{scheme_path}"
RUBY
else
  cat <<EOF
Copied ShareSheetSmoke.swift to $DEST_DIR

ruby gem 'xcodeproj' not available. Manual attach:
  1. Open $IOS_DIR/*.xcworkspace in Xcode
  2. File → New → Target → UI Testing Bundle → ExpoTargetsShareSheetUITests
  3. Add ShareSheetSmoke.swift from ExpoTargetsShareSheetUITests/
  4. Set UITEST_HOST_BUNDLE_ID / UITEST_EXTENSION_NAME in the scheme environment
  5. Add the UI test target to the host scheme Test action
EOF
fi

if [[ -n "${UITEST_HOST_BUNDLE_ID:-}" ]]; then
  echo "UITEST_HOST_BUNDLE_ID=$UITEST_HOST_BUNDLE_ID"
  echo "UITEST_HOST_DISPLAY_NAME=${UITEST_HOST_DISPLAY_NAME:-}"
  echo "UITEST_EXTENSION_NAME=$UITEST_EXTENSION_NAME"
  echo "UITEST_EXTENSION_BUNDLE_ID=${UITEST_EXTENSION_BUNDLE_ID:-}"
fi

echo "C1 gate: re-run prebuild and confirm this target still works or re-attach cleanly."
