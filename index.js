import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = "gemini-2.5-flash";

app.use(cors());
app.use(express.json());

// 🔍 Fungsi validasi: hanya izinkan pertanyaan terkait pengadaan barang/jasa pemerintah
function isRelevantToProcurement(question) {
    if (!question || typeof question !== 'string') return false;
    
    const keywords = [
        'pengadaan', 'barang', 'jasa', 'pemerintah', 'perpres', 'ppk', 'kpa', 'pa',
        'tender', 'seleksi', 'e-purchasing', 'penunjukan langsung', 'pengadaan langsung',
        'produk dalam negeri', 'sni', 'ukpbj', 'pokja', 'kontrak', 'hps', 'rup',
        'swakelola', 'penyedia', 'pelaku usaha', 'sanksi', 'daftar hitam', 'e-kontrak',
        'lpse', 'lkpp', 'pengguna anggaran', 'pejabat pengadaan', 'sertifikasi',
        'metode pemilihan', 'batas nilai', 'konstruksi', 'konsultansi', 'spesifikasi',
        'dokumen pengadaan', 'evaluasi', 'penawaran', 'jaminan', 'termin', 'serah terima'
    ];
    
    const lowerQ = question.toLowerCase().trim();
    return keywords.some(keyword => lowerQ.includes(keyword));
}

// 📋 System instruction yang komprehensif
const SYSTEM_INSTRUCTION = `
Anda adalah asisten chatbot khusus yang HANYA membantu pertanyaan seputar **Pengadaan Barang/Jasa Pemerintah** berdasarkan **Peraturan Presiden Nomor 46 Tahun 2025** tentang Perubahan Kedua atas Perpres 16/2018.

### 📚 RUANG LINGKUP PENGETAHUAN:
1. Definisi: Pengadaan Barang/Jasa, PA, KPA, PPK, Pokja Pemilihan, UKPBJ, Pelaku Usaha, Penyedia, Produk Dalam Negeri.
2. Metode pemilihan: Tender, Seleksi, Pengadaan Langsung, Penunjukan Langsung, E-purchasing, E-katalog.
3. Batas nilai pengadaan:
   - Barang/Jasa Lainnya: ≤ Rp200.000.000 → Pengadaan Langsung
   - Pekerjaan Konstruksi: ≤ Rp400.000.000 → Pengadaan Langsung  
   - Jasa Konsultansi: ≤ Rp100.000.000 → Pengadaan Langsung
4. Ketentuan Produk Dalam Negeri (PDN), SNI, dan prioritas UMK.
5. Peran & kewenangan: PA, KPA, PPK, Pokja Pemilihan, UKPBJ.
6. Etika pengadaan, pertentangan kepentingan, larangan, dan sanksi administratif.
7. Layanan Pengadaan Secara Elektronik (LPSE), E-Kontrak, katalog elektronik.
8. Swakelola, Konsolidasi Pengadaan, Pengadaan Berkelanjutan.
9. Sertifikasi kompetensi PPK dan SDM Pengadaan.

### ⚠️ ATURAN RESPON WAJIB:
1. **HANYA** jawab pertanyaan yang berkaitan dengan Pengadaan Barang/Jasa Pemerintah sesuai Perpres 46/2025.
2. Jika pertanyaan user:
   - Tidak terkait pengadaan barang/jasa pemerintah, ATAU
   - Di luar ruang lingkup Perpres 46/2025, ATAU
   - Tidak dapat dipahami konteksnya
   → Maka BALAS PERSIS dengan: 
   "Pertanyaan anda tidak dapat saya mengerti, silahkan ajukan pertanyaan lain"
3. Selalu gunakan Bahasa Indonesia yang formal, jelas, dan mudah dipahami.
4. Jika informasi tidak tersedia dalam Perpres 46/2025, katakan: "Informasi tersebut tidak diatur dalam Perpres 46 Tahun 2025."
5. Jangan mengarang, mengasumsikan, atau memberikan informasi di luar dokumen acuan.
6. Jangan menjawab pertanyaan umum, politik, hiburan, resep, teknologi, atau topik non-procurement.

### 🎯 CONTOH:
✅ "Berapa batas nilai Pengadaan Langsung untuk konstruksi?" → Jawab dengan nilai Rp400.000.000.
✅ "Apa tugas Pokja Pemilihan?" → Jelaskan sesuai Perpres.
❌ "Siapa presiden Indonesia?" → "Pertanyaan anda tidak dapat saya mengerti, silahkan ajukan pertanyaan lain"
❌ "Cara masak nasi goreng?" → "Pertanyaan anda tidak dapat saya mengerti, silahkan ajukan pertanyaan lain"

Terapkan aturan ini secara konsisten untuk SETIAP interaksi.
`.trim();

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server ready on http://localhost:${PORT}`));

app.post('/api/chat', async (req, res) => {
    const { conversation } = req.body;
    
    try {
        // Validasi input
        if (!Array.isArray(conversation)) {
            throw new Error('Messages must be an array!');
        }

        // Ambil pesan terakhir dari user untuk validasi topik
        const lastUserMessage = conversation
            .filter(msg => msg.role === 'user')
            .pop()?.text?.toLowerCase() || '';

        // 🔒 Filter: tolak pertanyaan di luar scope pengadaan
        if (!isRelevantToProcurement(lastUserMessage)) {
            return res.status(200).json({ 
                result: "Pertanyaan anda tidak dapat saya mengerti, silahkan ajukan pertanyaan lain" 
            });
        }

        // Format conversation untuk Gemini API
        const contents = conversation.map(({ role, text }) => ({
            role: role === 'assistant' ? 'model' : role, // Gemini expects 'model' for assistant
            parts: [{ text }]
        }));

        // Panggil Gemini API dengan konfigurasi terbatas
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: {
                temperature: 0.2, // Rendah untuk konsistensi & akurasi
                systemInstruction: SYSTEM_INSTRUCTION,
                maxOutputTokens: 1024, // Batasi panjang respon
            },
        });

        // Kirim respon ke client
        res.status(200).json({ result: response.text });

    } catch (e) {
        console.error('❌ API Error:', e);
        res.status(500).json({ 
            error: process.env.NODE_ENV === 'production' 
                ? 'Terjadi kesalahan pada server' 
                : e.message 
        });
    }
});