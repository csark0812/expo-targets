const { getDefaultConfig } = require('expo/metro-config');
const { withTargetsMetro } = require('expo-targets/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// Support symlinked packages (bun workspaces)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Apply expo-targets Metro wrapper (required for React Native extensions)
module.exports = withTargetsMetro(config, {
  projectRoot,
});

