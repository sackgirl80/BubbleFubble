const SEARCH_TERMS = [
  'cute kitten',
  'cute puppy',
  'funny cat',
  'funny dog',
  'adorable bunny',
  'baby animals',
  'cute hamster',
  'baby duck',
  'cute hedgehog',
  'baby otter',
  'cute red panda',
  'cute fox',
  'baby penguin',
  'cute owl',
  'baby elephant',
  'cute raccoon',
  'funny squirrel',
  'baby deer',
  'cute koala',
  'baby seal',
];

async function fetchFromPexels(apiKey) {
  const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  const page = Math.floor(Math.random() * 10) + 1;
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(term)}&per_page=15&page=${page}`;

  const res = await fetch(url, {
    headers: { Authorization: apiKey },
  });

  if (!res.ok) {
    throw new Error(`Pexels API error: ${res.status}`);
  }

  const data = await res.json();
  if (!data.photos || data.photos.length === 0) {
    throw new Error(`Pexels: no photos found for "${term}" page ${page}`);
  }

  const photo = data.photos[Math.floor(Math.random() * data.photos.length)];
  return {
    id: `pexels-${photo.id}`,
    url: photo.src.large,
    source: 'pexels',
    animal: term,
  };
}

async function fetchFromCatApi() {
  const res = await fetch('https://api.thecatapi.com/v1/images/search');

  if (!res.ok) {
    throw new Error(`Cat API error: ${res.status}`);
  }

  const data = await res.json();
  if (!data.length) {
    throw new Error('Cat API: no images returned');
  }

  return {
    id: `cat-${data[0].id}`,
    url: data[0].url,
    source: 'catapi',
    animal: 'cat',
  };
}

async function fetchFromDogApi() {
  const res = await fetch('https://random.dog/woof.json?filter=mp4,webm');

  if (!res.ok) {
    throw new Error(`Dog API error: ${res.status}`);
  }

  const data = await res.json();
  const ext = data.url.split('.').pop().toLowerCase();

  if (!['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
    throw new Error(`Dog API: unsupported format .${ext}`);
  }

  const filename = data.url.split('/').pop();
  return {
    id: `dog-${filename}`,
    url: data.url,
    source: 'randomdog',
    animal: 'dog',
  };
}

const SOURCES = [
  { name: 'pexels', weight: 50, fetch: fetchFromPexels },
  { name: 'catapi', weight: 25, fetch: fetchFromCatApi },
  { name: 'randomdog', weight: 25, fetch: fetchFromDogApi },
];

async function fetchRandomAnimal(apiKey) {
  // Weighted random selection
  const roll = Math.random() * 100;
  let cumulative = 0;
  let primaryIndex = 0;
  for (let i = 0; i < SOURCES.length; i++) {
    cumulative += SOURCES[i].weight;
    if (roll < cumulative) {
      primaryIndex = i;
      break;
    }
  }

  // Try primary source, then fall back to others
  const order = [
    primaryIndex,
    ...SOURCES.map((_, i) => i).filter((i) => i !== primaryIndex),
  ];

  for (const i of order) {
    try {
      const source = SOURCES[i];
      const args = source.name === 'pexels' ? [apiKey] : [];
      return await source.fetch(...args);
    } catch (err) {
      console.warn(`Source ${SOURCES[i].name} failed: ${err.message}`);
    }
  }

  throw new Error('All image sources failed');
}

module.exports = { fetchRandomAnimal };
