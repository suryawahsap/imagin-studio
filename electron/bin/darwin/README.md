# Binary untuk macOS (darwin)

Letakkan binary CLI macOS di folder ini. IMAGIN Local akan memilih
`bin/<platform>/` otomatis saat runtime.

Struktur yang diharapkan (sama persis dengan `linux/`):

```
darwin/
├── realesrgan-ncnn/
│   ├── upscayl-bin            # upscayl-bin (macOS build, Real-ESRGAN ncnn/vulkan)
│   └── models/
│       ├── realesrgan-x4plus.param
│       └── realesrgan-x4plus.bin
├── vtracer/
│   └── vtracer                # vtracer CLI (macOS build)
└── yt-dlp/
    └── yt-dlp                 # yt-dlp (macOS build)
```

Catatan:
- Build macOS harus dijalankan di mesin macOS (electron-builder tidak bisa
  cross-build `.dmg` dari Linux).
- Sumber binary: ambil dari rilis resmi masing-masing project.
