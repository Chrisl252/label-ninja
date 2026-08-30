/**
 * Adsterra display units for label-ninja.com.
 * Keys from the publisher dashboard 2026-08-29.
 *
 * Display banners only. Do not add Popunder, Social Bar, or Smartlink here
 * while the site is in Google AdSense qualification.
 */
export const ADS = {
  enabled: true,
  invokeHost: "https://thrillingdeepcutlery.com",

  leaderboard: [
    { key: "87ceb287cd55c02c4725e2c482ffd379", width: 728, height: 90, minWidth: 768 },
  ],

  rectangle: [
    { key: "b47773d97fcbb57140d6193f0271ce25", width: 300, height: 250, minWidth: 0 },
  ],

  // invoke.js uses document.write. allow-same-origin is required or Adsterra
  // anti-fraud serves a blank frame.
  sandbox: "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms",
};
