// api/asr.js
export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    // 1. 接收来自 ESP32 的 PCM 数据
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const pcmBuffer = Buffer.concat(chunks);

    if (pcmBuffer.length === 0) {
      return res.status(400).send('没有接收到音频数据');
    }

    // 2. 将 PCM 转换为标准的 16k/16bit/单声道 WAV
    const wavBuffer = encodeWAV(pcmBuffer, 16000);

    // 3. 使用标准的 FormData 包装 WAV 文件
    const formData = new FormData();
    // 关键：将 Buffer 转为 Blob 才能被 fetch 的 FormData 识别
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    formData.append('file', blob, 'speech.wav'); 

    // 4. 请求你的 Cloudflare Worker (即 STT 接口)
    const workerUrl = 'https://tts.zobyic.top/v1/audio/transcriptions'; 
    const response = await fetch(workerUrl, {
      method: 'POST',
      body: formData, 
    });

    const result = await response.json();
    
    res.status(200).json(result);

  } catch (error) {
    console.error(error);
    res.status(500).send('中转失败: ' + error.message);
  }
}

// 辅助函数：PCM 转 WAV 核心逻辑
function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length);
  const view = new DataView(buffer);
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
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
  
  // 填充 PCM 数据
  const pcm = new Uint8Array(buffer, 44);
  pcm.set(new Uint8Array(samples));
  return buffer;
}