import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix: __dirname di ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = "gemini-2.5-flash";

// 📁 Path ke file knowledge (gunakan process.cwd() agar aman di Vercel)
const KNOWLEDGE_PATH = path.join(process.cwd(), 'perpres-46-2025-knowledge.md');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'public')));

// Cache konten knowledge
let knowledgeCache = null;

// 📥 Fungsi baca knowledge file
function loadKnowledge(filePath) {
    try {
        console.log('📂 Memuat knowledge:', filePath);
        
        if (!fs.existsSync(filePath)) {
            // Coba path alternatif jika process.cwd() berbeda di environment tertentu
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

// Initialize knowledge immediately
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
        'metode pemilihan', 'batas nilai', 'konstruksi', 'konsultansi', 'tkdn', 'umk'
    ];
    
    const lowerQ = question.toLowerCase();
    return keywords.some(k => lowerQ.includes(k));
}

// 🎯 System instruction ringkas & ketat
const SYSTEM_INSTRUCTION = `
Anda adalah asisten chatbot untuk tanya jawab **Pengadaan Barang/Jasa Pemerintah**.

ATURAN WAJIB:
1. JAWAB HANYA berdasarkan dokumen Perpres 46 Tahun 2025 yang disediakan di konteks.
2. Jika pertanyaan TIDAK terkait pengadaan pemerintah → balas PERSIS: "Pertanyaan anda tidak dapat saya mengerti, silahkan ajukan pertanyaan lain"
3. Jika informasi tidak ditemukan di dokumen → katakan: "Informasi tersebut tidak diatur dalam Perpres 46 Tahun 2025."
4. Gunakan Bahasa Indonesia formal. JANGAN mengarang atau mengasumsikan.
5. Sebutkan pasal/nomor jika relevan untuk meningkatkan akurasi.
6. Jawab singkat, padat, dan langsung ke inti.
`.trim();

const PORT = process.env.PORT || 3000;

app.post('/api/chat', async (req, res) => {
    const { conversation } = req.body;
    
    try {
        if (!Array.isArray(conversation)) {
            throw new Error('Messages must be an array!');
        }

        const lastUserMessage = conversation
            .filter(msg => msg.role === 'user')
            .pop()?.text || '';

        if (!isRelevantToProcurement(lastUserMessage)) {
            return res.status(200).json({ 
                result: "Pertanyaan anda tidak dapat saya mengerti, silahkan ajukan pertanyaan lain" 
            });
        }

        if (!knowledgeCache) {
            // Retry load if cache is empty
            knowledgeCache = loadKnowledge(KNOWLEDGE_PATH);
            if (!knowledgeCache) {
                return res.status(200).json({ 
                    result: "Maaf, dokumen referensi sedang dimuat. Silakan coba beberapa saat lagi." 
                });
            }
        }

        const contents = [
            { role: "user", parts: [{ text: SYSTEM_INSTRUCTION }] },
            { role: "user", parts: [{ text: `📄 REFERENSI: Perpres 46 Tahun 2025\n\n${knowledgeCache}` }] },
            ...conversation.map(({ role, text }) => ({
                role: role === 'assistant' ? 'model' : role,
                parts: [{ text }]
            }))
        ];

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: {
                temperature: 0.1,
                maxOutputTokens: 800,
            },
        });

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

// Hanya jalankan listener jika tidak di Vercel
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 Server ready on http://localhost:${PORT}`);
        console.log('📚 Knowledge Perpres 46/2025 siap digunakan');
    });
}

export default app;
