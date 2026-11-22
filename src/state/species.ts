export type Category = 'focal' | 'secondary' | 'filler' | 'accent'

export interface SpeciesInfo {
  name: string
  category: Category
  meaning: string
  presets: [string, string][]
  scale: number
}

const s = (name: string, category: Category, meaning: string, presets: [string, string][], scale = 1): SpeciesInfo => ({ name, category, meaning, presets, scale })

export const SPECIES = {
  rose: s('Rose', 'focal', 'Love and deep affection', [['#b3123b', '#e0476b'], ['#f4a7b9', '#ffe1ea'], ['#fff6ee', '#f3e2d0'], ['#f6c945', '#fff1b8'], ['#f27d52', '#ffd0a8']]),
  'garden-rose': s('Garden rose', 'focal', 'Romance and gratitude', [['#f3b6b8', '#fde6df'], ['#e9a27a', '#fbe0c8'], ['#fffaf2', '#f1e3d3'], ['#c9506d', '#f3a5b7']], 1.1),
  peony: s('Peony', 'focal', 'Prosperity and a happy marriage', [['#f6a6c1', '#ffe0ec'], ['#d93a6e', '#f59ab7'], ['#fff3f3', '#f7d5dc'], ['#f7c3a3', '#fde9da']], 1.15),
  ranunculus: s('Ranunculus', 'focal', 'You are radiant and charming', [['#f58d6e', '#fdd3bf'], ['#ffd34e', '#fff3c0'], ['#e85f8f', '#fcc8da'], ['#fdf8ef', '#f0e0cf']], 0.85),
  tulip: s('Tulip', 'focal', 'Perfect, enduring love', [['#e8344b', '#ff8c8f'], ['#ffd23f', '#fff0a6'], ['#c66bd6', '#efc2f6'], ['#ffffff', '#f6eadb'], ['#ff8a3d', '#ffd36b']], 0.9),
  lily: s('Lily', 'focal', 'Purity and renewal', [['#fffaf5', '#f4dcd2'], ['#f58fb2', '#fff0f5'], ['#ff8f3d', '#ffd09a']], 1.1),
  orchid: s('Orchid', 'focal', 'Luxury, strength and beauty', [['#fbf7fb', '#d872b8'], ['#c84ba0', '#f2b6dd'], ['#f6e86b', '#c64f7a']], 1.0),
  sunflower: s('Sunflower', 'focal', 'Adoration and loyalty', [['#ffc21a', '#f59a00'], ['#ffdc5e', '#ffb100'], ['#d66a1c', '#ffae3b']], 1.15),
  hydrangea: s('Hydrangea', 'focal', 'Heartfelt gratitude', [['#8fb4ef', '#d7c4f4'], ['#f2b6d4', '#fde4f0'], ['#f3f6f8', '#d7e8d3'], ['#a78bd8', '#e5d9f8']], 1.15),
  protea: s('Protea', 'focal', 'Courage and transformation', [['#ec9cb4', '#fbe0e7'], ['#d7564f', '#f6b8a3'], ['#f4efe4', '#d8c6aa']], 1.1),
  dahlia: s('Dahlia', 'focal', 'Commitment and kindness', [['#9b1239', '#e04a6d'], ['#f6a96d', '#fde0c5'], ['#f5f0e6', '#f6c9d4'], ['#ffcb3c', '#ff7a3c']], 1.0),
  anemone: s('Anemone', 'focal', 'Anticipation and protection', [['#fbfbfa', '#ececec'], ['#d3204a', '#f5768d'], ['#4a4ba8', '#9a8de0']], 0.9),
  calla: s('Calla lily', 'focal', 'Magnificent beauty', [['#fdfcf8', '#eef3df'], ['#ffd54a', '#fff2a8'], ['#5c1a3d', '#a8326c'], ['#f4a3b8', '#fde2ea']], 0.95),
  lotus: s('Lotus', 'focal', 'Rebirth and enlightenment', [['#fde7ef', '#e8688f'], ['#fffdf7', '#f8e7c9']], 1.1),
  gumamela: s('Gumamela', 'focal', 'Delicate beauty and warm welcome', [['#e4203a', '#ff7c6d'], ['#ff8bb3', '#ffe0ec'], ['#ffd24c', '#ff8a3a']], 1.1),
  sampaguita: s('Sampaguita', 'focal', 'Devotion and pure love', [['#ffffff', '#f6f6ea']], 0.6),
  carnation: s('Carnation', 'secondary', 'Fascination and a mother’s love', [['#f05b7a', '#ffc3d0'], ['#fdf8f2', '#f3dfe4'], ['#c61e3c', '#f15c76'], ['#f7d2a6', '#fff0dd']], 0.85),
  daisy: s('Daisy', 'secondary', 'Innocence and new beginnings', [['#ffffff', '#fff6f0'], ['#ffd3e5', '#ffffff']], 0.75),
  gerbera: s('Gerbera', 'secondary', 'Cheerfulness', [['#ff6c3a', '#ffb24f'], ['#ff5f8e', '#ffc2d4'], ['#ffd33a', '#fff19a'], ['#fefefe', '#f7f0e3']], 0.95),
  lavender: s('Lavender', 'secondary', 'Serenity and devotion', [['#8d72c9', '#c9b5ef'], ['#a68ad9', '#e3d6f7']], 0.9),
  lisianthus: s('Lisianthus', 'secondary', 'Appreciation and charisma', [['#fdfbf7', '#c8a8e6'], ['#8a5cc7', '#d9c3f2'], ['#f6c8d6', '#fff0f4']], 0.85),
  freesia: s('Freesia', 'secondary', 'Trust and friendship', [['#ffe36b', '#fff6c4'], ['#f7a8c4', '#fde3ec'], ['#fdfbf5', '#f1eadf']], 0.85),
  cosmos: s('Cosmos', 'secondary', 'Order, harmony and peace', [['#f37ab0', '#ffd5e7'], ['#ffffff', '#fbe7f0'], ['#c13f75', '#f290ba']], 0.8),
  'forget-me-not': s('Forget-me-not', 'secondary', 'True love and memories', [['#79a8f2', '#c7dcff'], ['#f3a7cf', '#ffd9eb']], 0.7),
  'babys-breath': s('Baby’s breath', 'filler', 'Everlasting love', [['#fdfdfb', '#f2f2ea'], ['#f6d3e2', '#fdf0f5']], 0.9),
  eucalyptus: s('Eucalyptus', 'filler', 'Protection and healing', [['#7d9c94', '#a9c2b8'], ['#6a8a7a', '#9ab5a4']], 1.0),
  fern: s('Fern', 'filler', 'Sincerity and shelter', [['#3f7d3a', '#78b062'], ['#2f6d3c', '#5f9a55']], 1.0),
  ruscus: s('Ruscus', 'filler', 'Constancy', [['#2f6a32', '#5a9446']], 1.0),
  pampas: s('Pampas grass', 'filler', 'Liveliness and good fortune', [['#e9dcc4', '#f8f0e1'], ['#e6c3c3', '#f7e6e2'], ['#cdb68f', '#ece0c6']], 1.1),
  'wax-flower': s('Wax flower', 'filler', 'Lasting success', [['#f7c9d9', '#ffffff'], ['#d55a8a', '#f7b9cf'], ['#fffdf9', '#f4ecdf']], 0.85),
  monstera: s('Monstera leaf', 'filler', 'Honour and longevity', [['#2c6b3a', '#4f9a52']], 1.2),
  olive: s('Olive branch', 'filler', 'Peace and friendship', [['#7b8f6b', '#b4c1a0']], 1.0),
  chocolate: s('Chocolate', 'accent', 'A sweet little treat', [['#d9a63d', '#6b3a1f'], ['#c8c8c8', '#5a321a'], ['#c94d6b', '#4a2716']], 0.6),
  'fairy-lights': s('Fairy lights', 'accent', 'You light up my life', [['#ffd98a', '#7a6650'], ['#ffe8f1', '#c7c7c7']], 1.0),
  butterfly: s('Butterfly', 'accent', 'Transformation and joy', [['#6db6ff', '#1b2b4a'], ['#ff9f43', '#2a1a10'], ['#f7a8d0', '#4a2440']], 0.6),
  plush: s('Plush charm', 'accent', 'A hug from me to you', [['#b98a62', '#f1dcc4'], ['#f3f0ea', '#f5c5d2'], ['#f5b5c8', '#fff0f4']], 0.7),
  polaroid: s('Photo pick', 'accent', 'A moment we share', [['#fbfaf6', '#d8d4cc']], 0.8),
  cotton: s('Cotton', 'accent', 'Comfort and gentleness', [['#fbfaf6', '#6a4a30']], 0.85),
  dried: s('Dried flowers', 'accent', 'Love that lasts', [['#c9a27e', '#e8d2b3'], ['#b26b6b', '#e2b7a5'], ['#8f8a5a', '#cfc79c']], 0.9),
} satisfies Record<string, SpeciesInfo>

export type SpeciesId = keyof typeof SPECIES

export const SPECIES_IDS = Object.keys(SPECIES) as [SpeciesId, ...SpeciesId[]]

export const FLOWER_COUNT = SPECIES_IDS.filter((id) => SPECIES[id].category === 'focal' || SPECIES[id].category === 'secondary').length
