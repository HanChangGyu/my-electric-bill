import { useState } from 'react';
// 1. 우선 우리가 만든 가전제품 도감을 가져와야 해요.
import { APPLIANCE_LIST } from './data/constants';
import { calculateTotalUsage, calculateBill, formatCurrency } from './utils/calculate';

function App() {
  const [voltageType, setVoltageType] = useState('LOW_VOLTAGE');
  
  // 가전제품별 사용 시간을 저장할 메모지예요. { fridge: 0, aircon: 0 ... }
  const [hoursData, setHoursData] = useState(
    APPLIANCE_LIST.reduce((acc, app) => ({ ...acc, 
      [app.id]: app.type ==='always' ? 24 : 0 }), {}) // always면 24를, 아니면 0을 초기값으로 넣기
  );

  // [방어 코드 위치 A] 사용자가 입력창에 값을 넣을 때 1차 검문을 해요.
  const handleHoursChange = (id, value) => { 
    const appliance = APPLIANCE_LIST.find(app => app.id === id);
    let numValue = Number(value) || 0;
    // 🛡️ [방어 로직] 성격이 'always'인 친구는 무조건 24시간으로 고정!
    if (appliance?.type === 'always') {
    numValue = 24;
    } else {
    if (numValue > 24) numValue = 24;
    if (numValue < 0) numValue = 0;
    }
    setHoursData(prev => ({ ...prev, [id]: numValue }));
  };

  // [방어 코드 위치 B] 계산 엔진에 재료를 넣기 직전, 최종 검문을 해요!
  // 질문하신 'power', 'type' 방어 코드가 바로 여기에 들어갑니다.
  const selectedWithHours = APPLIANCE_LIST.map(app => {
    // 🛡️ 혹시라도 constants.js에 데이터가 빠져있을 경우를 대비한 방패예요.
    const power = app.power || 0; 
    const type = app.type || 'periodic'; 

    return {
      ...app,
      power, // 안전하게 검사된 전력량
      type,  // 안전하게 검사된 타입
      hours: hoursData[app.id] || 0 // 입력값이 없으면 0시간으로!
    };
  });

  // 이제 '가공된 안전한 데이터'로 총 사용량과 요금을 구합니다.
  const totalKwh = calculateTotalUsage(selectedWithHours);
  const totalBill = calculateBill(totalKwh, voltageType);

  return (
    <div className="p-5 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-5">⚡ 자취생 전기요금 박사</h1>
      
      {/* 주택 유형 선택 섹션 */}
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

      {/* 가전제품 입력 리스트 섹션 */}
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

      {/* 최종 결과 화면 */}
      <div className="border-t pt-5 bg-blue-50 p-4 rounded-lg">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">한 달 예상 사용량</span>
          <span className="font-bold">{totalKwh.toFixed(1)} kWh</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">예상 요금</span>
          <span className="text-xl font-bold text-blue-600">{formatCurrency(totalBill)}</span>
        </div>
      </div>
    </div>
  );
}

export default App;