import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix: __dirname di ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = "gemini-2.5-flash-lite";

// 📁 Path ke file knowledge
const KNOWLEDGE_PATH = path.join(process.cwd(), 'perpres-46-2025-knowledge.md');

// 🛡️ SECURITY: Strict CORS
// Hanya izinkan domain frontend Anda
const allowedOrigins = ['http://localhost:3000', 'https://moka-ai-sigma.vercel.app'];
app.use(cors({
    origin: function (origin, callback) {
        // Izinkan request tanpa origin (seperti curl/Postman) selama development, 
        // tapi di produksi sebaiknya tolak jika tidak sesuai.
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

app.use(express.json({ limit: '50kb' })); // 🛡️ SECURITY: Batasi ukuran JSON payload
app.use(express.static(path.join(process.cwd(), 'public')));

// 🛡️ SECURITY: Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 menit
    max: 10, // Maksimal 10 request per IP per menit
    message: { result: "Maaf, Anda mengirim terlalu banyak pesan. Silakan tunggu sebentar." },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/chat', apiLimiter);

// Cache konten knowledge
let knowledgeCache = null;

// 📥 Fungsi baca knowledge file
function loadKnowledge(filePath) {
    try {
        console.log('📂 Memuat knowledge:', filePath);
        
        if (!fs.existsSync(filePath)) {
            const altPath = path.join(__dirname, '..', 'perpres-46-2025-knowledge.md');
            if (fs.existsSync(altPath)) {
                filePath = altPath;
            } else {
                throw new Error(`File tidak ditemukan: ${filePath}`);
            }
        }
        
        const content = fs.readFileSync(filePath, 'utf-8');
        console.log(`✅ Knowledge dimuat: ${content.length} karakter`);
        return content.trim();
        
    } catch (error) {
        console.error('❌ Gagal memuat knowledge:', error.message);
        return null;
    }
}

// Initialize knowledge
knowledgeCache = loadKnowledge(KNOWLEDGE_PATH);

// 🔍 Filter keyword: hanya izinkan topik pengadaan
function isRelevantToProcurement(question) {
    if (!question || typeof question !== 'string') return false;
    
    const keywords = [
        'pengadaan', 'barang', 'jasa', 'pemerintah', 'perpres', 'ppk', 'kpa', 'pa',
        'tender', 'seleksi', 'e-purchasing', 'penunjukan langsung', 'pengadaan langsung',
        'produk dalam negeri', 'sni', 'ukpbj', 'pokja', 'kontrak', 'hps', 'rup',
        'swakelola', 'penyedia', 'pelaku usaha', 'sanksi', 'daftar hitam', 'e-kontrak',
        'lpse', 'lkpp', 'pengguna anggaran', 'pejabat pengadaan', 'sertifikasi',
        'metode pemilihan', 'batas nilai', 'konstruksi', 'konsultansi', 'tkdn', 'umk',
        'e-katalog', 'katalog elektronik', 'jaminan penawaran', 'jaminan pelaksanaan',
        'uang muka', 'serah terima', 'dokumen pengadaan', 'evaluasi penawaran',
        'kualifikasi', 'prakualifikasi', 'pascakualifikasi', 'harga perkiraan sendiri',
        'rencana umum pengadaan', 'konsolidasi pengadaan', 'pengadaan berkelanjutan',
        'pengadaan desa', 'pengadaan internasional', 'reverse auction', 'mini kompetisi'
    ];
    
    const lowerQ = question.toLowerCase().trim();
    const hasProcurementKeyword = keywords.some(k => lowerQ.includes(k));
    
    const blockedTopics = [
        'resep', 'masak', 'musik', 'film', 'game', 'olahraga', 'politik', 'agama',
        'kesehatan pribadi', 'obat', 'dokter', 'sekolah', 'kuliah', 'beasiswa',
        'kerja', 'lowongan', 'gaji', 'pajak pribadi', 'asuransi pribadi',
        'travel', 'wisata', 'hotel', 'penerbangan', 'restoran', 'belanja pribadi',
        'teknologi umum', 'programming', 'coding', 'ai chatbot', 'prompt engineering'
    ];
    
    const hasBlockedTopic = blockedTopics.some(t => lowerQ.includes(t));
    
    return hasProcurementKeyword && !hasBlockedTopic;
}

// 🎯 System instruction
const SYSTEM_INSTRUCTION = `
Anda adalah asisten chatbot khusus untuk tanya jawab **Pengadaan Barang/Jasa Pemerintah di Indonesia**.

📚 SUMBER PENGETAHUAN UTAMA:
- Perpres 46 Tahun 2025 (Perubahan Kedua atas Perpres 16/2018) → PRIORITAS
- Peraturan pengadaan barang/jasa pemerintah Indonesia lainnya → SEKUNDER
- Pengetahuan umum tentang praktik pengadaan pemerintah → PELENGKAP

✅ ANDA BOLEH MENJAWAB JIKA:
1. Pertanyaan terkait pengadaan barang/jasa pemerintah Indonesia
2. Pertanyaan tentang metode, proses, peran, sanksi, atau ketentuan pengadaan pemerintah
3. Pertanyaan teknis seputar tender, seleksi, e-purchasing, kontrak, HPS, PPK, dll
4. Pertanyaan tentang Produk Dalam Negeri, TKDN, UMK, atau aspek spesifik pengadaan

❌ ANDA HARUS MENOLAK JIKA:
1. Topik TIDAK terkait pengadaan barang/jasa pemerintah → Balas PERSIS: "Pertanyaan anda tidak dapat saya mengerti, silahkan ajukan pertanyaan lain"
2. Pertanyaan tentang pengadaan swasta/korporat/non-pemerintah → Tolak dengan pesan yang sama
3. Pertanyaan umum di luar konteks pengadaan → Tolak dengan pesan yang sama
4. Jika informasi spesifik tidak ditemukan di referensi → Katakan: "Informasi tersebut tidak diatur dalam Perpres 46 Tahun 2025 atau peraturan pengadaan terkait yang saya miliki."

📝 ATURAN RESPON:
1. Gunakan Bahasa Indonesia formal, jelas, dan profesional
2. Prioritaskan jawaban berdasarkan Perpres 46/2025 jika relevan
3. Sebutkan pasal/angka jika memungkinkan untuk akurasi
4. Jawab singkat, padat, langsung ke inti
5. JANGAN mengarang, mengasumsikan, atau memberikan informasi spekulatif
`.trim();

const PORT = process.env.PORT || 3000;

// Helper: Format error message yang aman untuk user
function getSafeErrorMessage(error) {
    const code = error?.code || error?.status;
    
    // 🚫 Quota exceeded (429)
    if (code === 429 || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.message?.includes('quota')) {
        console.warn('⚠️ API quota exceeded, retry after delay');
        return "Maaf, layanan sedang sibuk. Silakan coba lagi dalam beberapa saat.";
    }
    
    // 🔐 Authentication/Authorization error (401/403)
    if (code === 401 || code === 403 || error?.message?.includes('API_KEY_INVALID')) {
        console.error('❌ API authentication error');
        return "Maaf, terjadi kesalahan konfigurasi sistem. Silakan hubungi administrator.";
    }
    
    // 📦 Invalid request (400)
    if (code === 400) {
        console.warn('⚠️ Invalid request to API');
        return "Maaf, format pertanyaan tidak valid. Silakan ajukan pertanyaan dengan kalimat yang jelas.";
    }
    
    // 🌐 Network/timeout errors
    if (error?.message?.includes('timeout') || error?.message?.includes('network') || error?.code === 'ECONNABORTED') {
        console.warn('⚠️ Network error');
        return "Maaf, koneksi ke server terganggu. Silakan periksa koneksi internet Anda dan coba lagi.";
    }
    
    // 🤖 Model error
    if (error?.message?.includes('model') || error?.message?.includes('not found')) {
        console.error('❌ Model error');
        return "Maaf, layanan AI sedang dalam perbaikan. Silakan coba lagi nanti.";
    }
    
    // ❓ Default fallback (production vs development)
    return process.env.NODE_ENV === 'production' 
        ? "Maaf, terjadi kesalahan pada server. Silakan coba lagi nanti." 
        : `Error: ${error?.message || 'Unknown error'}`;
}

app.post('/api/chat', async (req, res) => {
    const { conversation } = req.body;
    
    try {
        // 🛡️ SECURITY: Validasi ketat format payload
        if (!Array.isArray(conversation)) {
            return res.status(400).json({ result: "Format data tidak valid. Harus berupa array." });
        }
        if (conversation.length === 0 || conversation.length > 50) {
            return res.status(400).json({ result: "Jumlah pesan tidak valid (maksimal 50 pesan)." });
        }

        // 🛡️ SECURITY: Validasi isi setiap pesan
        const isValid = conversation.every(msg => 
            msg && 
            typeof msg === 'object' &&
            typeof msg.role === 'string' &&
            ['user', 'assistant'].includes(msg.role) && // Cegah role spoofing (seperti 'system')
            typeof msg.text === 'string' &&
            msg.text.length > 0 &&
            msg.text.length <= 2000 // Batasi panjang karakter per pesan
        );

        if (!isValid) {
            return res.status(400).json({ result: "Format pesan di dalam percakapan tidak valid." });
        }

        // Ambil pesan terakhir user untuk validasi
        const lastUserMessage = conversation
            .filter(msg => msg.role === 'user')
            .pop()?.text || '';

        // 🔒 Lapisan 1: Filter keyword
        if (!isRelevantToProcurement(lastUserMessage)) {
            console.log(`⚠️ Ditolak (scope): "${lastUserMessage.slice(0, 100)}..."`);
            return res.status(200).json({ 
                result: "Pertanyaan anda tidak dapat saya mengerti, silahkan ajukan pertanyaan lain" 
            });
        }

        // ⚠️ Cek jika knowledge belum terload
        if (!knowledgeCache) {
            knowledgeCache = loadKnowledge(KNOWLEDGE_PATH);
            if (!knowledgeCache) {
                return res.status(200).json({ 
                    result: "Maaf, dokumen referensi sedang dimuat. Silakan coba beberapa saat lagi." 
                });
            }
        }

        // Format contents untuk Gemini API
        const contents = [
            { role: "user", parts: [{ text: SYSTEM_INSTRUCTION }] },
            { role: "user", parts: [{ text: `📄 REFERENSI: Perpres 46 Tahun 2025\n\n${knowledgeCache}` }] },
            ...conversation.map(({ role, text }) => ({
                role: role === 'assistant' ? 'model' : role,
                parts: [{ text }]
            }))
        ];

        // Panggil Gemini API dengan error handling
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: {
                temperature: 0.15,
                maxOutputTokens: 700,
                responseMimeType: "text/plain",
            },
        });

        res.status(200).json({ result: response.text });

    } catch (e) {
        // 🎯 Log error detail di server (untuk debugging admin)
        console.error('❌ API Error:', {
            message: e?.message,
            code: e?.code || e?.status,
            details: e?.details?.[0]?.quotaId || 'N/A'
        });

        // 🛡️ Kirim pesan aman ke user (tanpa expose detail error)
        const safeMessage = getSafeErrorMessage(e);
        
        res.status(200).json({ result: safeMessage });
    }
});

// Hanya jalankan listener jika tidak di Vercel/production serverless
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 Server ready on http://localhost:${PORT}`);
        console.log('📚 Knowledge Perpres 46/2025 siap digunakan');
        console.log('🔒 Scope: Hanya pengadaan barang/jasa pemerintah');
        console.log('🛡️ Error handling: Aktif (user-friendly messages)');
    });
}

export default app;