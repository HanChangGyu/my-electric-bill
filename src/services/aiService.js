// src/services/aiService.js

/**
 * 자취생 전기요금 데이터를 바탕으로 AI의 조언을 받아오는 함수
 * @param {Object} data - { usage: 사용량(kWh), totalBill: 요금(원) }
 */
export const fetchAIAdvice = async (data) => {
  // 1. 금고에서 비밀번호 꺼내기
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  // 2. AI에게 보낼 '주문서(프롬프트)' 작성
  const userPrompt = `
    안녕! 나는 지금 혼자 사는 자취생이야.
    이번 달 전기 사용량은 ${data.usage}kWh이고, 예상 요금은 약 ${data.totalBill}원이야.
    1. 이 사용량이 일반적인 1인 가구 대비 어느 정도인지 분석해줘.
    2. 돈을 아낄 수 있는 아주 구체적인 꿀팁 2가지만 알려줘.
    너는 '20년 차 에너지 절약 전문가'로서 아주 친절하고 든든하게 대답해줘야 해!
  `;

  try {
    // 3. 우체부(fetch)를 통해 OpenAI에 편지 보내기
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`, // 내 비밀번호를 편투 뒷면에 도장 찍기
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // 박사님의 이름 (모델명)
        messages: [{ role: "user", content: userPrompt }],
        temperature: 0.7, // 답변의 창의성 수준 (너무 튀지 않게!)
      }),
    });

    // 4. 답장 읽기
    const result = await response.json();
    return result.choices[0].message.content;

  } catch (error) {
    // 에러 발생 시 처리 (방어 코드 영역)
    console.error("AI 박사님이 아프신 것 같아요:", error);
    throw new Error("답변을 가져오지 못했습니다.");
  }
};