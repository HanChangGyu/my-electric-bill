import { KEPCO_RATES } from '../data/constants';

// 1. 장바구니에 담긴 가전제품들의 한 달 총 사용량(kWh)을 합산하는 함수예요.
export const calculateTotalUsage = (selectedAppliances) => {
  // 방어 코드: 만약 바구니가 비어있거나 배열이 아니면 계산하지 않고 0을 돌려줘요
  if (!Array.isArray(selectedAppliances)) return 0;

  return selectedAppliances.reduce((acc, app) => {
    // 방어 코드: 사용자가 글자를 입력해도 숫자로 강제 변환해서 계산 사고를 막아요
    const power = Number(app.power) || 0;
    const hours = Number(app.hours) || 0;
    
    // 공식: (입 크기W * 먹는 시간h * 30일) / 1000 = 한 달 사료량(kWh)
    const monthlyKwh = (power * hours * 30) / 1000;
    
    // 지금까지 더한 값(acc)에 새로 계산한 값을 계속 쌓아나가요.
    return acc + monthlyKwh;
  }, 0);
};

// 2. 총 사용량과 주택 유형을 받아서 최종 전기 요금을 판결하는 함수예요.
export const calculateBill = (totalKwh, voltageType = 'LOW_VOLTAGE') => {
  // 주택 유형이 없으면 가장 일반적인 '저압' 요금표를 꺼내와요.
  const rates = KEPCO_RATES[voltageType] || KEPCO_RATES.LOW_VOLTAGE;
  let totalAmount = 0; // 전력량 요금을 담을 바구니
  let baseFee = 0;    // 기본 요금을 담을 바구니

  // 방어 코드: 전기를 아예 안 썼으면 요금도 0원이에요
  if (totalKwh <= 0) return 0;

  // 누진제 로직: 사용량에 따라 1, 2, 3단계 계단을 밟아 올라가요
  if (totalKwh <= rates.STAGE_1.limit) {
    // 1단계: 첫 번째 계단(200kWh 이하) 구간 요금만 계산해요
    totalAmount = totalKwh * rates.STAGE_1.unitPrice;
    baseFee = rates.STAGE_1.baseFee;
  } else if (totalKwh <= rates.STAGE_2.limit) {
    // 2단계: 1단계 구간은 꽉 채우고, 넘친 부분만 2단계 가격을 매겨요
    totalAmount = (rates.STAGE_1.limit * rates.STAGE_1.unitPrice) + 
                  ((totalKwh - rates.STAGE_1.limit) * rates.STAGE_2.unitPrice);
    baseFee = rates.STAGE_2.baseFee;
  } else {
    // 3단계: 1, 2단계를 꽉 채우고, 400kWh 넘게 쓴 부분은 가장 비싼 3단계 가격을 매겨요
    totalAmount = (rates.STAGE_1.limit * rates.STAGE_1.unitPrice) + 
                  (200 * rates.STAGE_2.unitPrice) + 
                  ((totalKwh - rates.STAGE_2.limit) * rates.STAGE_3.unitPrice);
    baseFee = rates.STAGE_3.baseFee;
  }

  // 기본요금과 사용량 요금을 합친 뒤, 1원 미만의 잔돈은 깎아줘요(내림).
  return Math.floor(totalAmount + baseFee);
};

// 3. 숫자로 된 금액을 사람이 읽기 좋게 포장하는 함수예요.
export const formatCurrency = (amount) => {
  // 방어 코드: 숫자가 아니면 당황하지 않고 '0원'을 보여줘요
  if (isNaN(amount)) return '0원';
  return amount.toLocaleString('ko-KR') + '원';
};