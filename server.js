import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || question.length < 10) {
      return res.json({ answer: 'Lütfen daha detaylı bir soru yazın.' });
    }
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 800,
      system: `Sen kentsel dönüşüm konusunda yardımcı bir rehbersin. 
      Soruları sade ve anlaşılır Türkçe ile yanıtla. 
      Maksimum 3-4 cümle kullan. 
      Kesin hukuki karar verme. 
      Gerekirse uzman görüşü öner.`,
      messages: [{ role: 'user', content: question }]
    });
    res.json({ answer: message.content[0].text });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ answer: 'Bir hata oluştu. Lütfen tekrar deneyin.' });
  }
});

// PDF analysis endpoint
app.post('/api/analyze-pdf', async (req, res) => {
  try {
    const { text, filename } = req.body;
    if (!text) return res.status(400).json({ error: 'Metin bulunamadı.' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5',
      max_tokens: 2000,
      system: `Sen Türkiye'de kentsel dönüşüm ve yapı denetimi konusunda uzman bir rehbersin.
Yüklenen belgeyi analiz et ve sonuçları aşağıdaki başlıklar altında sade, anlaşılır Türkçe ile yaz.
Kesin hukuki veya mühendislik kararı verme. Gerektiğinde uzman görüşü alınmasını tavsiye et.

Güven Seviyesini hesaplarken şu kriterleri kullan:
- Tüm ekler mevcut ve eksiksiz ise +20 puan
- Cezai şartlar dengeli ise +20 puan
- Süreler gerçekçi ise +20 puan
- Tarafların bilgileri tam ise +20 puan
- Hukuki riskler düşük ise +20 puan

Her zaman şu formatta yanıtla:
�
