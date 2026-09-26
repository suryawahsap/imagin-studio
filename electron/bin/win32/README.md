# Binary untuk Windows (win32)

Letakkan binary CLI Windows di folder ini. IMAGIN Local akan memilih
`bin/<platform>/` otomatis saat runtime.

Struktur yang diharapkan (sama persis dengan `linux/`):

```
win32/
├── realesrgan-ncnn/
│   ├── upscayl-bin.exe        # upscayl-bin (Windows build, Real-ESRGAN ncnn/vulkan)
│   └── models/
│       ├── realesrgan-x4plus.param
│       └── realesrgan-x4plus.bin
├── vtracer/
│   └── vtracer.exe            # vtracer CLI (Windows build)
└── yt-dlp/
    └── yt-dlp.exe             # yt-dlp (Windows build)
```

Catatan:
- `resolveBinary()` otomatis menambah `.exe` untuk binary yang di-spawn.
- Sumber binary: ambil dari rilis resmi masing-masing project (Releases
  GitHub), bukan compile dari repo ini.
