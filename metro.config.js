const { getSentryExpoConfig } = require('@sentry/react-native/metro')

module.exports = (() => {
  const config = getSentryExpoConfig(__dirname)
  config.resolver.assetExts.push('env')
  return config
})()
