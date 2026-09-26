// @ts-nocheck
// AUTO-GENERATED dari design reference: imagin_studio_gallery_module/code.html (data-purpose="task-center-dock")
// AUTO-GENERATED dari design reference: imagin_studio_gallery_module/code.html
// Markup dipertahankan apa adanya agar identik dengan mockup. Jangan rapikan manual.
export default function GalleryDockGen() {
  return (
    <>
{/*  Header status line of Task Center  */}
<div className="flex items-center justify-between pb-2 border-b border-[#17202d] text-[11px]">
  <div className="flex items-center space-x-3">
    <div className="flex items-center space-x-1.5 font-bold tracking-wider uppercase text-cyan-400 font-mono">
      <svg className="w-3.5 h-3.5 animate-spin text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
      <span className="">Task Center</span>
    </div>
    <div className="h-3.5 w-px bg-slate-800" />
    <div className="flex items-center space-x-1.5 font-mono text-[11px]">
      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">All 12</span>
      <span className="text-slate-400 hover:text-slate-200 cursor-pointer px-1.5 py-0.5">
        Generating
        <span className="text-cyan-400">3</span>
      </span>
      <span className="text-slate-400 hover:text-slate-200 cursor-pointer px-1.5 py-0.5">
        Upscaling
        <span className="text-blue-400">2</span>
      </span>
      <span className="text-slate-400 hover:text-slate-200 cursor-pointer px-1.5 py-0.5">
        Vectorizing
        <span className="text-purple-400">2</span>
      </span>
      <span className="text-slate-400 hover:text-slate-200 cursor-pointer px-1.5 py-0.5">
        Remotion
        <span className="text-amber-400">1</span>
      </span>
      <span className="text-slate-400 hover:text-slate-200 cursor-pointer px-1.5 py-0.5">
        Completed
        <span className="text-emerald-400">4</span>
      </span>
      <span className="text-slate-400 hover:text-slate-200 cursor-pointer px-1.5 py-0.5">
        Failed
        <span className="text-rose-400">0</span>
      </span>
    </div>
  </div>
  {/*  System Diagnostic Telemetry  */}
  <div className="flex items-center space-x-4 font-mono text-slate-400">
    <span className="flex items-center space-x-1.5">
      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
      <span className="text-slate-300">System Ready</span>
    </span>
    <span className="">
      GPU:
      <span className="text-cyan-400 font-semibold">42%</span>
    </span>
    <span className="">
      RAM:
      <span className="text-indigo-400 font-semibold">68%</span>
    </span>
    <button className="text-slate-500 hover:text-slate-300">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    </button>
  </div>
</div>
{/*  Active Tasks Queue List  */}
<div className="pt-2 space-y-1.5 font-mono text-[11px]">
  {/*  Task Row 1  */}
  <div className="flex items-center justify-between py-0.5 text-slate-300">
    <div className="flex items-center space-x-3 w-80">
      <span className="text-slate-600 w-6">#1</span>
      <span className="flex items-center space-x-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        <span className="text-slate-200 font-semibold">Text to Image</span>
      </span>
      <span className="text-slate-400 truncate">mountain_lake_01.png</span>
    </div>
    <div className="flex-1 max-w-md mx-6 flex items-center space-x-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 w-[78%] rounded-full" />
      </div>
      <span className="text-cyan-400 text-[10px] w-10 text-right">78%</span>
    </div>
    <div className="flex items-center space-x-6 text-slate-400">
      <span className="text-cyan-300 font-sans flex items-center space-x-1">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span className="">Generating</span>
      </span>
      <span className="text-slate-500 w-12 text-right">14:32</span>
      <button className="text-slate-500 hover:text-white">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
    </div>
  </div>
  {/*  Task Row 2  */}
  <div className="flex items-center justify-between py-0.5 text-slate-300">
    <div className="flex items-center space-x-3 w-80">
      <span className="text-slate-600 w-6">#2</span>
      <span className="flex items-center space-x-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
        <span className="text-slate-200 font-semibold">Upscale</span>
      </span>
      <span className="text-slate-400 truncate">city_skyline_01.png</span>
    </div>
    <div className="flex-1 max-w-md mx-6 flex items-center space-x-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 w-[45%] rounded-full" />
      </div>
      <span className="text-blue-400 text-[10px] w-10 text-right">45%</span>
    </div>
    <div className="flex items-center space-x-6 text-slate-400">
      <span className="text-blue-300 font-sans flex items-center space-x-1">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        <span className="">Upscaling</span>
      </span>
      <span className="text-slate-500 w-12 text-right">14:28</span>
      <button className="text-slate-500 hover:text-white">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
    </div>
  </div>
  {/*  Task Row 3  */}
  <div className="flex items-center justify-between py-0.5 text-slate-300">
    <div className="flex items-center space-x-3 w-80">
      <span className="text-slate-600 w-6">#3</span>
      <span className="flex items-center space-x-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
        <span className="text-slate-200 font-semibold">Vectorize</span>
      </span>
      <span className="text-slate-400 truncate">tiger_portrait_01.png</span>
    </div>
    <div className="flex-1 max-w-md mx-6 flex items-center space-x-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 w-[100%] rounded-full" />
      </div>
      <span className="text-emerald-400 text-[10px] w-10 text-right">100%</span>
    </div>
    <div className="flex items-center space-x-6 text-slate-400">
      <span className="text-emerald-400 font-sans flex items-center space-x-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span className="">Completed</span>
      </span>
      <span className="text-slate-500 w-12 text-right">13:50</span>
      <button className="text-slate-500 hover:text-white">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
    </div>
  </div>
</div>
    </>
  );
}
