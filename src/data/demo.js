// All names are fictional. Demo data only.

// [symbol, name, source, market cap, 24h %, 24h volume, holders, safety score]
export const TOKENS = [
  ['MOCHI', 'Mochi Tide', 'Flap', 1.84e6, 38.2, 920e3, 4120, 72, 184],
  ['KOI', 'Koi Pond', 'four.meme', 4.9e6, 12.4, 1.7e6, 9840, 81],
  ['TIDE', 'Tidewater', 'PancakeSwap', 12.6e6, -4.8, 2.9e6, 22100, 88],
  ['PEARL', 'Pearl Diver', 'Flap', 620e3, 64.5, 540e3, 1680, 58, 46],
  ['BRINE', 'Brine Shrimp', 'four.meme', 310e3, -22.6, 210e3, 940, 34],
  ['NAUTI', 'Nautilus', 'PancakeSwap', 7.2e6, 6.1, 1.2e6, 15200, 90],
  ['CORAL', 'Coral Bloom', 'Flap', 2.3e6, -9.3, 760e3, 5300, 66],
  ['KELP', 'Kelp Forest', 'four.meme', 980e3, 18.7, 430e3, 2900, 74],
  ['DRIFT', 'Driftwood', 'Flap', 440e3, -14.1, 250e3, 1210, 47],
  ['ORCA', 'Orca Pod', 'PancakeSwap', 21.4e6, 2.3, 3.8e6, 31800, 93],
  ['SHOAL', 'Shoal', 'four.meme', 1.2e6, -3.2, 380e3, 3600, 69],
  ['LAGO', 'Lagoon', 'Flap', 760e3, 27.9, 480e3, 2240, 77],
  ['FATHOM', 'Fathom', 'PancakeSwap', 3.6e6, -11.8, 690e3, 8100, 85],
  ['REEF', 'Reef Runner', 'four.meme', 540e3, 9.6, 260e3, 1730, 61],
  ['MANTA', 'Manta Glide', 'Flap', 2.9e6, 15.2, 1.05e6, 6400, 79],
  ['BUOY', 'Buoy', 'four.meme', 260e3, -31.4, 190e3, 820, 29],
  ['SPLASH', 'Splash', 'Flap', 1.5e6, 46.8, 880e3, 3950, 71, 95],
  ['QUAY', 'Quay Club', 'PancakeSwap', 890e3, -1.7, 220e3, 2700, 83],
]

export const NEW_LISTINGS = [
  ['WAVELET', 'Wavelet', 'Flap'], ['MIST', 'Sea Mist', 'Flap'], ['LUMEN', 'Lumen Fish', 'four.meme'],
  ['PUDDLE', 'Puddle', 'Flap'], ['ECHO', 'Echo Bay', 'PancakeSwap'], ['NEREID', 'Nereid', 'Flap'],
  ['SURF', 'Surf Line', 'four.meme'], ['GLIDE', 'Glide', 'Flap'], ['ISLET', 'Islet', 'Flap'], ['ROCKPOOL', 'Rockpool', 'four.meme'],
]

export const SOURCES = ['All', 'four.meme', 'Flap', 'PancakeSwap', 'Uniswap']

export const HUES = [
  ['#5FD6F2', '#0A8BD0'], ['#7FD8E6', '#0E7C99'], ['#8EC5E8', '#2F6FA8'], ['#6FE0D2', '#11897E'],
  ['#9DB8D6', '#3B5B85'], ['#5BC0EB', '#0B5F8F'], ['#A6D8EE', '#4C87A6'],
]

export const PEOPLE = [
  { name: '0xAce', tier: 'Legend', c: ['#FFD38A', '#C98A00'] },
  { name: 'tidewatcher.bnb', tier: 'Legend', c: ['#7FD8E6', '#0E7C99'] },
  { name: 'koi_sniper', tier: 'Sniper', c: ['#8EC5E8', '#2F6FA8'] },
  { name: '0x91F…a2', tier: 'Sniper', c: ['#6FE0D2', '#11897E'] },
  { name: 'deepblue.bnb', tier: 'Sniper', c: ['#5BC0EB', '#0B5F8F'] },
  { name: 'pearlhunter', tier: 'Hunter', c: ['#9DB8D6', '#3B5B85'] },
  { name: 'reefcaller', tier: 'Hunter', c: ['#A6D8EE', '#4C87A6'] },
  { name: '0xD3e…77', tier: 'Hunter', c: ['#5FD6F2', '#0A8BD0'] },
  { name: 'mantaray.bnb', tier: 'Hunter', c: ['#7FD8E6', '#0E7C99'] },
  { name: 'quietwater', tier: 'Rookie', c: ['#8EC5E8', '#2F6FA8'] },
  { name: 'shoalseer', tier: 'Hunter', c: ['#6FE0D2', '#11897E'] },
  { name: '0x5bC…e0', tier: 'Rookie', c: ['#9DB8D6', '#3B5B85'] },
]

export const ME = { name: 'you.bnb', tier: 'Hunter', c: ['#5FD6F2', '#0A6FAF'], address: '0x7a3F…1c3F', fullAddress: '0x7a3F9c2E41d0b8A56e17f3D2c9B04aE51b7c1c3F' }

export const TICKER = [
  ['0xAce', 'MOCHI', '6.6x'], ['koi_sniper', 'SPLASH', '4.2x'], ['tidewatcher.bnb', 'PEARL', '3.8x'], ['0x91F…a2', 'LAGO', '2.9x'],
  ['deepblue.bnb', 'KELP', '2.4x'], ['reefcaller', 'MANTA', '1.9x'], ['pearlhunter', 'KOI', '1.6x'], ['0xD3e…77', 'REEF', '1.4x'],
  ['you.bnb', 'SPLASH', '2.26x'], ['shoalseer', 'CORAL', '1.3x'],
]

export const TF_MS = { '1h': 3600e3, '24h': 86400e3, '7d': 604800e3 }

export function initialCalls(now = Date.now()) {
  return {
    live: [
      { id: 'c1', sym: 'KOI', tf: '24h', entry: 4.1e6, start: now - 9.2 * 3600e3 },
      { id: 'c2', sym: 'LAGO', tf: '1h', entry: 640e3, start: now - 38 * 60e3 },
      { id: 'c3', sym: 'NAUTI', tf: '7d', entry: 6.9e6, start: now - 2.4 * 86400e3 },
    ],
    done: [
      { id: 'd1', sym: 'SPLASH', tf: '24h', entry: 420e3, exit: 949e3, won: true },
      { id: 'd2', sym: 'ORCA', tf: '7d', entry: 19.8e6, exit: 21.1e6, won: false },
      { id: 'd3', sym: 'PEARL', tf: '1h', entry: 310e3, exit: 512e3, won: true },
      { id: 'd4', sym: 'BUOY', tf: '24h', entry: 380e3, exit: 261e3, won: false },
      { id: 'd5', sym: 'MANTA', tf: '24h', entry: 1.6e6, exit: 2.9e6, won: true },
      { id: 'd6', sym: 'KELP', tf: '1h', entry: 720e3, exit: 905e3, won: true },
    ],
  }
}
