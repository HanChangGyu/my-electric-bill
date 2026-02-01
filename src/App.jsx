import { useState, useEffect } from 'react';
import { APPLIANCE_LIST } from './data/constants';
import { calculateTotalUsage, calculateBill, formatCurrency } from './utils/calculate';
import { fetchAIAdvice } from './services/aiService';

function App() {
  const [voltageType, setVoltageType] = useState('LOW_VOLTAGE');

  // [🛡️ 방어 코드] 초기값 설정 (냉장고 24시간 고정 등)
  const [hoursData, setHoursData] = useState(() => {
    // localStorage에서 불러오거나 초기값 사용
    const saved = localStorage.getItem('APPLIANCE_HOURS');
    if (saved) return JSON.parse(saved);
    return APPLIANCE_LIST.reduce((acc, app) => ({
      ...acc,
      [app.id]: app.type === 'always' ? 24 : 0
    }), {});
  });

  const [aiAdvice, setAiAdvice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // 팝업 닫기
  const closePopup = () => setAiAdvice("");

  // [설정] 보안 및 제한 규칙
  const DAILY_LIMIT = 10;
  const COOLDOWN_SECONDS = 50;

  // 상태 변경 시 localStorage 저장 (데이터 지속성)
  useEffect(() => {
    localStorage.setItem('APPLIANCE_HOURS', JSON.stringify(hoursData));
  }, [hoursData]);

  // [UI Helper] AI 응답 텍스트 포매팅
  const formatAIResponse = (text) => {
    if (!text) return [];
    const cleanText = text.replace(/\*\*/g, '');
    return cleanText.split('\n').filter(line => line.trim() !== '');
  };

  // 사용 시간 입력 핸들러
  const handleHoursChange = (id, value) => {
    const appliance = APPLIANCE_LIST.find(app => app.id === id);
    let numValue = Number(value);

    // [🛡️ 방어 코드] NaN, 음수, 24시간 초과 방지
    if (isNaN(numValue)) numValue = 0;
    
    if (appliance?.type === 'always') {
      numValue = 24;
    } else {
      if (numValue > 24) numValue = 24;
      if (numValue < 0) numValue = 0;
    }

    setHoursData(prev => ({ ...prev, [id]: numValue }));
    if (aiAdvice) setAiAdvice(""); // 값이 바뀌면 기존 조언 초기화
  };

  // 데이터 가공 (계산용)
  const selectedWithHours = APPLIANCE_LIST.map(app => {
    const power = app.power || 0;
    const type = app.type || 'periodic';
    return { ...app, power, type, hours: hoursData[app.id] || 0 };
  });

  const totalKwh = calculateTotalUsage(selectedWithHours);
  const totalBill = calculateBill(totalKwh, voltageType);

  // AI 요청 핸들러
  const handleAskAI = async () => {
    if (totalKwh <= 0) {
      alert("가전제품 사용 시간을 먼저 입력해주세요!");
      return;
    }

    // [🛡️ 비용 방어] 쿨타임 및 횟수 제한 로직
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
      
      // 사용 기록 갱신
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

  return (
    // [수정] 모바일 상단 여백 축소 (py-6)
    <div className="min-h-screen bg-gray-50 py-6 lg:py-12 px-4 font-sans flex justify-center text-gray-800 pb-48">
      <div className="w-full max-w-6xl">

        {/* 헤더 섹션 */}
        <div className="text-center mb-12">
          <h1 className="text-3xl lg:text-5xl font-extrabold text-gray-900 mb-3 tracking-tight break-keep">
            ⚡ 자취생 전기요금 박사
          </h1>
          <p className="text-gray-500 text-lg">
            이번 달 전기세 폭탄? <br className="block lg:hidden" /> 미리 계산하고 스마트하게 막아보세요!
          </p>
        </div>

        {/* 메인 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* 왼쪽: 입력 폼 (7/12) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* 카드 1: 주거 형태 */}
            <div className="bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
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
            <div className="bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
              <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center">
                🔌 <span className="ml-2">가전제품 사용 시간</span>
              </h2>
              <div className="space-y-4">
                {APPLIANCE_LIST.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-200 transition-all group">
                    {/* [수정] 모바일 가독성: text-base(16px) 적용 */}
                    <span className="font-bold text-gray-700 text-base lg:text-lg group-hover:text-blue-600 transition-colors break-keep leading-tight">
                      {app.name}
                    </span>
                    <div className="flex items-center">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min="0"
                        max="24"
                        value={hoursData[app.id] || ''}
                        onChange={(e) => handleHoursChange(app.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.preventDefault();
                        }}
                        // [수정] 모바일 터치 영역 확대: w-24, py-3
                        className="w-24 bg-white border border-gray-200 rounded-xl px-3 py-3 text-right font-bold text-blue-600 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                        placeholder="0"
                      />
                      {/* [수정] 단위 텍스트 크기 확대 */}
                      <span className="text-base text-gray-400 ml-3 font-medium">시간</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 오른쪽: 결과 확인 (5/12) */}
          <div className="lg:col-span-5 sticky top-8 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-blue-50 overflow-hidden relative">
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

                {/* [수익화] 누진세 게이지 바 - 사용량에 따라 색상이 변하는 시각적 공포 조성 요소 */}
                <div className="space-y-2">
                  {/* 누진세 단계 표시: 0~200(초록), 201~400(주황), 400+(빨강) */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 font-medium">누진세 단계</span>
                    <span className={`font-bold ${
                      totalKwh <= 200 ? 'text-green-600' : 
                      totalKwh <= 400 ? 'text-orange-600' : 
                      'text-red-600'
                    }`}>
                      {totalKwh <= 200 ? '1단계 (안전)' : 
                       totalKwh <= 400 ? '2단계 (주의)' : 
                       '3단계 (위험)'}
                    </span>
                  </div>
                  {/* 게이지 바 배경 (회색) */}
                  <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner">
                    {/* 게이지 바 진행률: 사용량에 따라 색상과 너비가 동적으로 변경됨 */}
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        totalKwh <= 200 ? 'bg-gradient-to-r from-green-400 to-green-600' : 
                        totalKwh <= 400 ? 'bg-gradient-to-r from-orange-400 to-orange-600' : 
                        'bg-gradient-to-r from-red-400 to-red-600'
                      }`}
                      style={{
                        width: `${Math.min((totalKwh / 600) * 100, 100)}%` // 최대 600kWh 기준으로 진행률 계산
                      }}
                    >
                      {/* 펄스 애니메이션 효과로 시각적 임팩트 강화 */}
                      <div className="h-full w-full bg-white bg-opacity-20 animate-pulse"></div>
                    </div>
                  </div>
                  {/* 게이지 바 하단 기준점 표시 (0, 200, 400, 600+) */}
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0 kWh</span>
                    <span className={totalKwh <= 200 ? 'text-green-600 font-bold' : ''}>200 kWh</span>
                    <span className={totalKwh > 200 && totalKwh <= 400 ? 'text-orange-600 font-bold' : ''}>400 kWh</span>
                    <span className={totalKwh > 400 ? 'text-red-600 font-bold' : ''}>600+ kWh</span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-blue-50 p-5 rounded-2xl border border-blue-100">
                  <span className="text-blue-800 font-bold">예상 요금</span>
                  <span className="text-3xl font-extrabold text-blue-600 tracking-tight">
                    {formatCurrency(totalBill)}
                  </span>
                </div>

                {/* [수익화] 독설 멘트 - 사용량에 따라 위험도를 강조하는 메시지 표시 */}
                <div className={`p-4 rounded-xl border-2 ${
                  totalKwh <= 200 
                    ? 'bg-green-50 border-green-200' 
                    : totalKwh <= 400 
                    ? 'bg-orange-50 border-orange-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  {/* 사용량 구간별로 다른 경고 메시지 표시 */}
                  <p className={`font-bold text-center text-lg ${
                    totalKwh <= 200 
                      ? 'text-green-700' 
                      : totalKwh <= 400 
                      ? 'text-orange-700' 
                      : 'text-red-700'
                  }`}>
                    {totalKwh <= 200 
                      ? '✅ 아직은 안전합니다. 이대로 유지하세요!' 
                      : totalKwh <= 400 
                      ? '⚠️ 위험! 누진세 폭탄 진입 직전입니다!' 
                      : '🚨 긴급! 누진세 폭탄이 터졌습니다! 즉시 조치가 필요합니다!'}
                  </p>
                </div>
                
                <div className="mt-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                    <li>계산 결과는 <span className="text-blue-600 font-bold">예상 추정치</span>입니다.</li>
                    <li>실제 사용하시는 제품의 효율 등급에 따라 오차가 발생할 수 있습니다.</li>
                  </ul>
                </div>
              </div>

              {/* [수익화] CTA 버튼 - 전기세 절약 가전제품 추천 링크 (쿠팡) - Primary 스타일로 가장 위에 배치 */}
              <a
                href="https://www.coupang.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-5 rounded-2xl font-bold text-white text-lg shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 flex justify-center items-center gap-2 relative z-10 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border-2 border-blue-500"
                style={{
                  boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)' // 파란색 그림자로 눈에 띄게 강조
                }}
              >
                <span className="text-xl">💰</span>
                <span>전기세 30% 아끼는 1등급 가전 추천</span>
                <span className="text-sm opacity-90">→</span>
              </a>

              {/* AI 버튼 - Secondary 스타일로 덜 눈에 띄게 배치 */}
              <button
                onClick={handleAskAI}
                disabled={isLoading}
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all transform hover:-translate-y-0.5 active:scale-95 flex justify-center items-center gap-2 relative z-10 mt-4
                  ${isLoading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                    : 'bg-transparent text-gray-600 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`}
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
            
            <div className="bg-yellow-50 p-5 rounded-2xl border border-yellow-100 text-yellow-800 text-sm leading-relaxed shadow-sm">
              💡 <strong>Tip:</strong> 냉장고는 24시간 켜져 있는 게 정상이니 걱정 마세요! 범인은 다른 곳에 있습니다.
            </div>
          </div>
        </div>
      </div>

      {/* [수정] 모바일 하단 고정 바 (둥근 모서리 + 엄지 영역 최적화) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-6 pb-8 shadow-[0_-10px_30px_rgba(0,0,0,0.15)] z-40 lg:hidden safe-area-pb rounded-t-3xl">
        <div className="flex justify-between items-center max-w-5xl mx-auto gap-4">
          <div className="flex flex-col">
            <span className="text-sm text-gray-400 font-medium mb-1">예상 요금</span>
            <span className="text-2xl font-extrabold text-gray-800 leading-none">
              {formatCurrency(totalBill)}
            </span>
          </div>

          <button
            onClick={handleAskAI}
            disabled={isLoading}
            className={`flex-1 py-4 px-6 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2
              ${isLoading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}
          >
            {isLoading ? (
              <span className="animate-spin text-xl">🌀</span>
            ) : (
              <>
                <span className="text-xl">🤖</span>
                <span className="text-lg">AI 분석</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI 결과 팝업 */}
      {aiAdvice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-gray-900 bg-opacity-70 backdrop-blur-sm transition-opacity" onClick={closePopup}></div>
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl z-10 overflow-hidden transform transition-all animate-fade-in-up scale-100 flex flex-col max-h-[85vh]">
            
            {/* 팝업 헤더 */}
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
            
            {/* 팝업 내용 */}
            <div className="p-6 overflow-y-auto bg-gray-50 custom-scrollbar grow">
              <div className="space-y-4">
                {formatAIResponse(aiAdvice).map((line, index) => {
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

            {/* 팝업 닫기 버튼 */}
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