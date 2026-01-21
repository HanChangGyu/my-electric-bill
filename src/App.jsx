import { useState } from 'react';
import { KEPCO_RATES } from './data/constants';
import { calculateBill, formatCurrency } from './utils/calculate';

function App() {
  // 1. 주택 유형을 기억할 포스트잇을 만들어요. (기본값은 '저압/주택용')
  const [voltageType, setVoltageType] = useState('LOW_VOLTAGE');
  
  // 2. 임시로 테스트할 사용량 (나중에는 가전제품 입력값으로 바뀔 거예요)
  const [testKwh, setTestKwh] = useState(250);

  // 3. 계산 엔진을 불러와서 요금을 구해요.
  const totalBill = calculateBill(testKwh, voltageType);

  return (
    <div className="p-5 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-5">⚡ 자취생 전기요금 박사</h1>
      
      {/* 주택 유형 선택 섹션 */}
      <div className="bg-gray-100 p-4 rounded-lg mb-5">
        <p className="font-semibold mb-3">우리 집은 어디인가요?</p>
        <div className="flex gap-4">
          <button 
            onClick={() => setVoltageType('LOW_VOLTAGE')}
            className={`px-4 py-2 rounded ${voltageType === 'LOW_VOLTAGE' ? 'bg-blue-500 text-white' : 'bg-white'}`}
          >
            일반 주택 (저압)
          </button>
          <button 
            onClick={() => setVoltageType('HIGH_VOLTAGE')}
            className={`px-4 py-2 rounded ${voltageType === 'HIGH_VOLTAGE' ? 'bg-blue-500 text-white' : 'bg-white'}`}
          >
            아파트 (고압)
          </button>
        </div>
      </div>

      {/* 결과 미리보기 (테스트용) */}
      <div className="border-t pt-5">
        <p className="text-gray-600">예상 사용량: {testKwh}kWh</p>
        <p className="text-xl font-bold text-blue-600">
          예상 요금: {formatCurrency(totalBill)}
        </p>
      </div>
    </div>
  );
}

export default App;