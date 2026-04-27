const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Алиас "@" -> "./src" для импортов вида "@/components/..."
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  '@': path.resolve(__dirname, 'src'),
};

module.exports = config;
