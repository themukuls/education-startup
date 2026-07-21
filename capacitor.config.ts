import type { CapacitorConfig } from '@capacitor/cli'

// Capacitor wraps the compiled web build (webDir) into native iOS / Android
// shells with no code changes. To generate the native projects later:
//
//   npm i -D @capacitor/cli && npm i @capacitor/core @capacitor/ios @capacitor/android
//   npm run build
//   npx cap add ios && npx cap add android
//   npx cap sync
//
// The app already uses a hash router and a relative Vite `base`, both of
// which are required for the file:// origin Capacitor serves from.
const config: CapacitorConfig = {
  appId: 'com.parentproof.app',
  appName: 'ParentProof',
  webDir: 'dist',
  backgroundColor: '#E7E0D4',
}

export default config
