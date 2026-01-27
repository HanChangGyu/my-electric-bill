// api/askAi.js
// 이 코드는 브라우저가 아닌 Vercel의 안전한 서버에서 실행됩니다.

export default async function handler(req, res) {
  // 1. 서버 환경변수에서 비밀 키를 꺼냅니다. (브라우저 노출 절대 안 됨)
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Server Error: API Key is missing." });
  }

  // 2. 클라이언트(프론트엔드)가 보낸 메시지 데이터 받기
  const { messages } = req.body;

  try {
    // 3. 서버가 대신 OpenAI에 요청 (중계 역할)
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`, // 여기서 키를 붙여서 보냅니다
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // 혹은 gpt-3.5-turbo
        messages: messages,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    // 4. 결과를 클라이언트에게 반환
    res.status(200).json(data);
    
  } catch (error) {
    console.error("OpenAI Error:", error);
    res.status(500).json({ error: "Failed to fetch AI response" });
  }
}