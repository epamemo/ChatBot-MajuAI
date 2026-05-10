import puppeteer from 'puppeteer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

(async () => {
    try {
        console.log('Memulai browser...');
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });

        console.log('Membuka Moka AI di http://localhost:3000...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 1000)); // wait for animations

        // Screenshot 1: Welcome Screen
        console.log('Mengambil screenshot Welcome Screen...');
        await page.screenshot({ path: 'screenshot1.png' });

        // Screenshot 2: Click Suggestion Chip
        console.log('Mengirim pertanyaan...');
        await page.click('.suggestion-chip[data-question="Jelaskan 4 tipe swakelola dalam Perpres 46/2025"]');
        
        console.log('Menunggu respons dari API (Gemini)...');
        // Wait for bot message to appear (typing indicator is gone)
        await page.waitForFunction(() => {
            const messages = document.querySelectorAll('.message-row.bot .message-bubble');
            return messages.length > 0 && document.querySelector('#typing-indicator:not(.visible)');
        }, { timeout: 45000 });
        
        await new Promise(r => setTimeout(r, 1000)); // wait for fade-in animation

        // Screenshot 2: Conversation
        console.log('Mengambil screenshot Percakapan...');
        await page.screenshot({ path: 'screenshot2.png' });

        await browser.close();

        console.log('Membuat file PDF...');
        const doc = new PDFDocument({ autoFirstPage: false });
        doc.pipe(fs.createWriteStream('Moka_AI_Tampilan.pdf'));

        // Add first screenshot
        const img1 = doc.openImage('screenshot1.png');
        doc.addPage({ size: [img1.width, img1.height] });
        doc.image(img1, 0, 0);

        // Add second screenshot
        const img2 = doc.openImage('screenshot2.png');
        doc.addPage({ size: [img2.width, img2.height] });
        doc.image(img2, 0, 0);

        doc.end();
        console.log('✅ PDF berhasil dibuat: Moka_AI_Tampilan.pdf');
        
        // Cleanup images after a short delay
        setTimeout(() => {
            try {
                fs.unlinkSync('screenshot1.png');
                fs.unlinkSync('screenshot2.png');
            } catch (e) {}
        }, 1000);
        
    } catch (e) {
        console.error('❌ Terjadi kesalahan:', e);
        process.exit(1);
    }
})();
