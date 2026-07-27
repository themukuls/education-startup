// ParentProof design tokens — extracted from the ParentProof.dc.html design canvas.
// Single source of truth for colours + fonts used across the screens.

export const c = {
  // Warm paper / surfaces
  paper: '#E7E0D4',
  paperHi: '#F0EADD',
  paperLo: '#DED6C7',
  surface: '#FBF8F2', // primary app card surface
  home: '#F4EFE6', // home / settings surface
  white: '#FFFFFF',

  // Ink
  ink: '#1E1B16',
  ink2: '#5E574B',
  ink3: '#8A8172',
  ink4: '#B0A794',

  // Lines
  line: '#E7E1D8',
  line2: '#EAE3D8',
  line3: '#E0D8CB',
  divider: '#EFE9DE',

  // Cobalt (brand)
  blue: '#2354C7',
  blueDeep: '#163A8F',
  blueMid: '#3F5BC0',
  blueLight: '#6E8CEA',
  blueWash: '#E6ECFA',
  blueBorder: '#C6D2F2',
  blueInk: '#A9BCF0',

  // Amber (streak / secondary accent)
  amber: '#E0A020',
  amberDeep: '#B36E17',
  amberDark: '#8A5A12',
  amberWash: '#FBEFD9',

  // Risk / gap red
  red: '#B44A32',
  redAlt: '#C0492F',
  redInk: '#7A3A28',
  redInk2: '#8A3826',
  redWash: '#F6E5DF',
  redBorder: '#EAC9BE',

  // Kid / dark navy palette
  navy: '#161B3E',
  navy2: '#12152E',
  navy3: '#0D0F26',
  navyText: '#F1F7F4',
  navyMute: '#97A8E2',
  navyBright: '#D4DDF6',
  navySoft: '#BCC9F4',

  // Cream text on dark cards
  cream: '#F3EEE4',
  creamMute: '#B9A88C',
} as const

export const serif = "'Newsreader Variable', 'Newsreader', Georgia, 'Times New Roman', serif"
export const sans = "'Hanken Grotesk Variable', 'Hanken Grotesk', system-ui, -apple-system, sans-serif"

// Reusable phone-frame background helpers
export const paperGradient =
  'radial-gradient(1200px 800px at 20% -10%, #F0EADD 0%, #E7E0D4 55%, #DED6C7 100%)'
