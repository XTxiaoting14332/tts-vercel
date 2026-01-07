export default async function handler(req, res) {
    const WORKER_URL = "https://tts.zobyic.top/v1/audio/speech";

    let text = "";
    let voice = "zh-CN-XiaoxiaoNeural";

    // 1. 兼容性解析：自动判断是 GET 还是 POST
    if (req.method === 'POST') {
        // 处理板子发来的 POST JSON
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        text = body.input || body.text;
    } else {
        // 处理浏览器直接访问的 GET ?text=...
        const { searchParams } = new URL(req.url, `https://${req.headers.host}`);
        text = searchParams.get("text") || searchParams.get("input");
    }

    // 如果没有获取到文字，返回提示
    if (!text) {
        return res.status(400).json({ error: "Missing text", tip: "请在URL后添加 ?text=你好" });
    }

    console.log(`正在转发请求: ${text}`);

    try {
        // 2. 构造发送给 Worker 的标准格式
        const workerResponse = await fetch(WORKER_URL, {
            method: 'POST', // 统一转换成 Worker 喜欢的 POST
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: text, voice: voice })
        });

        const arrayBuffer = await workerResponse.arrayBuffer();
        
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).send(Buffer.from(arrayBuffer));

    } catch (error) {
        res.status(500).json({ error: "Proxy Error", message: error.message });
    }
}