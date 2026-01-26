// src/data/constants.js

// 1. 자취생 맞춤형 가전 도감 (퍼플렉시티 AI 데이터 반영)
export const APPLIANCE_LIST = [
  { id: 'microwave', name: '전자레인지', power: 1000, type: 'periodic' },
  { id: 'airfryer', name: '에어프라이어', power: 1100, type: 'periodic' },
  { id: 'kettle', name: '전기포트', power: 1500, type: 'periodic' },
  { id: 'washer', name: '미니 세탁기', power: 220, type: 'periodic' },
  { id: 'cooker', name: '미니 밥솥', power: 500, type: 'hybrid' },
  { id: 'vacuum', name: '소형 청소기', power: 80, type: 'periodic' },
  // 냉장고는 24시간 가동을 고려하여 평균값인 30W로 조정 
  { id: 'fridge', name: '소형 냉장고', power: 30, type: 'always' },
  { id: 'other_small', name: '기타 소형 가전 (선풍기 등)', power: 50, type: 'periodic' },
  { id: 'other_medium', name: '기타 중형 가전 (제습기 등)', power: 300, type: 'periodic' },
  { id: 'other_high', name: '기타 고전력 (히터/온열기)', power: 1500, type: 'periodic' }
];

// 2.  (2024년 기준)
export const KEPCO_RATES = {
  // 주택용 저압 (단독주택 등)
  LOW_VOLTAGE: {
    STAGE_1: { limit: 200, unitPrice: 120.0, baseFee: 910 },
    STAGE_2: { limit: 400, unitPrice: 214.6, baseFee: 1600 },
    STAGE_3: { limit: Infinity, unitPrice: 307.3, baseFee: 7300 }
  },
  // 주택용 고압 (아파트 등) - 단가가 저압보다 저렴함!
  HIGH_VOLTAGE: {
    STAGE_1: { limit: 200, unitPrice: 105.0, baseFee: 730 },
    STAGE_2: { limit: 400, unitPrice: 174.0, baseFee: 1260 },
    STAGE_3: { limit: Infinity, unitPrice: 242.3, baseFee: 6060 }
  }
};