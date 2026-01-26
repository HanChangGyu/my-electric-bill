// src/services/aiService.js

/**
 * [REAL 모드] 실제 OpenAI API를 호출하여 자취생 맞춤 절약 조언을 가져옵니다.
 * - 모델: gpt-4o-mini (가성비 최강)
 * - 기능: 가전제품별 상세 내역을 분석하여 '전기 도둑'을 찾아냄
 */
export const fetchAIAdvice = async (data) => {
  // 1. .env에서 진짜 열쇠 꺼내기
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  // [NEW] App.jsx에서 보낸 'details(상세 내역)'까지 받아야 함!
  const { usage, totalBill, details } = data;

  // [방어 코드] 키가 없으면 아예 요청을 보내지 않음 (비용/에러 방지)
  if (!apiKey || apiKey.includes("your_actual_api_key")) {
    console.error("🚨 API 키가 설정되지 않았습니다!");
    return "시스템 오류: API 키가 없습니다. 개발자에게 문의하세요.";
  }

  // 2. AI에게 보낼 '고지능 상황판(프롬프트)' 설계
  // 단순 사용량뿐만 아니라, 어떤 가전을 얼마나 썼는지까지 알려줘서 정밀 분석을 시킴
  const userPrompt = `
    역할: 너는 20년 차 베테랑 '자취생 전기요금 절약 컨설턴트'야.
    주어진 데이터를 분석해서 전기요금 주범을 찾아내고, 실천 가능한 해결책을 제시해.

    [사용자 상황]
    - 주거 형태: 한국의 1인 가구 (자취생)
    - 이번 달 총 사용량: ${usage}kWh
    - 예상 청구 금액: ${Number(totalBill).toLocaleString()}원

    [가전제품별 사용 현황 (중요 분석 대상)]
    ${details}

    [한국 전기요금 누진세 정보 (참고 기준)]
    - 1단계 (안전): 200kWh 이하
    - 2단계 (보통): 201 ~ 400kWh (여기서부터 주의 필요)
    - 3단계 (위험): 400kWh 초과 (요금 폭탄 구간, 슈퍼유저 요금)

    [미션: 아래 3가지 내용을 포함해서 답변해줘]
    1. 📊 **현재 상태 진단**: 누진세 구간을 언급하며 현재 요금 수준이 안전한지 위험한지 한 줄로 요약해.
       (특히 200kWh나 400kWh 경계선 근처라면 강력하게 경고할 것)
    2. 🕵️ **전기 도둑 체포**: [가전제품별 사용 현황]을 보고 가장 문제가 되는(전기를 많이 먹는) 가전제품 하나를 콕 집어서 지적해.
    3. 💡 **즉시 실천 행동**: 그 가전제품을 어떻게 써야 돈을 아낄 수 있는지 아주 구체적인 꿀팁 1개를 줘.

    [톤앤매너]
    - 친근하지만 팩폭(팩트 폭력)을 날리는 전문가 말투.
    - 너무 길지 않게 핵심만 딱 짚어서. (이모지 적절히 사용)
  `;

  try {
    // 3. 실제 OpenAI 서버로 편지 보내기 (POST 요청)
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        // [핵심 변경] 모델을 더 똑똑하고 저렴한 녀석으로 교체!
        model: "gpt-4o-mini", 
        messages: [{ role: "user", content: userPrompt }],
        temperature: 0.5, // 분석적인 답변을 위해 0.5 유지
        max_tokens: 500,  // 상세 분석이라 말이 좀 길어질 수 있으니 넉넉하게
      }),
    });

    // 4. 응답 확인 (방어 코드)
    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API 호출 에러:", errorData);
      throw new Error("API 호출에 실패했습니다.");
    }

    // 5. 답변 꺼내서 돌려주기
    const result = await response.json();
    return result.choices[0].message.content;

  } catch (error) {
    console.error("🚨 AI 연결 실패:", error);
    return "박사님이 잠시 통화 중이시네요. (네트워크 오류 또는 API 키를 확인해주세요)";
  }
};