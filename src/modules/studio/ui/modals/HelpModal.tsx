import React from 'react';
import { useEscapeClose } from '../useEscapeClose';
import { BookOpen, X } from 'lucide-react';

export interface HelpModalProps {
    open: boolean;
    onClose: () => void;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export default function HelpModal({ open, onClose, activeTab, onTabChange }: HelpModalProps) {
  useEscapeClose(open, onClose);
        if (!open) return null;
        const tabs = [
            { id: 'mulai',    label: ' Mulai' },
            { id: 'generate', label: ' Generate' },
            { id: 'import',   label: ' Import' },
            { id: 'metadata', label: ' Metadata' },
            { id: 'export',   label: ' Export' },
            { id: 'tips',     label: ' Tips' },
        ];
        const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
            <div className="space-y-2">
                <div className="text-[10px] font-black tracking-widest uppercase text-[var(--accent-gold)] border-b border-[var(--border-color)] pb-1.5">{title}</div>
                {children}
            </div>
        );
        const Row = ({ icon, label, desc }: { icon: string; label: string; desc: string }) => (
            <div className="flex gap-3 py-2 border-b border-[var(--border-color)]/40 last:border-0">
                <div className="text-base w-6 flex-shrink-0 text-center leading-none mt-0.5">{icon}</div>
                <div>
                    <div className="text-xs font-black text-[var(--text-primary)]">{label}</div>
                    <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed mt-0.5">{desc}</div>
                </div>
            </div>
        );
        return (
            <div className="fixed inset-0 z-[75] bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => onClose()}>
                <div role="dialog" aria-modal="true" aria-labelledby="help-title" tabIndex={-1} className="w-full max-w-2xl bg-[var(--bg-page)] rounded-2xl border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden max-h-[92vh]" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[var(--accent-gold)]/15 flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-[var(--accent-gold)]" />
                            </div>
                            <div>
                                <h2 id="help-title" className="font-black text-sm text-[var(--text-primary)]">Help & Panduan — IMAGIN Studio</h2>
                                <p className="text-[10px] text-[var(--text-secondary)]">AI-powered stock asset production engine untuk Adobe Stock</p>
                            </div>
                        </div>
                        <button onClick={() => onClose()} className="p-1.5 rounded-lg hover:bg-[var(--bg-element)] transition-all" aria-label="Tutup help">
                            <X className="w-4 h-4 text-[var(--text-secondary)]" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-0.5 px-4 pt-3 pb-0 border-b border-[var(--border-color)] flex-shrink-0 overflow-x-auto">
                        {tabs.map(t => (
                            <button
                                key={t.id}
                                onClick={() => onTabChange(t.id)}
                                className={`px-3 py-2 rounded-t-lg text-[11px] font-bold whitespace-nowrap transition-all border-b-2 ${
                                    activeTab === t.id
                                        ? 'border-[var(--accent-gold)] text-[var(--accent-gold)] bg-[var(--accent-gold)]/8'
                                        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5 text-[var(--text-primary)]">

                        {/* ── TAB: MULAI ─────────────────────────────────── */}
                        {activeTab === 'mulai' && (
                            <>
                                <div className="p-4 rounded-xl bg-[var(--accent-gold)]/8 border border-[var(--accent-gold)]/20">
                                    <p className="text-xs font-bold text-[var(--accent-gold)] mb-1"> Apa itu IMAGIN Studio?</p>
                                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                        IMAGIN Studio adalah engine produksi konten microstock berbasis AI. Kamu bisa generate gambar vector, ilustrasi, 3D, atau foto dengan prompt teks, lalu AI otomatis membuat metadata (judul, deskripsi, keywords) yang siap diupload ke Adobe Stock — semua dalam satu tool, tanpa perlu Photoshop atau Lightroom.
                                    </p>
                                </div>

                                <Section title="Alur kerja dasar">
                                    <Row icon="1️⃣" label="Tulis prompt" desc="Deskripsikan gambar yang ingin kamu buat di kolom Master Prompt. Semakin spesifik, semakin bagus hasilnya." />
                                    <Row icon="2️⃣" label="Pilih kategori & tipe asset" desc="Pilih Adobe Category (mis. Nature, Business) dan Asset Type (Vector, Illustration, 3D, Photo) agar DNA generasi sesuai standar Adobe Stock." />
                                    <Row icon="3️⃣" label="Generate" desc="Klik tombol Generate. AI akan membuat gambar, lalu otomatis generate metadata (judul + keywords + deskripsi) via vision analysis." />
                                    <Row icon="4️⃣" label="Review preflight" desc="Hasil dicek otomatis: sharpness, watermark, metadata compliance, IP risk. Status akan muncul:  Metadata Ready,  Needs Review, atau  Rejected." />
                                    <Row icon="5️⃣" label="Export" desc="Download gambar + CSV metadata untuk diupload langsung ke Adobe Stock Contributor Portal." />
                                </Section>

                                <Section title="Status asset">
                                    <Row icon="" label="Pending Metadata" desc="Gambar sudah generate, tapi metadata belum dibuat. Klik 'Generate Metadata' di kartu asset." />
                                    <Row icon="" label="Metadata Ready" desc="Gambar + metadata lengkap, lolos semua validasi. Siap export ke Adobe Stock." />
                                    <Row icon="" label="Needs Review" desc="Ada isu minor (mis. keyword kurang, kategori belum dipilih). Bisa diperbaiki manual lalu simpan." />
                                    <Row icon="" label="Rejected" desc="Ada masalah serius (watermark, brand/IP risk, konten sensitif). Perlu regenerate atau edit besar." />
                                    <Row icon="" label="Exported" desc="Sudah pernah didownload/diekspor. Bisa diekspor ulang kapan saja." />
                                </Section>

                                <Section title="Cara setup cepat">
                                    <Row icon="" label="Settings (wajib)" desc="Buka menu atas → Settings. Isi Gemini API Key (gratis dari Google AI Studio: aistudio.google.com). Tanpa key, generasi tidak bisa berjalan." />
                                    <Row icon="" label="Buat Project" desc="Panel PROJECT di sidebar atas — klik '+ New' untuk membuat project. Semua asset akan dikelompokkan per project." />
                                </Section>
                            </>
                        )}

                        {/* ── TAB: GENERATE ──────────────────────────────── */}
                        {activeTab === 'generate' && (
                            <>
                                <Section title="Master Prompt">
                                    <Row icon="" label="Prompt bebas (default)" desc="Tulis deskripsi gambar dalam bahasa Inggris. AI akan otomatis memperluas prompt sebelum generate (AI-Powered Prompt). Contoh: 'Cute cat playing with yarn ball, flat vector, isolated on white'." />
                                    <Row icon="" label="Quick Mode (no AI expansion)" desc="Prompt dikirim langsung ke model tanpa ekspansi AI. Gunakan jika prompt kamu sudah sangat detail dan spesifik." />
                                    <Row icon="" label="JSON Batch" desc="Upload file .json atau paste langsung untuk generate banyak gambar berbeda sekaligus dengan prompt masing-masing. Format: {batch_name, prompts: [{prompt, category, subcategory, ...}]}." />
                                    <Row icon="" label="Import gambar" desc="Lihat tab Import untuk workflow import asset eksternal." />
                                </Section>

                                <Section title="04 · Generation Mode">
                                    <Row icon="" label="Single" desc="Generate 1 asset, dijalankan paralel (2 slot simultan) — lebih cepat. Ideal untuk eksplorasi prompt dan test cepat." />
                                    <Row icon="" label="Batch (Safe)" desc="Generate banyak asset secara sequential (1 per sekali). Bisa di-pause dan resume. Progress tersimpan — aman untuk batch besar (5–20 asset)." />
                                    <Row icon="" label="Collection Mode" desc="Aktifkan di bawah Generation Mode untuk generate beberapa asset sebagai satu set kohesif (palette & motif konsisten). Asset yang berseri biasanya lebih laku di microstock." />
                                </Section>

                                <Section title="Tipe Asset (Asset Type)">
                                    <Row icon="▲" label="Vector" desc="Gambar flat 2D, clean lines, background putih/transparan. Cocok untuk icon, clipart, logo element. Output: PNG (bisa di-trace ke SVG via gallery)." />
                                    <Row icon="" label="Illustration" desc="Artwork digital detail — watercolor, editorial, children book style, dsb. Lebih bebas secara komposisi." />
                                    <Row icon="" label="3D Render" desc="Objek 3D isolated, studio lighting. Cocok untuk product render, icon 3D, elemen dekoratif." />
                                    <Row icon="" label="Photo" desc="Lifestyle scene, fotorealistik. Aspect ratio 16:9, background scene (bukan isolated)." />
                                </Section>

                                <Section title="Icon Mode">
                                    <Row icon="" label="Icon Mode" desc="Aktifkan untuk generate icon tunggal atau sheet icon (grid 2×2 sampai 5×5). Punya DNA khusus: stroke konsisten, ukuran kanvas sama, style terpilih (Outline, Filled, dll)." />
                                    <Row icon="" label="Icon Style" desc="Pilih dari Outline, Filled, Duotone, Glass, dsb. Setiap style punya DNA prompt dan negative prompt sendiri." />
                                    <Row icon="" label="Sheet Mode" desc="Generate banyak icon dalam 1 canvas (mis. 6 icons, 3×2). Setelah generate, bisa dipotong jadi file terpisah via 'Grid Asset'." />
                                </Section>

                                <Section title="06 · Visual Settings">
                                    <Row icon="" label="Aspect Ratio" desc="Rasio kanvas output. 1:1 untuk icon/social media, 4:3 untuk landscape, 16:9 untuk banner, 3:4 untuk portrait. Berpengaruh pada komposisi gambar." />
                                    <Row icon="" label="Style" desc="Preset gaya visual (Flat Commercial, Editorial Scene, Watercolor Botanical, dll). Mempengaruhi DNA prompt secara signifikan." />
                                    <Row icon="" label="Background" desc="Auto (putih atau sesuai kategori), Transparan (alpha channel), Scene (environment penuh), Green Screen (chroma key #00B140 untuk VFX)." />
                                    <Row icon="" label="High DPI Sharpness" desc="Aktifkan untuk menghasilkan gambar tajam resolusi tinggi. Otomatis diupscale ke ≥4MP untuk memenuhi standar Adobe Stock." />
                                    <Row icon="" label="Faceless Mode" desc="Semua karakter di-generate tanpa wajah yang dapat diidentifikasi — menghindari kebutuhan model release di Adobe Stock." />
                                    <Row icon="⬜" label="Negative Space" desc="Aktifkan agar komposisi punya ruang kosong di sekitar subjek — ideal untuk asset yang akan dipakai oleh desainer dengan text overlay." />
                                </Section>
                            </>
                        )}

                        {/* ── TAB: IMPORT ────────────────────────────────── */}
                        {activeTab === 'import' && (
                            <>
                                <div className="p-3 rounded-xl bg-[var(--accent-blue)]/8 border border-[var(--accent-blue)]/20 text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                    Klik tombol <strong className="text-[var(--text-primary)]">Import</strong> di section "Import Asset" sidebar (mode import) untuk membuka 3 pilihan import.
                                </div>

                                <Section title="3 jenis import">
                                    <Row icon="" label="Referensi Prompt (AI)" desc="Upload gambar referensi → AI menganalisis gaya, komposisi, warna, dan elemen visual → mengisi Master Prompt otomatis. Berguna jika kamu punya contoh visual yang ingin ditiru gayanya." />
                                    <Row icon="" label="Generate Metadata" desc="Upload PNG/JPG/WebP yang sudah jadi (bukan generate baru) → asset masuk ke library → AI otomatis generate judul, tags, dan keywords Adobe Stock via vision analysis. Cocok untuk gambar yang kamu buat di luar IMAGIN." />
                                    <Row icon="" label="Object Modifier (NEW)" desc="Upload gambar referensi → AI mereplikasi gaya/komposisi gambar tersebut → kamu bisa memberi instruksi untuk menambah, menghapus, atau mengubah objek di dalamnya. Menghasilkan hingga 3 variasi untuk dipilih." />
                                </Section>

                                <Section title="Import Backup & Export Backup">
                                    <Row icon="⬇️" label="Import backup" desc="Pulihkan seluruh library asset dari file .json backup yang pernah diekspor sebelumnya. Berguna untuk pindah browser atau restore setelah clear cache." />
                                    <Row icon="⬆️" label="Export backup" desc="Simpan seluruh data library (asset, metadata, project) ke file .json. Lakukan ini secara rutin — data disimpan di IndexedDB browser yang bisa hilang jika browser di-clear." />
                                </Section>

                                <Section title="Format file yang didukung">
                                    <Row icon="" label="Gambar" desc="PNG · JPG/JPEG · WebP · ZIP (berisi banyak gambar — akan diimport semuanya sekaligus)." />
                                    <Row icon="" label="JSON Batch" desc="File .json dengan format batch prompt IMAGIN. Buka 'Format JSON' di header gallery untuk melihat contoh format lengkap." />
                                    <Row icon="" label="Backup" desc="File .json hasil 'Export backup' — berisi seluruh data library." />
                                </Section>
                            </>
                        )}

                        {/* ── TAB: METADATA ──────────────────────────────── */}
                        {activeTab === 'metadata' && (
                            <>
                                <div className="p-3 rounded-xl bg-[var(--accent-green)]/8 border border-[var(--accent-green)]/20 text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                    Metadata Adobe Stock yang benar = <strong className="text-[var(--text-primary)]">judul deskriptif + 20–50 keywords relevan + deskripsi 180–320 karakter</strong>. IMAGIN generate dan validasi semuanya otomatis.
                                </div>

                                <Section title="Generate Metadata otomatis">
                                    <Row icon="" label="AI Vision Analysis" desc="AI melihat gambar secara visual (bukan dari prompt) lalu menghasilkan judul, deskripsi, dan keywords yang sesuai isi gambar. Hasilnya jauh lebih akurat dari sekadar mengandalkan teks prompt." />
                                    <Row icon="" label="Tombol Regenerate (per field)" desc="Di modal Preflight, tiap field (Title, Description, Keywords) punya tombol Regenerate sendiri — klik untuk generate ulang field tersebut saja tanpa mengganti yang lain." />
                                    <Row icon="" label="Edit manual" desc="Semua field bisa diedit langsung di modal Preflight. Setelah edit, klik 'Save' — jika metadata sudah lengkap dan valid, status otomatis naik ke Metadata Ready." />
                                </Section>

                                <Section title="Aturan metadata Adobe Stock">
                                    <Row icon="" label="Judul (Title)" desc="Minimum 10 karakter, maksimum 70. Harus deskriptif — jangan mulai dengan kata: Flat, Vector, Illustration, 3D, Icon, Stock, AI Generated. Hanya huruf, angka, dan spasi." />
                                    <Row icon="" label="Keywords" desc="Minimum 20, maksimum 50 keywords. Kata pertama harus cocok dengan kata pertama judul. Tidak boleh ada brand, nama orang terkenal, kata spam (illustration, vector, high quality, dll)." />
                                    <Row icon="" label="Deskripsi" desc="2–3 kalimat, 180–320 karakter. Hanya bahasa Inggris. Tidak boleh ada kata promosi (beautiful, amazing, premium) atau label AI/stock." />
                                    <Row icon="" label="Kategori" desc="Wajib diisi untuk lulus preflight. IMAGIN otomatis memilih kategori berdasarkan analisis visual. Bisa diganti manual di modal Preflight." />
                                </Section>

                                <Section title="Preflight & Validasi">
                                    <Row icon="" label="IP Risk Check" desc="AI memeriksa apakah gambar mengandung logo, brand, karakter ber-hak cipta, atau elemen mirip merek tertentu. Skor 0–100 — skor ≥51 berarti perlu review, ≥71 di-reject." />
                                    <Row icon="" label="Watermark Detection" desc="Deteksi watermark/overlay teks. Hanya trigger jika AI vision secara eksplisit mendeteksi watermark — canvas heuristic saja tidak cukup (menghindari false positive pada ilustrasi detail)." />
                                    <Row icon="" label="Metadata Compliance" desc="Cek otomatis: brand name terselip di keyword? Ada kata berita/news marker? Ada spam term? Jika ditemukan, field yang bermasalah di-highlight merah di modal review." />
                                    <Row icon="" label="Semantic QA" desc="AI memeriksa apakah isi gambar sesuai dengan kategori dan subjek yang diklaim di metadata — mencegah mismatch antara visual dan keywords." />
                                </Section>
                            </>
                        )}

                        {/* ── TAB: EXPORT ────────────────────────────────── */}
                        {activeTab === 'export' && (
                            <>
                                <Section title="Export ke Adobe Stock">
                                    <Row icon="" label="Download ZIP + CSV" desc="Di header gallery → tombol Export (panah bawah). Menghasilkan ZIP berisi semua gambar Metadata Ready + file CSV metadata siap upload ke Adobe Stock Contributor Portal. Category sudah dikonversi ke nomor ID resmi Adobe." />
                                    <Row icon="" label="Download gambar saja" desc="Di kartu asset → klik tombol Download. Mendownload file gambar (PNG/JPG/SVG) tanpa metadata." />
                                    <Row icon="" label="Copy metadata" desc="Di modal detail asset (klik gambar) → bisa copy title, description, keywords secara terpisah untuk dipaste manual." />
                                </Section>

                                <Section title="Export ke IMAGIN Local">
                                    <Row icon="" label="IMAGIN Local" desc="Jika kamu menggunakan IMAGIN Local (desktop app), ada tombol 'Send to Local' untuk langsung mentransfer asset ke aplikasi desktop untuk proses lanjutan (upscale, trace SVG, dll)." />
                                </Section>

                                <Section title="Format output">
                                    <Row icon="" label="PNG" desc="Default untuk Vector, Illustration, dan 3D. Mendukung transparansi (background transparan). Minimum 4MP untuk Adobe Stock." />
                                    <Row icon="" label="JPG/JPEG" desc="Default untuk Photo. Tidak mendukung transparansi. Kualitas tinggi (95%)." />
                                    <Row icon="" label="SVG" desc="Bisa dihasilkan dari PNG via tombol 'Trace SVG' di modal gallery asset. SVG dioptimasi dan siap upload sebagai vector." />
                                    <Row icon="" label="CSV metadata" desc="Format sesuai spesifikasi Adobe Stock: kolom Filename, Title, Keywords, Category, Releases, Generative AI. Kolom 'Generative AI' wajib diisi 'Yes' untuk semua konten AI — sudah otomatis. Langsung bisa di-import di Contributor Portal." />
                                </Section>

                                <Section title="Tips upload Adobe Stock">
                                    <Row icon="" label="Cek status sebelum export" desc="Pastikan semua asset yang ingin diekspor berstatus Metadata Ready (hijau). Asset Needs Review atau Rejected tidak disertakan dalam bulk export CSV." />
                                    <Row icon="" label="Releases" desc="Kolom Releases di CSV perlu diisi manual jika asset mengandung orang yang dapat diidentifikasi (Model Release) atau properti berhak cipta (Property Release). Faceless Mode menghindari ini." />
                                    <Row icon="" label="Limit upload Adobe" desc="Adobe Stock menerima maksimum 100 file per hari untuk akun baru. Batch besar sebaiknya dibagi dalam beberapa sesi upload." />
                                </Section>
                            </>
                        )}

                        {/* ── TAB: TIPS ──────────────────────────────────── */}
                        {activeTab === 'tips' && (
                            <>
                                <Section title="Tips prompt terbaik">
                                    <Row icon="" label="Spesifik soal subjek" desc="Sebutkan subjek utama dengan jelas di awal prompt. 'Cute corgi puppy sitting on autumn leaves, flat vector, isolated white background' lebih baik dari 'a dog'." />
                                    <Row icon="" label="Sebutkan gaya visual" desc="Tambahkan kata kunci gaya: 'watercolor', 'flat 2D vector', 'isometric 3D', 'hand-drawn'. AI akan menyesuaikan DNA prompt-nya." />
                                    <Row icon="" label="Bayangkan pembeli" desc="Pikirkan siapa yang akan membeli asset ini dan untuk apa. Tambahkan konteks commercial: 'for greeting card', 'for social media', 'for packaging design'." />
                                    <Row icon="" label="Hindari hal ini" desc="Jangan sebut merek (Apple, Nike), nama orang terkenal, karakter fiksi berhak cipta (Mickey Mouse, Pikachu), atau referensi berita aktual — Adobe pasti reject." />
                                </Section>

                                <Section title="Tips batch produksi">
                                    <Row icon="" label="Gunakan JSON Batch" desc="Untuk produksi massal, buat file .json dengan 10–30 prompt berbeda. Jauh lebih efisien dari generate satu-satu. Format tersedia di tombol 'Format JSON' di header gallery." />
                                    <Row icon="" label="Batch (Safe) untuk produksi" desc="Mode Batch Safe dengan resume sangat berguna untuk batch besar — jika browser crash atau koneksi putus, bisa resume dari asset terakhir tanpa mulai dari awal." />
                                    <Row icon="" label="Collection Mode" desc="Aktifkan Collection Mode untuk generate set dengan tema konsisten. Set tematik sering lebih laku di microstock daripada asset individual." />
                                    <Row icon="" label="Diversity score" desc="Setelah batch selesai, IMAGIN menghitung diversity score. Skor rendah = banyak asset yang terlalu mirip — Adobe bisa reject sebagai 'similar content'. Aim untuk skor ≥70." />
                                </Section>

                                <Section title="Penyimpanan & backup">
                                    <Row icon="" label="Data tersimpan di browser" desc="Semua asset disimpan di IndexedDB browser-mu. Data ini TIDAK tersinkronisasi ke cloud dan BISA hilang jika browser di-clear, atau pakai private/incognito mode." />
                                    <Row icon="⬆️" label="Export backup rutin" desc="Lakukan Export Backup (menu atas → Export backup) secara rutin, terutama setelah sesi produksi besar. File .json ini adalah satu-satunya cadangan data-mu." />
                                    <Row icon="" label="Pindah browser/device" desc="Export backup dari browser lama → Import backup di browser/device baru. Semua asset (termasuk gambar sebagai base64) akan terpindah." />
                                </Section>

                                <Section title="Troubleshooting umum">
                                    <Row icon="" label="Generate gagal / API error" desc="Cek Settings → pastikan Gemini API Key terisi dan valid. Key bisa didapat gratis di aistudio.google.com. Rate limit (429) = tunggu 1 menit lalu coba lagi." />
                                    <Row icon="" label="Asset selalu Rejected" desc="Buka modal Preflight (klik shield icon di kartu) → baca issue yang terdeteksi. Isu paling umum: metadata berisi kata terlarang, IP risk tinggi, atau gambar blur." />
                                    <Row icon="" label="Metadata selalu Needs Review" desc="Pastikan Title, Description, Keywords sudah diisi lengkap, dan kategori dipilih. Setelah edit manual → klik Save. Jika masih Needs Review, cek apakah ada brand/spam term yang terdeteksi (di-highlight merah)." />
                                    <Row icon="" label="False watermark detected" desc="Jika asset bersih tapi terdeteksi watermark, klik 'AI Edit Gambar' di preflight untuk re-analyze, atau edit metadata manual lalu Save untuk unlock status." />
                                </Section>

                                <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-center">
                                    <div className="text-xs font-black text-[var(--text-primary)] mb-1"> IMAGIN Studio</div>
                                    <div className="text-[10px] text-[var(--text-secondary)]">Stock Content Production Engine · AI-powered · Runs in browser</div>
                                    <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">Data tersimpan lokal · Tidak ada server · Privasi terjaga</div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between flex-shrink-0">
                        <div className="text-[10px] text-[var(--text-secondary)]">
                            Gunakan <kbd className="px-1 py-0.5 rounded bg-[var(--bg-element)] border border-[var(--border-color)] text-[9px] font-mono">Esc</kbd> untuk menutup
                        </div>
                        <button
                            onClick={() => onClose()}
                            className="px-4 py-2 rounded-xl bg-[var(--accent-gold-solid)] text-white text-xs font-black hover:opacity-90 transition-all"
                        >
                            Mengerti, tutup
                        </button>
                    </div>
                </div>
            </div>
        );
}
