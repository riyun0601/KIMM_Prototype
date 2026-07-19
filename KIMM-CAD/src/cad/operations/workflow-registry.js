/**
 * 사용자 테스트 11단계를 구현 단위로 쪼갠 명령 목록입니다.
 * 각 command id는 피처 이력(feature.type)과 툴바 action을 연결하는 안정적인 키입니다.
 */
export const workflowCommands = [
  { id: 'partDesign.activate', workbench: 'Part Design', label: 'Part Design 실행' },
  { id: 'sketch.create', workbench: 'Part Design', label: '스케치 생성 및 수평/수직 구속' },
  { id: 'sketch.drawBracketHalf', workbench: 'Part Design', label: '브라켓 단면 1/2 드로잉' },
  { id: 'feature.revolveBracket', workbench: 'Part Design', label: '회전으로 브라켓 생성' },
  { id: 'sketch.mapToFace', workbench: 'Part Design', label: '면 선택 후 스케치 진입' },
  { id: 'sketch.circleOnFace', workbench: 'Part Design', label: '면 위 원 및 정렬' },
  { id: 'feature.arrayFour', workbench: 'Part Design', label: '4개 배열' },
  { id: 'part.activate', workbench: 'Part', label: 'Part 실행' },
  { id: 'primitive.cylinder', workbench: 'Part', label: '원기둥 추가' },
  { id: 'boolean.cut', workbench: 'Part', label: 'A 객체에서 B 객체 빼기' },
  { id: 'feature.repeatToFinish', workbench: 'Part', label: '반복하여 최종 브라켓 완성' },
];

export const commandById = new Map(workflowCommands.map((command) => [command.id, command]));
