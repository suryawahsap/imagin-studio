// @ts-nocheck
// AUTO-GENERATED dari design reference: imagin_studio_gallery_module/code.html (data-purpose="gallery-catalog")
// AUTO-GENERATED dari design reference: imagin_studio_gallery_module/code.html
// Markup dipertahankan apa adanya agar identik dengan mockup. Jangan rapikan manual.
export default function GalleryCatalogGen() {
  return (
    <>
{/*  Top Filters & Search Toolbar  */}
<div className="h-14 border-b border-[#1e293b] px-4 flex items-center justify-between gap-3 shrink-0 bg-[#0e131b]">
  {/*  Search Input Bar  */}
  <div className="flex-1 relative max-w-xl">
    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    </span>
    <input className="w-full bg-[#0e131f] border border-[#334155] rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/50" placeholder="Search assets by prompt, seed, or filename..." type="text" />
  </div>
  {/*  Filter Dropdown Menus  */}
  <div className="flex items-center space-x-2">
    <button className="flex items-center space-x-2 px-2.5 py-1.5 bg-[#0e131f] hover:bg-[#141b2b] border border-[#334155] rounded text-slate-300 text-xs">
      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
      <span className="">All Types</span>
      <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    </button>
    <button className="flex items-center space-x-2 px-2.5 py-1.5 bg-[#0e131f] hover:bg-[#141b2b] border border-[#334155] rounded text-slate-300 text-xs">
      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
      <span className="">All Tags</span>
      <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    </button>
    <button className="flex items-center space-x-2 px-2.5 py-1.5 bg-[#0e131f] hover:bg-[#141b2b] border border-[#334155] rounded text-slate-300 text-xs">
      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
      <span className="">Sort by: Newest</span>
      <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    </button>
    <div className="h-4 w-px bg-slate-800 mx-1" />
    {/*  View Switcher (Grid vs List)  */}
    <div className="flex items-center bg-[#0e131f] p-0.5 rounded border border-[#334155]">
      <button className="p-1 rounded bg-[#1e2738] text-cyan-400 shadow-sm" title="Grid View">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
      <button className="p-1 rounded text-slate-500 hover:text-slate-300" title="List View">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
    </div>
  </div>
</div>
{/*  Scrollable Asset Matrix  */}
<div className="flex-1 overflow-y-auto p-4">
  <div className="grid grid-cols-3 gap-4 auto-rows-max">
    {/*  Card 1 (Active/Selected): city_sunset.png  */}
    <div className="group relative bg-[#0e131f] border-2 border-cyan-500/80 rounded-lg overflow-hidden shadow-lg shadow-cyan-950/20 flex flex-col cursor-pointer transition-all hover:border-cyan-400" data-purpose="asset-card">
      {/*  Media Container  */}
      <div className="relative w-full aspect-square bg-synth-city overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e131f] via-transparent to-black/30 opacity-70" />
        {/*  Neon Cyber Skyline SVG Composition  */}
        <svg className="w-full h-full object-cover opacity-90" viewBox="0 0 300 300">
          <defs>
            <linearGradient id="g-sky" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#140228" />
              <stop offset="60%" stopColor="#701258" />
              <stop offset="100%" stopColor="#f95389" />
            </linearGradient>
          </defs>
          <rect fill="url(#g-sky)" height="300" width="300" />
          <circle cx="150" cy="190" fill="#ffb454" opacity="0.8" r="70" />
          {/*  Skyscrapers  */}
          <rect fill="#080c18" height="180" width="30" x="20" y="120" />
          <rect fill="#0c1224" height="220" width="40" x="55" y="80" />
          <rect fill="#090f1d" height="160" width="35" x="100" y="140" />
          <rect fill="#050811" height="240" width="45" x="140" y="60" />
          <rect fill="#0e1526" height="190" width="30" x="190" y="110" />
          <rect fill="#0a0f1e" height="210" width="45" x="225" y="90" />
          {/*  Neon accents  */}
          <line opacity="0.8" stroke="#38bdf8" strokeWidth="1.5" x1="60" x2="60" y1="90" y2="280" />
          <line opacity="0.9" stroke="#f43f5e" strokeWidth="2" x1="160" x2="160" y1="70" y2="290" />
          <line opacity="0.8" stroke="#22d3ee" strokeWidth="1.5" x1="240" x2="240" y1="100" y2="280" />
        </svg>
        {/*  Card Badges  */}
        <div className="absolute top-2 left-2 flex items-center space-x-1.5">
          <span className="text-[9px] font-bold font-mono tracking-wider px-1.5 py-0.5 rounded bg-black/60 text-white uppercase border border-white/10 backdrop-blur-xs">IMAGE</span>
          <span className="text-[9px] font-bold font-mono tracking-wider px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950 uppercase font-black">Active</span>
        </div>
        <button className="absolute top-2 right-2 w-6 h-6 rounded bg-black/60 backdrop-blur-xs flex items-center justify-center text-cyan-400 border border-white/10 hover:scale-110 transition">
          <svg className="w-3.5 h-3.5 fill-cyan-400" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        </button>
      </div>
      {/*  Metadata footer  */}
      <div className="p-2.5 flex items-center justify-between border-t border-cyan-500/30 bg-[#0e131f]">
        <div>
          <h4 className="font-semibold text-slate-100 text-xs truncate max-w-[140px]">city_sunset.png</h4>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">1024 × 1024</p>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-1 py-0.5 rounded border border-cyan-800/40">PNG</span>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">2.4 MB</p>
        </div>
      </div>
    </div>
    {/*  Card 2: mountain.jpg  */}
    <div className="group relative bg-[#0e131f] border border-[#1e293b] hover:border-slate-500 rounded-lg overflow-hidden shadow flex flex-col cursor-pointer transition" data-purpose="asset-card">
      <div className="relative w-full aspect-square bg-synth-mountain overflow-hidden flex items-center justify-center">
        <svg className="w-full h-full object-cover" viewBox="0 0 300 300">
          <path d="M0 300 L60 170 L110 220 L180 110 L250 240 L300 180 L300 300 Z" fill="#2d3748" />
          <path d="M180 110 L150 160 L180 190 L210 150 Z" fill="#ffffff" opacity="0.85" />
          <path d="M60 170 L40 210 L80 210 Z" fill="#e2e8f0" opacity="0.7" />
          <polygon fill="#f8fafc" points="180,110 165,140 185,150" />
        </svg>
        <div className="absolute top-2 left-2">
          <span className="text-[9px] font-bold font-mono tracking-wider px-1.5 py-0.5 rounded bg-black/60 text-slate-200 uppercase border border-white/10 backdrop-blur-xs">IMAGE</span>
        </div>
      </div>
      <div className="p-2.5 flex items-center justify-between border-t border-[#1e293b] bg-[#0b0f18]">
        <div>
          <h4 className="font-medium text-slate-200 text-xs truncate max-w-[140px]">mountain.jpg</h4>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">1920 × 1080</p>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1 py-0.5 rounded">JPG</span>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">1.8 MB</p>
        </div>
      </div>
    </div>
    {/*  Card 3: tiger_vector.svg  */}
    <div className="group relative bg-[#0e131f] border border-[#1e293b] hover:border-slate-500 rounded-lg overflow-hidden shadow flex flex-col cursor-pointer transition" data-purpose="asset-card">
      <div className="relative w-full aspect-square bg-synth-tiger overflow-hidden flex items-center justify-center p-4">
        {/*  Geometric Tiger Vector Emblem  */}
        <svg className="w-3/4 h-3/4 text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]" fill="currentColor" viewBox="0 0 100 100">
          <path d="M50 15 L62 28 L78 20 L75 38 L90 48 L76 60 L80 78 L62 74 L50 90 L38 74 L20 78 L24 60 L10 48 L25 38 L22 20 L38 28 Z" fill="#d97706" />
          {/*  Inner details  */}
          <polygon fill="#111" points="50,25 58,40 42,40" />
          <polygon fill="#fef3c7" points="35,45 45,48 38,55" />
          <polygon fill="#fef3c7" points="65,45 55,48 62,55" />
          <polygon fill="#111" points="50,65 42,55 58,55" />
          <line stroke="#111" strokeWidth="2" x1="50" x2="50" y1="65" y2="78" />
        </svg>
        <div className="absolute top-2 left-2">
          <span className="text-[9px] font-bold font-mono tracking-wider px-1.5 py-0.5 rounded bg-purple-600/80 text-purple-100 uppercase border border-purple-400/30">VECTOR</span>
        </div>
        <button className="absolute top-2 right-2 w-6 h-6 rounded bg-black/60 backdrop-blur-xs flex items-center justify-center text-cyan-400 border border-white/10 hover:scale-110">
          <svg className="w-3.5 h-3.5 fill-cyan-400" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        </button>
      </div>
      <div className="p-2.5 flex items-center justify-between border-t border-[#1e293b] bg-[#0b0f18]">
        <div>
          <h4 className="font-medium text-slate-200 text-xs truncate max-w-[140px]">tiger_vector.svg</h4>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">1024 × 1024</p>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono text-purple-400 bg-purple-950/60 border border-purple-800/40 px-1 py-0.5 rounded">SVG</span>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">245 KB</p>
        </div>
      </div>
    </div>
    {/*  Card 4: ocean.mp4  */}
    <div className="group relative bg-[#0e131f] border border-[#1e293b] hover:border-slate-500 rounded-lg overflow-hidden shadow flex flex-col cursor-pointer transition" data-purpose="asset-card">
      <div className="relative w-full aspect-square bg-synth-ocean overflow-hidden flex items-center justify-center">
        <svg className="w-full h-full opacity-60" viewBox="0 0 200 200">
          <circle cx="100" cy="100" fill="none" r="70" stroke="#0ea5e9" strokeDasharray="4 6" strokeWidth="1.5" />
          <circle cx="100" cy="100" fill="none" r="45" stroke="#38bdf8" strokeWidth="2" />
          <path d="M20 120 Q60 80 100 120 T180 120" fill="none" stroke="#0284c7" strokeWidth="3" />
        </svg>
        {/*  Center Play Icon Indicator  */}
        <div className="w-11 h-11 rounded-full bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-lg group-hover:scale-110 transition">
          <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        {/*  Badges: Video & 00:15 Duration  */}
        <div className="absolute top-2 left-2 flex items-center space-x-1">
          <span className="text-[9px] font-bold font-mono tracking-wider px-1.5 py-0.5 rounded bg-emerald-700/80 text-white uppercase">VIDEO</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-slate-200 backdrop-blur-xs">00:15</span>
        </div>
      </div>
      <div className="p-2.5 flex items-center justify-between border-t border-[#1e293b] bg-[#0b0f18]">
        <div>
          <h4 className="font-medium text-slate-200 text-xs truncate max-w-[140px]">ocean.mp4</h4>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">1920 × 1080</p>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1 py-0.5 rounded">MP4</span>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">12.4 MB</p>
        </div>
      </div>
    </div>
    {/*  Card 5: forest.jpg  */}
    <div className="group relative bg-[#0e131f] border border-[#1e293b] hover:border-slate-500 rounded-lg overflow-hidden shadow flex flex-col cursor-pointer transition" data-purpose="asset-card">
      <div className="relative w-full aspect-square bg-synth-forest overflow-hidden flex items-center justify-center">
        <svg className="w-full h-full opacity-70" viewBox="0 0 200 200">
          {/*  Conifer silhouette clusters  */}
          <polygon fill="#08140e" points="50,140 40,170 60,170" />
          <polygon fill="#0a1a12" points="80,120 65,165 95,165" />
          <polygon fill="#0d2419" points="120,95 100,160 140,160" />
          <polygon fill="#08140e" points="160,130 145,170 175,170" />
        </svg>
        <div className="absolute top-2 left-2">
          <span className="text-[9px] font-bold font-mono tracking-wider px-1.5 py-0.5 rounded bg-black/60 text-slate-200 uppercase border border-white/10 backdrop-blur-xs">IMAGE</span>
        </div>
      </div>
      <div className="p-2.5 flex items-center justify-between border-t border-[#1e293b] bg-[#0b0f18]">
        <div>
          <h4 className="font-medium text-slate-200 text-xs truncate max-w-[140px]">forest.jpg</h4>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">1920 × 1080</p>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1 py-0.5 rounded">JPG</span>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">1.2 MB</p>
        </div>
      </div>
    </div>
    {/*  Card 6: portrait.png (4K UPSCALED)  */}
    <div className="group relative bg-[#0e131f] border border-[#1e293b] hover:border-slate-500 rounded-lg overflow-hidden shadow flex flex-col cursor-pointer transition" data-purpose="asset-card">
      <div className="relative w-full aspect-square bg-synth-portrait overflow-hidden flex items-center justify-center">
        {/*  Android/Cyborg Portrait Silhouette representation  */}
        <svg className="w-3/5 h-3/5 opacity-80" viewBox="0 0 100 100">
          <path d="M50 15 C35 15 28 28 28 45 C28 65 38 85 50 88 C62 85 72 65 72 45 C72 28 65 15 50 15 Z" fill="#1e293b" />
          <circle cx="42" cy="42" fill="#06b6d4" r="4" />
          <circle cx="58" cy="42" fill="#38bdf8" r="4" />
          <path d="M38 60 Q50 68 62 60" fill="none" stroke="#06b6d4" strokeWidth="2" />
          {/*  Cyber cheek accents  */}
          <path d="M28 45 L35 50" stroke="#f43f5e" strokeWidth="1.5" />
        </svg>
        <div className="absolute top-2 left-2">
          <span className="text-[9px] font-bold font-mono tracking-wider px-1.5 py-0.5 rounded bg-blue-600 text-white uppercase shadow-sm">4K UPSCALED</span>
        </div>
      </div>
      <div className="p-2.5 flex items-center justify-between border-t border-[#1e293b] bg-[#0b0f18]">
        <div>
          <h4 className="font-medium text-slate-200 text-xs truncate max-w-[140px]">portrait.png</h4>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">1024 × 1024</p>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-1 py-0.5 rounded">PNG</span>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">1.6 MB</p>
        </div>
      </div>
    </div>
    {/*  Card 7: neon_city.jpg  */}
    <div className="group relative bg-[#0e131f] border border-[#1e293b] hover:border-slate-500 rounded-lg overflow-hidden shadow flex flex-col cursor-pointer transition" data-purpose="asset-card">
      <div className="relative w-full aspect-square bg-synth-neon overflow-hidden flex items-center justify-center">
        <svg className="w-full h-full opacity-70" viewBox="0 0 200 200">
          <rect fill="#1e1329" height="120" width="40" x="30" y="80" />
          <rect fill="#141f2e" height="150" width="40" x="80" y="50" />
          <rect fill="#201524" height="110" width="40" x="130" y="90" />
          <line stroke="#ec4899" strokeWidth="2" x1="85" x2="85" y1="60" y2="180" />
          <line stroke="#06b6d4" strokeWidth="2" x1="140" x2="140" y1="100" y2="180" />
        </svg>
        <div className="absolute top-2 left-2">
          <span className="text-[9px] font-bold font-mono tracking-wider px-1.5 py-0.5 rounded bg-black/60 text-slate-200 uppercase border border-white/10 backdrop-blur-xs">IMAGE</span>
        </div>
      </div>
      <div className="p-2.5 flex items-center justify-between border-t border-[#1e293b] bg-[#0b0f18]">
        <div>
          <h4 className="font-medium text-slate-200 text-xs truncate max-w-[140px]">neon_city.jpg</h4>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">1600 × 1200</p>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1 py-0.5 rounded">JPG</span>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">2.8 MB</p>
        </div>
      </div>
    </div>
    {/*  Card 8: logo_vector.svg  */}
    <div className="group relative bg-[#0e131f] border border-[#1e293b] hover:border-slate-500 rounded-lg overflow-hidden shadow flex flex-col cursor-pointer transition" data-purpose="asset-card">
      <div className="relative w-full aspect-square bg-synth-vector overflow-hidden flex items-center justify-center p-4">
        {/*  Geometric Hex Icon Representation  */}
        <svg className="w-1/2 h-1/2 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="7" viewBox="0 0 100 100">
          <polygon points="50,10 90,32 90,78 50,98 10,78 10,32" strokeLinejoin="round" />
          <circle cx="50" cy="55" fill="#06b6d4" r="14" stroke="none" />
        </svg>
        <div className="absolute top-2 left-2">
          <span className="text-[9px] font-bold font-mono tracking-wider px-1.5 py-0.5 rounded bg-purple-600/80 text-purple-100 uppercase border border-purple-400/30">VECTOR</span>
        </div>
      </div>
      <div className="p-2.5 flex items-center justify-between border-t border-[#1e293b] bg-[#0b0f18]">
        <div>
          <h4 className="font-medium text-slate-200 text-xs truncate max-w-[140px]">logo_vector.svg</h4>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">512 × 512</p>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono text-purple-400 bg-purple-950/60 border border-purple-800/40 px-1 py-0.5 rounded">SVG</span>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">18 KB</p>
        </div>
      </div>
    </div>
  </div>
</div>
    </>
  );
}
