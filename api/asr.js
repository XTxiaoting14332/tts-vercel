// api/asr.js
export const config = {
  api: { bodyParser: false }, // 必须禁用，否则无法接收二进制流
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('只支持 POST');

  try {
    // 1. 接收 ESP32 传来的原始 PCM 数据
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const pcmBuffer = Buffer.concat(chunks);

    if (pcmBuffer.length === 0) return res.status(400).send('无音频数据');

    // 2. 将 PCM (16k, 16bit, mono) 封装成 WAV
    const wavBuffer = encodeWAV(pcmBuffer, 16000);

    // 3. 构造请求发送给你的 Cloudflare Worker (STT接口)
    const formData = new FormData();
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    formData.append('file', blob, 'speech.wav');
    
    // 从 Vercel 环境变量读取 Token
    const token = process.env.SILICONFLOW_TOKEN;
    if (token) formData.append('token', token);

    const workerUrl = 'https://tts.zobyic.top/v1/audio/transcriptions'; 
    
    const response = await fetch(workerUrl, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    

    res.status(200).send(result.text || "未识别到内容");

  } catch (error) {
    console.error(error);
    res.status(500).send('中转报错: ' + error.message);
  }
}

function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length);
  const view = new DataView(buffer);
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length, true);
  const pcm = new Uint8Array(buffer, 44);
  pcm.set(new Uint8Array(samples));
  return buffer;
}