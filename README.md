# ☕ Moka AI - Chatbot Pengadaan Perpres 46/2025

Moka AI adalah asisten cerdas berbasis AI yang dirancang khusus untuk menjawab pertanyaan seputar **Peraturan Presiden Nomor 46 Tahun 2025** tentang Pengadaan Barang/Jasa Pemerintah. Dengan antarmuka yang modern dan hangat (Coffee Theme), Moka AI memberikan jawaban yang akurat, cepat, dan berdasar hukum.

🚀 **Live Demo:** [https://moka-ai-sigma.vercel.app/](https://moka-ai-sigma.vercel.app/)

---

## ✨ Fitur Utama

- **Knowledge-Based AI:** Jawaban murni didasarkan pada dokumen Perpres 46 Tahun 2025.
- **Strict Procurement Focus:** Chatbot hanya akan menjawab topik terkait pengadaan pemerintah untuk menjaga akurasi.
- **Modern UI/UX:** Desain premium dengan tema kopi yang responsif, animasi halus, dan micro-interactions.
- **Gemini 2.5 Flash Powered:** Menggunakan model AI terbaru dari Google untuk pemrosesan bahasa yang cepat dan cerdas.
- **Vercel Optimized:** Siap dideploy sebagai Serverless Functions untuk skalabilitas tinggi.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, Vanilla CSS3 (Custom Coffee Theme), JavaScript (ES6+).
- **Backend:** Node.js, Express.js.
- **AI Model:** Google Gemini 2.5 Flash API.
- **Deployment:** Vercel (Serverless Functions).

---

## 📋 Prasyarat

Sebelum menjalankan proyek ini di lokal, pastikan Anda memiliki:

- [Node.js](https://nodejs.org/) (Versi 18 ke atas)
- [Gemini API Key](https://aistudio.google.com/app/apikey) dari Google AI Studio.

---

## 🚀 Instalasi Lokal

1. **Clone Repository:**
   ```bash
   git clone https://github.com/username/gemini-chatbot-api.git
   cd gemini-chatbot-api
   ```

2. **Instal Dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment:**
   Buat file `.env` di root folder dan tambahkan API Key Anda:
   ```env
   GEMINI_API_KEY=your_api_key_here
   PORT=3000
   ```

4. **Jalankan Aplikasi:**
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000` di browser Anda.

---

## 📦 Struktur Folder

```text
.
├── api/                # Backend (Vercel Serverless Functions)
│   └── index.js        # Entry point API & Express logic
├── public/             # Frontend assets
│   ├── index.html
│   ├── script.js
│   └── style.css
├── perpres-46-2025-knowledge.md  # Dokumen referensi AI
├── package.json        # Dependensi & Scripts
└── vercel.json         # Konfigurasi deployment Vercel
```

---

## ☁️ Deployment ke Vercel

Proyek ini sudah dikonfigurasi untuk Vercel. Ikuti langkah ini:

1. Push kode Anda ke GitHub.
2. Hubungkan repository ke Vercel Dashboard.
3. Gunakan Framework Preset **"Other"**.
4. Tambahkan Environment Variable `GEMINI_API_KEY` di Settings Vercel.
5. Klik **Deploy**.

---

## ⚖️ Lisensi

Proyek ini dilisensikan di bawah [ISC License](LICENSE).

---

Developed with ☕ by **epamemo and AI Besties**
