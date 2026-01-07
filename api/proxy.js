export default async function handler(req, res) {
    // 你的 Cloudflare Worker 完整地址
    const WORKER_URL = "https://tts.zobyic.top/v1/audio/speech";

    // 1. 获取来自板子的参数 (支持 GET 和 POST)
    let body = null;
    if (req.method === 'POST') {
        // Vercel 会自动解析 JSON body
        body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
    
    const urlObj = new URL(req.url, `https://${req.headers.host}`);
    const query = urlObj.search;

    console.log(`正在转发请求至 Worker: ${WORKER_URL}${query}`);

    try {
        // 使用 Node.js 内置的 fetch，不再依赖 node-fetch 库
        const workerResponse = await fetch(`${WORKER_URL}${query}`, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Vercel-Proxy-Server'
            },
            body: body
        });

        // 2. 将音频数据读取为 ArrayBuffer
        const arrayBuffer = await workerResponse.arrayBuffer();
        
        // 3. 设置给板子的 Response Headers
        res.setHeader('Content-Type', workerResponse.headers.get('content-type') || 'audio/mpeg');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Connection', 'close'); 

        // 4. 发送二进制数据
        res.status(200).send(Buffer.from(arrayBuffer));

    } catch (error) {
        console.error("中转失败:", error);
        res.status(500).json({ error: "Proxy Error", message: error.message });
    }
}