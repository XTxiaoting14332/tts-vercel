import fetch from 'node-fetch';

export default async function handler(req, res) {

    const WORKER_URL = "https://tts.zobyic.top/v1/audio/speech";


    const body = req.method === 'POST' ? req.body : null;
    const query = req.url.split('?')[1] || "";

    console.log("正在中转请求至 Worker...");

    try {
        const workerResponse = await fetch(`${WORKER_URL}${query ? '?' + query : ''}`, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Vercel-Proxy-Server'
            },
            body: body ? JSON.stringify(body) : undefined
        });

        res.setHeader('Content-Type', workerResponse.headers.get('content-type') || 'audio/mpeg');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Connection', 'close'); 

        const arrayBuffer = await workerResponse.arrayBuffer();
        res.status(200).send(Buffer.from(arrayBuffer));

    } catch (error) {
        console.error("中转失败:", error);
        res.status(500).send("Proxy Error: " + error.message);
    }
}