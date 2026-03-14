'use strict'
// Notarization hook for electron-builder (afterSign).
// Only runs when APPLE_ID env var is set; skipped for dev/local builds.

const { notarize } = require('@electron/notarize')

module.exports = async function afterSign(context) {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName !== 'darwin') return

  if (!process.env.APPLE_ID) {
    console.log('[notarize] Skipping: APPLE_ID not set')
    return
  }

  const appName = context.packager.appInfo.productFilename
  const appPath = `${appOutDir}/${appName}.app`

  console.log(`[notarize] Notarizing ${appPath}…`)

  await notarize({
    appBundleId: 'com.system.setting',
    appPath,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID
  })

  console.log('[notarize] Done.')
}
