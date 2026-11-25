// One place for the brand used by the landing page.
// Links and the token contract can also be set in .env (VITE_X_URL, VITE_TELEGRAM_URL, VITE_TOKEN_CA).
const env = import.meta.env

export const BRAND = {
  name: 'Upwell',
  tagline: 'Where early calls rise.',
  token: 'UPW', // shown as $UPW
  appUrl: 'app.upwell.xyz',

  // $UPW contract address on BNB Chain. Empty until the token is launched.
  ca: env.VITE_TOKEN_CA || '',
  // Where to buy $UPW (e.g. its Flap.sh page). Empty until launch.
  buyUrl: env.VITE_BUY_URL || '',

  // Official community links. Empty = shown as "coming soon".
  x: env.VITE_X_URL || '',
  telegram: env.VITE_TELEGRAM_URL || '',
}
