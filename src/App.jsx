import { useState } from 'react';
import { APPLIANCE_LIST } from './data/constants';
import { calculateTotalUsage, calculateBill, formatCurrency } from './utils/calculate';
import { fetchAIAdvice } from './services/aiService'; 

function App() {
  const [voltageType, setVoltageType] = useState('LOW_VOLTAGE');
  
  // [🛡️ 방어 코드] 초기값 설정 (냉장고 24시간 고정 등)
  const [hoursData, setHoursData] = useState(
    APPLIANCE_LIST.reduce((acc, app) => ({ ...acc, 
      [app.id]: app.type ==='always' ? 24 : 0 }), {})
  );

  const [aiAdvice, setAiAdvice] = useState(""); 
  const [isLoading, setIsLoading] = useState(false); 
  const closePopup = () => setAiAdvice("");

  // [설정] 보안 규칙
  const DAILY_LIMIT = 10;      
  const COOLDOWN_SECONDS = 50; 

  // [UI Helper] 텍스트 성형 (별표 제거, 줄바꿈 분리)
  // 디자인 업그레이드를 위해 약간의 기능을 더 추가했어 (빈 줄 제거 기능 강화)
  const formatAIResponse = (text) => {
    if (!text) return [];
    // 1. 보기 싫은 ** 기호 제거
    const cleanText = text.replace(/\*\*/g, ''); 
    // 2. 줄바꿈(\n)을 기준으로 나누고, 의미 없는 빈 문단은 걸러내기
    return cleanText.split('\n').filter(line => line.trim() !== ''); 
  };

  // 사용 시간 입력 핸들러
  const handleHoursChange = (id, value) => { 
    const appliance = APPLIANCE_LIST.find(app => app.id === id);
    let numValue = Number(value) || 0;

    // [🛡️ 방어 코드 2, 3] 비즈니스 로직 및 범위 보호
    if (appliance?.type === 'always') numValue = 24;
    else {
      if (numValue > 24) numValue = 24;
      if (numValue < 0) numValue = 0;
    }
    setHoursData(prev => ({ ...prev, [id]: numValue }));
    if (aiAdvice) setAiAdvice(""); 
  };

  // 데이터 가공
  const selectedWithHours = APPLIANCE_LIST.map(app => {
    const power = app.power || 0; 
    const type = app.type || 'periodic'; 
    return { ...app, power, type, hours: hoursData[app.id] || 0 };
  });

  const totalKwh = calculateTotalUsage(selectedWithHours);
  const totalBill = calculateBill(totalKwh, voltageType);

  // AI 요청 핸들러
  const handleAskAI = async () => {
    // [🛡️ 방어 코드 5] 0 사용량 방지
    if (totalKwh <= 0) {
      alert("가전제품 사용 시간을 먼저 입력해주세요!");
      return;
    }

    // [🛡️ 방어 코드 9, 10] 쿨타임 및 횟수 제한 로직
    const now = Date.now(); 
    const todayDate = new Date().toISOString().split('T')[0]; 
    const lastRequestTime = localStorage.getItem('AI_LAST_REQ_TIME');
    const dailyUsageRaw = localStorage.getItem('AI_DAILY_USAGE');    

    if (lastRequestTime) {
      const timeDiff = now - Number(lastRequestTime); 
      const waitTime = COOLDOWN_SECONDS * 1000;       
      if (timeDiff < waitTime) {
        const remainingSeconds = Math.ceil((waitTime - timeDiff) / 1000);
        alert(`⏳ 박사님이 잠시 휴식 중입니다.\n${remainingSeconds}초 뒤에 다시 물어봐 주세요!`);
        return; 
      }
    }

    let usageData = { date: todayDate, count: 0 }; 
    if (dailyUsageRaw) {
      const parsedData = JSON.parse(dailyUsageRaw);
      if (parsedData.date === todayDate) usageData = parsedData;
    }

    if (usageData.count >= DAILY_LIMIT) {
      alert(`앗! 오늘의 무료 상담 횟수(${DAILY_LIMIT}회)를 모두 쓰셨네요 😭\n내일 다시 찾아와 주세요!`);
      return; 
    }

    setIsLoading(true); 
    setAiAdvice(""); 

    try {
      const details = selectedWithHours
        .filter(app => app.hours > 0)
        .map(app => `- ${app.name}: 하루 ${app.hours}시간`)
        .join("\n");

      const advice = await fetchAIAdvice({
        usage: totalKwh.toFixed(1), 
        totalBill: totalBill,
        details: details 
      });
      
      setAiAdvice(advice); 
      localStorage.setItem('AI_LAST_REQ_TIME', now.toString());
      usageData.count += 1;
      localStorage.setItem('AI_DAILY_USAGE', JSON.stringify(usageData));

    } catch (error) {
      console.error(error);
      alert("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false); 
    }
  };

  // ▼▼▼ 화면 레이아웃 대수술 (2단 컬럼 + 디자인 고도화) ▼▼▼
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 font-sans flex justify-center text-gray-800">
      {/* max-w-5xl로 너비를 넓혀서 2단 배치가 시원하게 보이도록 함 */}
      <div className="w-full max-w-6xl">
        
        {/* 헤더 섹션: 조금 더 현대적인 타이포그래피 적용 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-3 tracking-tight">
            ⚡ 자취생 전기요금 박사
          </h1>
          <p className="text-gray-500 text-lg">
            이번 달 전기세 폭탄? 미리 계산하고 스마트하게 막아보세요!
          </p>
        </div>

        {/* [핵심] PC(lg)에서는 2단 그리드, 모바일에서는 1단 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* [왼쪽 영역 7/12] 입력 폼들 */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* 카드 1: 주거 형태 */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
              <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center">
                🏠 <span className="ml-2">주거 형태</span>
              </h2>
              <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                {['LOW_VOLTAGE', 'HIGH_VOLTAGE'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setVoltageType(type)}
                    className={`flex-1 py-4 rounded-xl font-bold text-base transition-all duration-200
                      ${voltageType === type 
                        ? 'bg-white text-blue-600 shadow-md transform scale-[1.02]' 
                        : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {type === 'LOW_VOLTAGE' ? '일반 주택' : '아파트'}
                  </button>
                ))}
              </div>
            </div>

            {/* 카드 2: 가전제품 리스트 */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
              <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center">
                🔌 <span className="ml-2">가전제품 사용 시간</span>
              </h2>
              <div className="space-y-4">
                {APPLIANCE_LIST.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-200 transition-all group">
                    <span className="font-medium text-gray-700 text-lg group-hover:text-blue-600 transition-colors">
                      {app.name}
                    </span>
                    <div className="flex items-center">
                      <input 
                        type="number"
                        inputMode="decimal"  // 모바일에서 무조건 숫자 키패드가 뜸!
                        step="0.1"
                        min="0"
                        max="24"
                        value={hoursData[app.id] || ''}
                        onChange={(e) => handleHoursChange(app.id, e.target.value)}
                        onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault();
                        }}
                        // 입력창 크기를 키우고 스타일을 다듬음 (text-lg, p-2)
                        className="w-20 bg-white border border-gray-200 rounded-xl px-3 py-2 text-right font-bold text-blue-600 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                        placeholder="0"
                      />
                      <span className="text-sm text-gray-400 ml-3 font-medium">시간</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* [오른쪽 영역 5/12] 결과 확인 & AI 버튼 (Sticky 적용) */}
          <div className="lg:col-span-5 sticky top-8 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-blue-50 overflow-hidden relative">
              {/* 배경 장식 (은은한 효과) */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2"></div>

              <h2 className="text-2xl font-bold text-gray-900 mb-8 border-b border-gray-100 pb-4 relative z-10">
                📊 이번 달 예상 결과
              </h2>
              
              <div className="space-y-6 mb-8 relative z-10">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">총 사용량</span>
                  <span className="text-2xl font-bold text-gray-800">
                    {totalKwh.toFixed(1)} <span className="text-base font-normal text-gray-400">kWh</span>
                  </span>
                </div>
                {/* 결과 강조 박스 */}
                <div className="flex justify-between items-center bg-blue-50 p-5 rounded-2xl border border-blue-100">
                  <span className="text-blue-800 font-bold">예상 요금</span>
                  <span className="text-3xl font-extrabold text-blue-600 tracking-tight">
                    {formatCurrency(totalBill)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleAskAI}
                disabled={isLoading}
                className={`w-full py-4 rounded-2xl font-bold text-white text-lg shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-1 active:scale-95 flex justify-center items-center gap-2 relative z-10
                  ${isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'}`}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">🌀</span>
                    <span>분석 중...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">🤖</span>
                    <span>AI 절약 꿀팁 받기</span>
                  </>
                )}
              </button>
              
              <div className="mt-4 text-center relative z-10">
                <p className="text-xs text-gray-400">
                  * AI 분석은 하루 {DAILY_LIMIT}회까지 무료로 제공됩니다.
                </p>
              </div>
            </div>

            {/* 꿀팁 배너 */}
            <div className="bg-yellow-50 p-5 rounded-2xl border border-yellow-100 text-yellow-800 text-sm leading-relaxed shadow-sm">
              💡 <strong>Tip:</strong> 냉장고는 24시간 켜져 있는 게 정상이니 걱정 마세요! 범인은 다른 곳에 있습니다.
            </div>
          </div>
        </div>
      </div>

      {/* [NEW] 팝업 (Modal) - 가독성 끝판왕 디자인 적용 */}
      {aiAdvice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* 배경을 더 진하고 블러 처리하여 집중도 향상 */}
          <div className="absolute inset-0 bg-gray-900 bg-opacity-70 backdrop-blur-sm transition-opacity" onClick={closePopup}></div>
          
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl z-10 overflow-hidden transform transition-all animate-fade-in-up scale-100 flex flex-col max-h-[85vh]">
            
            {/* 팝업 헤더: 그라데이션 적용 */}
            <div className="bg-gradient-to-r from-green-500 to-teal-600 p-6 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-3xl bg-white bg-opacity-20 rounded-full p-1">👨‍⚕️</span>
                <div>
                  <h3 className="text-white font-bold text-xl tracking-wide">박사님의 처방전</h3>
                  <p className="text-green-50 text-xs opacity-90">전기요금 절약, 지금 바로 시작하세요!</p>
                </div>
              </div>
              <button onClick={closePopup} className="text-white bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* 팝업 본문 (스크롤 가능, 디자인 카드 UI 적용) */}
            <div className="p-6 overflow-y-auto bg-gray-50 custom-scrollbar grow">
              <div className="space-y-4">
                {formatAIResponse(aiAdvice).map((line, index) => {
                  // 간단한 하이라이트 로직: 이모지가 포함된 줄은 조금 더 강조
                  const isHighlight = line.includes('📊') || line.includes('🕵️') || line.includes('💡');
                  return (
                    <div 
                      key={index} 
                      className={`
                        p-5 rounded-2xl leading-loose text-[1.05rem] shadow-sm border transition-colors
                        ${isHighlight 
                          ? 'bg-white border-green-100 text-gray-800' 
                          : 'bg-white border-gray-100 text-gray-600'}
                      `}
                    >
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 팝업 하단 버튼 */}
            <div className="p-5 bg-white border-t border-gray-100 text-center shrink-0">
              <button 
                onClick={closePopup} 
                className="w-full bg-gray-800 text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-900 transition-colors shadow-lg active:scale-[0.98]"
              >
                확인했습니다! 💪
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;