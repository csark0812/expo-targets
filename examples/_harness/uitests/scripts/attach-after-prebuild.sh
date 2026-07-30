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

mkdir -p "$DEST_DIR"
cp "$HARNESS_DIR/ShareSheetSmoke.swift" "$DEST_DIR/ShareSheetSmoke.swift"

# Prefer ruby + xcodeproj when available; otherwise print manual Xcode steps.
if command -v ruby >/dev/null 2>&1 && ruby -e "require 'xcodeproj'" 2>/dev/null; then
  ruby <<RUBY
require 'xcodeproj'
require 'pathname'

example = Pathname.new('$EXAMPLE_DIR')
ios = example.join('ios')
projects = Dir.glob(ios.join('*.xcodeproj').to_s)
abort "no xcodeproj under #{ios}" if projects.empty?
project = Xcodeproj::Project.open(projects.first)
host = project.targets.find { |t| t.product_type == 'com.apple.product-type.application' }
abort 'no application target' unless host

name = 'ExpoTargetsShareSheetUITests'
existing = project.targets.find { |t| t.name == name }
unless existing
  target = project.new_target(:ui_test_bundle, name, :ios, '15.1')
  target.add_dependency(host)
  target.build_configurations.each do |config|
    config.build_settings['TEST_TARGET_NAME'] = host.name
    config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
    config.build_settings['GENERATE_INFOPLIST_FILE'] = 'YES'
  end
  group = project.main_group.find_subpath('ExpoTargetsShareSheetUITests', true)
  group.set_source_tree('SOURCE_ROOT')
  group.set_path('ExpoTargetsShareSheetUITests')
  ref = group.new_file('ExpoTargetsShareSheetUITests/ShareSheetSmoke.swift')
  target.add_file_references([ref])
  project.save
  puts "added UI test target #{name} -> #{host.name}"
else
  puts "UI test target #{name} already present"
end
RUBY
else
  cat <<EOF
Copied ShareSheetSmoke.swift to $DEST_DIR

ruby gem 'xcodeproj' not available. Manual attach:
  1. Open $IOS_DIR/*.xcworkspace in Xcode
  2. File → New → Target → UI Testing Bundle → ExpoTargetsShareSheetUITests
  3. Add ShareSheetSmoke.swift from ExpoTargetsShareSheetUITests/
  4. Set UITEST_HOST_BUNDLE_ID / UITEST_EXTENSION_NAME in the scheme environment
EOF
fi

case "$EXAMPLE_REL" in
  examples/share)
    echo "export UITEST_HOST_BUNDLE_ID=com.expotargets.example.share"
    echo "export UITEST_EXTENSION_NAME='Example Share'"
    ;;
  examples/action)
    echo "export UITEST_HOST_BUNDLE_ID=com.expotargets.example.action"
    echo "export UITEST_EXTENSION_NAME='Example Action'"
    ;;
  examples/native/share)
    echo "export UITEST_HOST_BUNDLE_ID=com.expotargets.example.native.share"
    echo "export UITEST_EXTENSION_NAME='Native Share'"
    ;;
  examples/native/action)
    echo "export UITEST_HOST_BUNDLE_ID=com.expotargets.example.native.action"
    echo "export UITEST_EXTENSION_NAME='Native Action'"
    ;;
esac

echo "C1 gate: re-run prebuild and confirm this target still works or re-attach cleanly."
