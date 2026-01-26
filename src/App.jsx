import { useState } from 'react';
import { APPLIANCE_LIST } from './data/constants';
import { calculateTotalUsage, calculateBill, formatCurrency } from './utils/calculate';
import { fetchAIAdvice } from './services/aiService'; 

function App() {
  const [voltageType, setVoltageType] = useState('LOW_VOLTAGE');
  
  // 가전제품별 사용 시간 상태 관리
  // [🛡️ 방어 코드] 초기값 설정 시, 'always' 타입은 강제로 24시간으로 설정하여 논리적 오류 방지
  const [hoursData, setHoursData] = useState(
    APPLIANCE_LIST.reduce((acc, app) => ({ ...acc, 
      [app.id]: app.type ==='always' ? 24 : 0 }), {})
  );

  const [aiAdvice, setAiAdvice] = useState(""); 
  const [isLoading, setIsLoading] = useState(false); 

  // [설정] 보안 규칙 정의 (숫자만 바꾸면 규칙이 바뀜!)
  const DAILY_LIMIT = 10;      // 하루에 허용할 최대 질문 횟수 (10회)
  const COOLDOWN_SECONDS = 50; // 질문 후 기다려야 하는 시간 (50초)

  // 사용 시간 입력 핸들러
  const handleHoursChange = (id, value) => { 
    const appliance = APPLIANCE_LIST.find(app => app.id === id);
    
    // [🛡️ 방어 코드 1] 데이터 타입 방어
    // 사용자가 숫자가 아닌 값(문자 등)을 입력했을 때 NaN(Not a Number) 에러를 막기 위해 0으로 처리
    let numValue = Number(value) || 0;

    // [🛡️ 방어 코드 2] 비즈니스 로직 보호 (냉장고 등)
    // 24시간 켜져 있어야 하는 제품을 사용자가 임의로 0시간으로 줄이지 못하게 강제 고정
    if (appliance?.type === 'always') {
      numValue = 24;
    } else {
      // [🛡️ 방어 코드 3] 입력 범위 제한 (Edge Case 방어)
      // 하루는 24시간이므로 24를 초과하거나 음수가 입력되는 비정상적인 상황 차단
      if (numValue > 24) numValue = 24;
      if (numValue < 0) numValue = 0;
    }
    setHoursData(prev => ({ ...prev, [id]: numValue }));
    
    // [UI/UX 방어] 입력값이 바뀌면 기존의 AI 조언은 더 이상 유효하지 않으므로 초기화
    if (aiAdvice) setAiAdvice(""); 
  };

  // 계산 전 데이터 전처리 및 안전한 객체 생성
  const selectedWithHours = APPLIANCE_LIST.map(app => {
    // [🛡️ 방어 코드 4] 데이터 무결성 보장 (Fallback 처리)
    // 만약 constants.js 데이터에 power나 type 속성이 실수로 누락되었을 경우를 대비해 기본값 할당
    const power = app.power || 0; 
    const type = app.type || 'periodic'; 

    return {
      ...app,
      power, 
      type,  
      hours: hoursData[app.id] || 0 // 상태값이 없으면 0시간으로 처리
    };
  });

  const totalKwh = calculateTotalUsage(selectedWithHours);
  const totalBill = calculateBill(totalKwh, voltageType);

  // AI 분석 요청 핸들러
  const handleAskAI = async () => {
    // [🛡️ 방어 코드 5] API 비용 누수 방지
    // 사용량이 0인 상태에서는 의미 없는 요청을 보내지 않음
    if (totalKwh <= 0) {
      alert("가전제품 사용 시간을 먼저 입력해주세요!");
      return;
    }

    // --- [보안 로직 시작] LocalStorage를 활용한 클라이언트 보안 ---
    
    // 1. 현재 시간과 오늘 날짜 구하기
    const now = Date.now(); // 현재 시간을 밀리초(ms) 단위로 가져옴
    const todayDate = new Date().toISOString().split('T')[0]; // "2026-01-26" 형태로 날짜만 추출

    // 2. 브라우저 저장소(LocalStorage)에서 기록 꺼내오기
    // LocalStorage는 브라우저를 껐다 켜도 데이터가 남아있는 나만의 비밀 금고야!
    const lastRequestTime = localStorage.getItem('AI_LAST_REQ_TIME'); // 마지막 요청 시간
    const dailyUsageRaw = localStorage.getItem('AI_DAILY_USAGE');     // 일일 사용 기록 JSON

    // [🛡️ 방어 코드 9] 쿨타임(Cooldown) 체크
    // 마지막 요청 시간으로부터 50초가 지났는지 확인
    if (lastRequestTime) {
      const timeDiff = now - Number(lastRequestTime); // 흐른 시간 (ms)
      const waitTime = COOLDOWN_SECONDS * 1000;       // 기다려야 하는 시간 (50000ms)

      if (timeDiff < waitTime) {
        const remainingSeconds = Math.ceil((waitTime - timeDiff) / 1000);
        alert(`⏳ 박사님이 잠시 휴식 중입니다.\n${remainingSeconds}초 뒤에 다시 물어봐 주세요!`);
        return; // 여기서 함수를 끝내버려서 API 요청을 원천 차단함 (돈 안 나감!)
      }
    }

    // [🛡️ 방어 코드 10] 일일 사용량 제한 (Daily Limit) 체크
    let usageData = { date: todayDate, count: 0 }; // 기본값 (오늘 날짜, 0회)

    if (dailyUsageRaw) {
      const parsedData = JSON.parse(dailyUsageRaw);
      // 저장된 날짜가 오늘과 같다면 기록을 가져오고, 아니면(내일이면) 0으로 초기화된 상태 유지
      if (parsedData.date === todayDate) {
        usageData = parsedData;
      }
    }

    if (usageData.count >= DAILY_LIMIT) {
      alert(`앗! 오늘의 무료 상담 횟수(${DAILY_LIMIT}회)를 모두 쓰셨네요 😭\n내일 다시 찾아와 주세요!`);
      return; // API 요청 차단
    }

    // --- [보안 로직 통과] 이제 진짜 요청 시작 ---

    setIsLoading(true); 
    setAiAdvice(""); 

    try {
      // 1. 목록 정리
      const details = selectedWithHours
        .filter(app => app.hours > 0)
        .map(app => `- ${app.name}: 하루 ${app.hours}시간`)
        .join("\n");

      // 2. 서비스 호출
      const advice = await fetchAIAdvice({
        usage: totalKwh.toFixed(1), 
        totalBill: totalBill,
        details: details 
      });
      
      setAiAdvice(advice); 

      // [✅ 성공 기록] API 호출이 성공했을 때만 사용 기록을 업데이트 (도장 찍기)
      // 1. 마지막 사용 시간 갱신 (쿨타임 시작)
      localStorage.setItem('AI_LAST_REQ_TIME', now.toString());
      
      // 2. 일일 사용 횟수 증가 (하루 제한 카운트)
      usageData.count += 1;
      localStorage.setItem('AI_DAILY_USAGE', JSON.stringify(usageData));

    } catch (error) {
      console.error(error);
      alert("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false); 
    }
  };

  return (
    <div className="p-5 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-5">⚡ 자취생 전기요금 박사</h1>
      
      {/* 주택 유형 선택 UI */}
      <div className="bg-gray-100 p-4 rounded-lg mb-5">
        <p className="font-semibold mb-3">우리 집은 어디인가요?</p>
        <div className="flex gap-4">
          <button 
            onClick={() => setVoltageType('LOW_VOLTAGE')}
            className={`px-4 py-2 rounded ${voltageType === 'LOW_VOLTAGE' ? 'bg-blue-500 text-white' : 'bg-white border'}`}
          >
            일반 주택 (저압)
          </button>
          <button 
            onClick={() => setVoltageType('HIGH_VOLTAGE')}
            className={`px-4 py-2 rounded ${voltageType === 'HIGH_VOLTAGE' ? 'bg-blue-500 text-white' : 'bg-white border'}`}
          >
            아파트 (고압)
          </button>
        </div>
      </div>

      {/* 가전제품 시간 입력 리스트 */}
      <div className="space-y-3 mb-5">
        <p className="font-semibold">하루 사용 시간을 입력해 주세요</p>
        {APPLIANCE_LIST.map((app) => (
          <div key={app.id} className="flex items-center justify-between p-3 border rounded">
            <span>{app.name}</span>
            <div className="flex items-center gap-2">
              <input 
                type="number"
                step="0.1"
                min="0"
                max="24"
                value={hoursData[app.id] || ''}
                onChange={(e) => handleHoursChange(app.id, e.target.value)}
                className="w-24 p-2 border-2 border-gray-100 rounded-lg text-right focus:border-blue-500 outline-none font-bold"
                placeholder="0.0"
              />
              <span className="text-sm text-gray-500">시간</span>
            </div>
          </div>
        ))}
      </div>

      {/* 결과 및 AI 분석 영역 */}
      <div className="border-t pt-5 bg-blue-50 p-4 rounded-lg transition-all duration-300">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">한 달 예상 사용량</span>
          <span className="font-bold">{totalKwh.toFixed(1)} kWh</span>
        </div>
        <div className="flex justify-between mb-4">
          <span className="text-gray-600">예상 요금</span>
          <span className="text-xl font-bold text-blue-600">{formatCurrency(totalBill)}</span>
        </div>

        {/* AI 요청 버튼 */}
        <div className="mt-4 pt-4 border-t border-blue-200">
          <button
            onClick={handleAskAI}
            disabled={isLoading} 
            // [🛡️ 방어 코드 8] 중복 클릭 방지 (UI 레벨)
            // 로딩 중일 때 버튼을 비활성화하여 API 중복 호출 및 과금 방지
            className={`w-full py-3 rounded-lg font-bold text-white transition-colors
              ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 shadow-md'}`}
          >
            {isLoading ? "박사님이 분석 중입니다... ⏳" : "💰 AI 박사님께 절약 꿀팁 듣기"}
          </button>

          {/* AI 분석 결과 출력 */}
          {aiAdvice && (
            <div className="mt-4 p-4 bg-white border-2 border-green-200 rounded-xl shadow-sm animate-fade-in">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {aiAdvice}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;