// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// The pure rules engine lives at packages/engine (inside the project root, so
// Metro already watches it). Alias the bare specifier so the app and the future
// Convex backend both import the exact same source — one rule set, two runtimes.
// Mirror of the `@monopoly/engine` path in tsconfig.json.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@monopoly/engine': path.resolve(__dirname, 'packages/engine/src'),
};

module.exports = config;
