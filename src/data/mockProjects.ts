import { Project } from '@/types/Project';

export const mockProjects: Project[] = [
  {
    id: 'prismical-website',
    title: 'Prismical Website',
    description:
      'A 3D integrated commercial website showcasing custom manufactured products with real-time WebGL rendering, custom materials, and smooth spatial transitions.',
    image:
      'https://cdn.sanity.io/images/o2c2iejq/production/480c64d97a38e999b7d5e046c46c6002e17dd0e0-5940x4320.png?w=1200',
    live_link: 'https://prismical.com',
    tags: ['Three.js', 'React', 'WebGL', 'TailwindCSS'],
    is_featured: true,
  },
  {
    id: 'personal-website',
    title: 'Personal Station Portfolio',
    description:
      'An interactive 3D space station portfolio where visitors explore virtual modules, play retro arcade cabinets, and drive through an interactive project map grid.',
    image:
      'https://cdn.sanity.io/images/o2c2iejq/production/d35839f9dda5424670f36361aef75abed053f6c4-1500x1125.png?w=1200',
    github_repo: 'https://www.github.com/alcolopa/personal',
    live_link: 'https://emilioelmurr.com',
    tags: ['React', 'TypeScript', 'Three.js', 'Sanity.io', 'TailwindCSS'],
    is_featured: true,
  },
  {
    id: 'nebula-orbital-command',
    title: 'Nebula Orbital Command',
    description:
      'Next-generation space telemetry command center. Visualizes orbital trajectories, spacecraft solar panel efficiency, telemetry telemetry streams, and orbital docking vectors in full 3D.',
    image:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop',
    github_repo: 'https://github.com/alcolopa/nebula-orbital-command',
    live_link: 'https://demo-orbital-station.vercel.app',
    tags: ['Three.js', 'WebGL', 'TypeScript', 'React', 'GLSL Shaders'],
    is_featured: true,
  },
  {
    id: 'neon-cyber-arcade',
    title: 'Neon Cyber Arcade',
    description:
      'Retro-futuristic arcade game collection and cabinet simulator. Features classic mini-games with custom CRT scanline filters, procedural chiptune audio synthesizers, and touch controls.',
    image:
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200&auto=format&fit=crop',
    github_repo: 'https://github.com/alcolopa/cyber-arcade-retro',
    live_link: 'https://demo-cyber-arcade.vercel.app',
    tags: ['Canvas 2D', 'Web Audio API', 'React', 'Vite'],
    is_featured: false,
  },
  {
    id: 'aether-quantum-studio',
    title: 'Aether Quantum Studio',
    description:
      'Interactive visual laboratory exploring generative neural synthesis, audio-reactive node networks, and mathematical particle systems powered by WebGPU compute shaders.',
    image:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
    github_repo: 'https://github.com/alcolopa/aether-quantum-studio',
    live_link: 'https://demo-aether-quantum.vercel.app',
    tags: ['Next.js', 'WebGPU', 'PyTorch', 'TailwindCSS'],
    is_featured: true,
  },
  {
    id: 'echopulse-synth',
    title: 'EchoPulse Modular Synthesizer',
    description:
      'Browser-native polyphonic modular synthesizer featuring anti-aliased oscillators, resonant ladder filters, real-time FFT spectrum visualizer, and customizable step sequencer.',
    image:
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=1200&auto=format&fit=crop',
    github_repo: 'https://github.com/alcolopa/echopulse-modular-synth',
    live_link: 'https://demo-echopulse-synth.vercel.app',
    tags: ['Web Audio API', 'AudioWorklet', 'React', 'DSP'],
    is_featured: false,
  },
  {
    id: 'vanguard-autonomous-fleet',
    title: 'Vanguard Autonomous Fleet',
    description:
      'Real-time command center for planetary exploration rovers and drone fleets. Visualizes live sensor telemetry, lidar point clouds, terrain maps, and automated route planning.',
    image:
      'https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=1200&auto=format&fit=crop',
    github_repo: 'https://github.com/alcolopa/vanguard-autonomous-fleet',
    live_link: 'https://demo-vanguard-fleet.vercel.app',
    tags: ['Three.js', 'WebSockets', 'GeoJSON', 'React', 'TailwindCSS'],
    is_featured: true,
  },
];

export function mergeWithMockProjects(sanityProjects: Project[] = []): Project[] {
  if (!sanityProjects || sanityProjects.length === 0) {
    return mockProjects;
  }

  // Enrich any sanity projects that match mock IDs with mock tags/extras if missing
  const enrichedSanity = sanityProjects.map((p) => {
    const mockMatch = mockProjects.find((m) => m.id === p.id);
    if (!mockMatch) return p;
    return {
      ...mockMatch,
      ...p,
      tags: p.tags || mockMatch.tags,
      description: p.description || mockMatch.description,
    };
  });

  // Append remaining mock projects not in sanityProjects
  const extraMock = mockProjects.filter(
    (m) => !enrichedSanity.some((p) => p.id === m.id)
  );

  return [...enrichedSanity, ...extraMock];
}
