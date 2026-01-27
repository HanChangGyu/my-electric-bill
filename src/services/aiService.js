// src/services/aiService.js

/**
 * [REAL 모드] Vercel Serverless Function을 통해 안전하게 OpenAI API를 호출합니다.
 * - 클라이언트(브라우저)에는 API Key가 절대 노출되지 않습니다.
 */
export const fetchAIAdvice = async (data) => {
  // [삭제됨] 클라이언트에서 API Key를 직접 가져오는 코드는 보안상 삭제했습니다.
  // const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  // App.jsx에서 보낸 데이터 받기
  const { usage, totalBill, details } = data;

  // [삭제됨] 키 유효성 검사 로직 삭제 (서버에서 수행함)
  
  // 2. AI에게 보낼 '고지능 상황판(프롬프트)' 설계 (기존과 동일)
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

    [★ 중요 분석 규칙 ★]
    1. '냉장고'는 24시간 켜져 있는 필수 가전이므로, 절약 대상인 '전기 도둑'으로 지목하지 마. (단, 구형 냉장고로 의심될 때만 예외적으로 언급)
    2. 사용자가 조절할 수 있는 가전(에어컨, 온열기, 밥솥 보온, 컴퓨터 등) 위주로 범인을 찾아줘.

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
    // [수정됨] OpenAI 주소 대신, 우리가 만든 Vercel API 주소로 요청을 보냅니다.
    // [수정됨] Header에서 Authorization(API Key) 제거 (서버가 알아서 붙임)
    const response = await fetch("/api/askAi", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // [수정됨] 모델명, 온도 설정 등은 보안을 위해 서버 코드(api/askAi.js)로 이동하는 것이 정석입니다.
        // 여기서는 서버가 필요로 하는 'messages'만 깔끔하게 포장해서 보냅니다.
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    // 4. 응답 확인 (방어 코드)
    if (!response.ok) {
      // 서버에서 에러 메시지를 보냈을 경우를 대비해 json 파싱 시도
      try {
        const errorData = await response.json();
        console.error("서버 에러 응답:", errorData);
      } catch (e) {
        console.error("서버 에러 (파싱 불가):", response.statusText);
      }
      throw new Error("AI 분석 서버 연결 실패");
    }

    // 5. 답변 꺼내서 돌려주기 (구조는 동일)
    const result = await response.json();
    return result.choices[0].message.content;

  } catch (error) {
    console.error("🚨 AI 연결 실패:", error);
    return "박사님이 잠시 통화 중이시네요. (잠시 후 다시 시도해주세요)";
  }
};