import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native iOS / Android shell for Cricket Auction Pro.
 *
 * The app loads the live production site so that the secure session cookie
 * (`__Host-cap_session`) and the server's APP_ORIGIN check keep working exactly
 * like they do in the browser — no backend changes are needed.
 *
 * Point the shell at another server (e.g. a LAN dev server) with:
 *   CAP_SERVER_URL=http://192.168.1.10:5174 npx cap sync
 */
const APP_URL = (process.env.CAP_SERVER_URL || 'https://auctionpro.yogeshaihub.in').replace(/\/$/, '');
const APP_HOST = new URL(APP_URL).host;
const BG = '#04070D';

const config: CapacitorConfig = {
  appId: 'in.yogeshaihub.auctionpro',
  appName: 'Auction Pro',
  webDir: 'mobile-shell',
  backgroundColor: BG,
  server: {
    url: APP_URL,
    // Bundled screen shown when the server can't be reached (no internet, server down).
    errorPath: 'offline.html',
    allowNavigation: [APP_HOST],
    cleartext: APP_URL.startsWith('http://'),
  },
  ios: {
    // Keep page content inside the notch / Dynamic Island / home-indicator safe area.
    contentInset: 'automatic',
    backgroundColor: BG,
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: BG,
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      launchFadeOutDuration: 400,
      backgroundColor: BG,
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK', // light icons on the dark obsidian UI
      backgroundColor: BG,
      overlaysWebView: false,
    },
    SystemBars: {
      insetsHandling: 'native',
      style: 'DARK',
    },
  },
};

export default config;
