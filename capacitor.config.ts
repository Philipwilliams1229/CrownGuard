import type { CapacitorConfig } from "@capacitor/cli";

// The iOS app (and one day the Android one): Capacitor wraps the same Vite
// build the web game ships (dist/) in a native web view. See APP-STORE.md for
// how a build reaches the App Store, and CLAUDE.md "The iOS app".
//
// Never change appId once the app is on the store: it IS the app's identity
// there. Never set server.hostname / iosScheme either: they make the page's
// origin, and a new origin starts with empty storage (src/native/keep.js would
// restore the save, but there is no reason to test it).
const config: CapacitorConfig = {
  appId: "com.philipwilliams.crownguard",
  appName: "Crownguard",
  webDir: "dist",
  // the game's own background (index.html), so no white flash while it loads
  backgroundColor: "#20242c",
  ios: {
    // the page runs under the notch and home bar and pads itself with
    // env(safe-area-inset-*), as it does on a home-screen install
    contentInset: "never",
    // every screen fits the window; nothing should rubber-band
    scrollEnabled: false,
  },
};

export default config;
