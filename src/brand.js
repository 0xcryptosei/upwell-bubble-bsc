// One place for the brand.
// The $UPW contract address and buy link are NOT stored here: they come only from the backend (its upw.json file).
// The X / Telegram links below are fallbacks for when the server cannot be reached (the backend's values win).
const env = import.meta.env

export const BRAND = {
  name: 'Upwell',
  tagline: 'Where early calls rise.',
  token: 'UPW', // shown as $UPW
  appUrl: 'app.upwell.xyz',

  // Official community links
  x: env.VITE_X_URL || 'https://x.com/upwellpro',
  telegram: env.VITE_TELEGRAM_URL || 'https://t.me/upwellorg',
}
