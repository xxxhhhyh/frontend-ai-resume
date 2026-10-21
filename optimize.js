// api/optimize.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    const { text } = req.body;
    const API_KEY = process.env.DASHSCOPE_API_KEY; // 等会儿在Vercel后台配
  
    try {
      const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'qwen3.5-plus-2026-02-15', // 记得用你昨天测通的模型名
          messages: [
            { role: 'system', content: '你是一个简历优化助手。请帮助用户优化简历，保持原意，但让表达更专业、更具吸引力。' },
            { role: 'user', content: text }
          ],
          stream: true // 开启流式
        })
      });
  
      // 这里要把流式数据转给前端
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
  
      for await (const chunk of response.body) {
        res.write(Buffer.from(chunk).toString('utf-8'));
      }
      res.end();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }