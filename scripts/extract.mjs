import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('/Users/georgeouzounis/Documents/projects/just-keep-clicking/data/hyperevm.ts', 'utf8');

// Strip the TS-only import line so we can eval the array
const cleaned = src
  .replace(/^import[^\n]*\n/gm, '')
  .replace(/:\s*RawProject\[\]/g, '')
  .replace(/:\s*Record<string,\s*string>/g, '')
  .replace(/export\s+const\s+/g, 'const ');

const wrapper = `${cleaned}\nreturn { hyperevmProjects };`;
const { hyperevmProjects } = new Function(wrapper)();

const EXCLUDED = new Set([
  'Altitude', 'Arcex', 'Azura', 'Bounce.Tech', 'Cod3x', 'Cro.trade',
  'Defined', 'Definitive', 'Dexly.Trade', 'Ecliptica', 'EzPairs', 'FOMO',
  'Fullstack.Trade', 'HiveFi', 'HyperETH', 'Hypernova', 'HyperPNL',
  'HyprEarn', 'Infinex', 'Junction', 'Katoshi', 'Keel', 'Lighthouse.one',
  'Lit', 'MetaScalp', 'Mintify', 'Moonbot', 'Nimbus Trade', 'Perpmate',
  'Quote', 'OpenPond AI', 'Papertrade.xyz', 'SIR', 'Snakehead', 'Stratium',
  'Supurr.app', 'The Arena', 'UXUY', 'Valiant', 'Ventuals', 'VibeLiquid',
  'Vooi', 'WunderTrading',
]);

const FORCE_INCLUDE = new Set([
  'Phantom', 'Rabby Wallet', 'OneKey', 'Trust Wallet', 'Tria',
]);

const EXTRA = [
  {
    name: 'MetaMask',
    description: 'The most-used self-custody wallet. The leading wallet in DeFi and Web3.',
    status: 'Live',
    website: 'https://metamask.io/',
    logo: '',
    xHandle: 'MetaMask',
    categories: ['Wallet'],
  },
];

const allProjects = [...hyperevmProjects, ...EXTRA];

const frontEnds = allProjects
  .filter(p =>
    (Array.isArray(p.categories) && p.categories.includes('Front-End')) ||
    FORCE_INCLUDE.has(p.name) ||
    p.name === 'MetaMask',
  )
  .filter(p => !EXCLUDED.has(p.name))
  .map(p => {
    const link = p.website || (p.links && p.links[0] && p.links[0].url) || '';
    const handle = (p.xHandle || '').replace(/^@/, '');
    return {
      id: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      name: p.name,
      description: p.description,
      status: p.status,
      url: link,
      logo: handle ? `https://unavatar.io/x/${handle}` : '',
      xHandle: handle,
      categories: p.categories,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(
  '/Users/georgeouzounis/Documents/projects/voting-site/lib/projects.ts',
  `// Auto-generated. Do not edit by hand.\nexport type Project = {\n  id: string;\n  name: string;\n  description: string;\n  status: string;\n  url: string;\n  logo: string;\n  xHandle: string;\n  categories: string[];\n};\n\nexport const projects: Project[] = ${JSON.stringify(frontEnds, null, 2)};\n`,
);

console.log(`Wrote ${frontEnds.length} front-end projects.`);
