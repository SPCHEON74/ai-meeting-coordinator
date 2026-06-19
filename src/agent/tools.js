// ────────────────────────────────────────────────────────
// MOCK DATA (회사 인사/캘린더/자원 데이터베이스)
// ────────────────────────────────────────────────────────

export const HOST_ID = 'emp_host';
export const DEFAULT_ROOM_ID = 'room_creative';

export const EMPLOYEES = [
  // 디지털전략부
  { id: 'emp_host',       name: '김경남', dept: '디지털전략부',   pos: '과장', duty: 'AI 기획, 디지털 혁신 전략 수립, 사내 AI 도입 로드맵 관리', tags: ['AI', '디지털', '혁신', '전략', '기획'] },
  { id: 'emp_digital2',   name: '오디지', dept: '디지털전략부',   pos: '대리', duty: '디지털 채널 UX 기획, 모바일 앱 개선 및 고객 경험 분석', tags: ['디지털', 'UX', '모바일', '앱', '고객'] },

  // 마케팅·브랜드
  { id: 'emp_marketing',  name: '김마케', dept: '마케팅전략팀',   pos: '팀장', duty: '브랜드 총괄, Q3 마케팅 전략 수립, 플랫폼 광고 예산 집행', tags: ['마케팅', '브랜드', '광고', '전략', '예산', '캠페인'] },
  { id: 'emp_design',     name: '이디자', dept: '브랜드디자인팀', pos: '대리', duty: 'BI/CI 디자인, 브랜드 이미지 개선, 시각 광고 시안 제작', tags: ['디자인', '브랜드', 'CI', 'BI', '광고', '시안'] },
  { id: 'emp_contents',   name: '한콘텐', dept: '마케팅전략팀',   pos: '주임', duty: 'SNS 콘텐츠 기획·제작, 퍼포먼스 마케팅 운영 및 KPI 분석', tags: ['콘텐츠', 'SNS', '마케팅', 'KPI', '광고'] },

  // 기획·예산
  { id: 'emp_budget',     name: '박예산', dept: '기획예산팀',     pos: '과장', duty: '전사 사업 계획 조율, 부서별 예산 타당성 검토 및 승인', tags: ['예산', '기획', '비용', '사업계획', '승인'] },
  { id: 'emp_planning',   name: '문기획', dept: '경영기획팀',     pos: '차장', duty: '경영 목표 설정, 중장기 전략 수립, 경영진 보고 자료 작성', tags: ['경영', '기획', '전략', '보고', '목표'] },

  // IT·플랫폼 개발
  { id: 'emp_dev',        name: '정개발', dept: '플랫폼개발팀',   pos: '수석', duty: '온라인 광고 서버 구축, 서비스 플랫폼 API 개발 및 인프라 관리', tags: ['개발', 'API', '서버', '인프라', '플랫폼'] },
  { id: 'emp_dev2',       name: '강백엔', dept: '플랫폼개발팀',   pos: '선임', duty: '뱅킹 코어 시스템 연동, MSA 아키텍처 설계 및 배포 자동화', tags: ['개발', '시스템', 'MSA', '배포', '뱅킹'] },
  { id: 'emp_data',       name: '윤데이', dept: '데이터분석팀',   pos: '과장', duty: '고객 행동 데이터 분석, 머신러닝 모델 개발, 데이터 파이프라인 구축', tags: ['데이터', '분석', 'AI', '머신러닝', '모델', '파이프라인'] },

  // 정보보안
  { id: 'emp_security',   name: '서보안', dept: '정보보안팀',     pos: '팀장', duty: '사이버 보안 정책 수립, 취약점 점검, 개인정보보호 컴플라이언스', tags: ['보안', '정보보호', '컴플라이언스', '개인정보', '취약점'] },
  { id: 'emp_security2',  name: '임침해', dept: '정보보안팀',     pos: '대리', duty: '침해사고 대응, 보안 모니터링, 내부 보안 교육 운영', tags: ['보안', '침해', '모니터링', '교육'] },

  // 리스크·컴플라이언스
  { id: 'emp_risk',       name: '조리스', dept: '리스크관리팀',   pos: '차장', duty: '여신 리스크 평가, 자본 적정성 관리, 스트레스 테스트 운영', tags: ['리스크', '여신', '자본', '규제', '평가'] },
  { id: 'emp_compliance', name: '권컴플', dept: '컴플라이언스팀', pos: '과장', duty: '금융감독 규정 준수, 내부통제 심사, 법규 해석 지원', tags: ['컴플라이언스', '규제', '법규', '내부통제', '감독'] },

  // 영업·고객
  { id: 'emp_sales',      name: '노영업', dept: '영업전략팀',     pos: '팀장', duty: 'WM 영업 전략 수립, 채널별 영업 KPI 관리, 고객 자산관리 솔루션 기획', tags: ['영업', 'WM', '고객', '자산관리', '전략', 'KPI'] },
  { id: 'emp_cx',         name: '류고객', dept: '고객서비스팀',   pos: '과장', duty: '고객 VOC 분석, CS 프로세스 개선, 고객만족도 조사 운영', tags: ['고객', 'VOC', 'CS', '만족도', '서비스'] },

  // 인사·총무
  { id: 'emp_hr',         name: '최인사', dept: '인사총무팀',     pos: '대리', duty: '사내 임직원 근무 평가, 부서 배치, 신규 채용 프로세스 총괄', tags: ['인사', '채용', '평가', '교육', '조직'] },
  { id: 'emp_edu',        name: '송교육', dept: '인사총무팀',     pos: '주임', duty: '사내 교육 프로그램 기획, 외부 연수 운영, 역량 개발 관리', tags: ['교육', '연수', '역량', '인재', '학습'] },

  // 재무·회계
  { id: 'emp_finance',    name: '변재무', dept: '재무회계팀',     pos: '차장', duty: '재무제표 작성, 원가 분석, 손익 모니터링, 세무 신고 관리', tags: ['재무', '회계', '손익', '세무', '원가'] },

  // 법무
  { id: 'emp_legal',      name: '엄법무', dept: '법무팀',         pos: '과장', duty: '계약서 검토, 소송 대응, 금융 규제 법률 자문 및 내부 법무 지원', tags: ['법무', '계약', '규제', '법률', '소송'] },
];

export const BASE_SCHEDULES = {
  emp_host: [
    { start: '09:00', end: '10:00', name: '부서 모닝 스크럼' },
    { start: '12:00', end: '13:00', name: '점심 식사' }
  ],
  emp_marketing: [
    { start: '09:30', end: '11:00', name: '글로벌 브랜드 대행사 미팅' },
    { start: '12:00', end: '13:00', name: '점심 식사' },
    { start: '14:30', end: '15:30', name: 'Q3 마케팅 시안 1차 리뷰' }
  ],
  emp_design: [
    { start: '10:00', end: '11:30', name: 'CI 디자인 컨셉 브레인스토밍' },
    { start: '12:00', end: '13:00', name: '점심 식사' },
    { start: '14:00', end: '15:00', name: '브랜드 리뉴얼 외주 미팅' }
  ],
  emp_budget: [
    { start: '11:00', end: '12:00', name: '기재부 예산 집행 가이드 회의' },
    { start: '12:00', end: '13:00', name: '점심 식사' },
    { start: '15:00', end: '16:00', name: '상반기 결산 감사 대비 회의' }
  ],
  emp_dev: [
    { start: '09:00', end: '11:30', name: '서버 정기 점검 및 배포' },
    { start: '12:00', end: '13:00', name: '점심 식사' }
  ],
  emp_hr: [
    { start: '12:00', end: '13:00', name: '점심 식사' },
    { start: '16:00', end: '17:00', name: '승진 대상자 다면 평가 회의' }
  ]
};

export const MEETING_ROOMS = [
  { id: 'room_brain', name: '집단지성실 (본관 3층)', cap: 8, desc: '대형 화이트보드, 빔프로젝터 완비' },
  { id: 'room_creative', name: '크리에이티브룸 (신관 2층)', cap: 6, desc: '이동식 모니터, 화상 카메라 완비' },
  { id: 'room_strategy', name: '미래전략실 (본관 5층)', cap: 4, desc: '소규모 모니터, 프리미엄 원탁 완비' }
];

// ────────────────────────────────────────────────────────
// 시간 계산 헬퍼
// ────────────────────────────────────────────────────────

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toHHMM(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

function mergeIntervals(intervals) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [s, e] of sorted) {
    if (merged.length && s <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
    } else {
      merged.push([s, e]);
    }
  }
  return merged;
}

// ────────────────────────────────────────────────────────
// 도구 레지스트리 (Tool Registry)
// 각 도구는 (args) => result 형태의 순수 함수로, AppState의 현재 값을 인자로 받아
// 사내 가상 데이터베이스(EMPLOYEES, BASE_SCHEDULES, MEETING_ROOMS)를 조회/연산한다.
// ────────────────────────────────────────────────────────

export const agentTools = {
  // 안건 텍스트를 분석하여 관련 키워드/부서를 추출
  analyze_agenda({ title = '', agenda = '' }) {
    const text = `${title} ${agenda}`;
    const keywordMap = {
      '마케팅': ['마케팅', '광고', '캠페인'],
      '브랜드': ['브랜드', 'BI', 'CI', '디자인'],
      '예산': ['예산', '비용', '집행']
    };
    const keywords = Object.keys(keywordMap).filter(key =>
      keywordMap[key].some(k => text.includes(k))
    );
    const departments = EMPLOYEES.filter(emp =>
      emp.id !== 'emp_host' && keywords.some(k => emp.dept.includes(k) || emp.duty.includes(k))
    ).map(emp => emp.dept);

    return { keywords, departments: [...new Set(departments)] };
  },

  // 특정 임직원의 캘린더에서 비어있는 시간대를 탐색
  check_user_calendar({ userId, dayStart = '09:00', dayEnd = '18:00' }) {
    const busy = (BASE_SCHEDULES[userId] || []).map(ev => [toMinutes(ev.start), toMinutes(ev.end)]);
    const merged = mergeIntervals(busy);
    const start = toMinutes(dayStart);
    const end = toMinutes(dayEnd);

    const freeSlots = [];
    let cursor = start;
    for (const [s, e] of merged) {
      if (s - cursor >= 30) freeSlots.push([toHHMM(cursor), toHHMM(s)]);
      cursor = Math.max(cursor, e);
    }
    if (end - cursor >= 30) freeSlots.push([toHHMM(cursor), toHHMM(end)]);

    return { userId, freeSlots };
  },

  // 안건 키워드와 매칭되는 임직원을 인사 DB에서 검색
  search_employees_by_duty({ keywords = [] }) {
    const matched = EMPLOYEES.filter(emp =>
      emp.id !== 'emp_host' && keywords.some(k => emp.dept.includes(k) || emp.duty.includes(k))
    );
    return {
      matched: matched.map(emp => ({ id: emp.id, name: emp.name, pos: emp.pos, dept: emp.dept }))
    };
  },

  // 지정한 참석자 그룹의 캘린더를 스캔하여 특정 시간대의 충돌 여부를 검사
  batch_check_schedule_collision({ users = [], time = '' }) {
    const [startStr, endStr] = time.split('-');
    const start = toMinutes(startStr);
    const end = toMinutes(endStr);

    const collisions = [];
    users.forEach(userId => {
      const emp = EMPLOYEES.find(e => e.id === userId);
      (BASE_SCHEDULES[userId] || []).forEach(ev => {
        if (overlaps(toMinutes(ev.start), toMinutes(ev.end), start, end)) {
          collisions.push({ userId, name: emp?.name, event: ev });
        }
      });
    });

    return { hasCollision: collisions.length > 0, collisions };
  },

  // 충돌을 감수하고 강행 등록
  override_schedule_collision({ reason = 'Force registration' }) {
    return { status: 'forced', reason };
  },

  // 다수 참석자 전원이 비어있는 공통 시간대를 탐색
  find_common_free_slot({ users = [], durationMin = 90, dayStart = '09:00', dayEnd = '18:00' }) {
    const allBusy = [];
    users.forEach(userId => {
      (BASE_SCHEDULES[userId] || []).forEach(ev => allBusy.push([toMinutes(ev.start), toMinutes(ev.end)]));
    });
    const merged = mergeIntervals(allBusy);
    const start = toMinutes(dayStart);
    const end = toMinutes(dayEnd);

    let cursor = start;
    for (const [s, e] of merged) {
      if (s - cursor >= durationMin) {
        return { start: toHHMM(cursor), end: toHHMM(cursor + durationMin) };
      }
      cursor = Math.max(cursor, e);
    }
    if (end - cursor >= durationMin) {
      return { start: toHHMM(cursor), end: toHHMM(cursor + durationMin) };
    }
    return null;
  },

  // 수용 인원 조건에 맞는 회의실 검색
  query_available_meeting_rooms({ capacity = 1 }) {
    return { rooms: MEETING_ROOMS.filter(room => room.cap >= capacity) };
  },

  // 회의실 자원 예약 (자원 예약 에이전트)
  reserve_room_resource({ roomId, time = '' }) {
    const room = MEETING_ROOMS.find(r => r.id === roomId);
    const reservationId = `RES-20260529-${Math.floor(10 + Math.random() * 89)}`;
    return { reservationId, room, time };
  },

  // 비대면 화상회의 링크 생성 (자원 예약 에이전트)
  create_online_meeting_link({ provider = 'Teams', topic: _topic = '' }) {
    return {
      provider,
      link: 'https://teams.microsoft.com/l/meetup-join/ai-coordinator-9988-1234'
    };
  },

  // 확정된 일정을 캘린더/이메일로 전파
  send_calendar_and_email({ recipients = [], subject = '' }) {
    return { status: 'sent', recipients, subject };
  },

  // 참석자 전원에게 RSVP 설문 발송 (RSVP 관리 에이전트)
  broadcast_telegram_rsvp({ users = [] }) {
    const responses = users.map(userId => {
      const emp = EMPLOYEES.find(e => e.id === userId);
      return { userId, name: emp?.name, pos: emp?.pos, answer: 'yes' };
    });
    const yesCount = responses.filter(r => r.answer === 'yes').length;
    return { responses, attendanceRate: responses.length ? Math.round(yesCount / responses.length * 100) : 0 };
  },

  // 회의 취소 및 데이터 정리
  cancel_meeting_and_purge({ reason = '' }) {
    return { status: 'cancelled', reason };
  },

  // 취소 사실을 메신저/이메일로 비상 전파 (RSVP 관리 에이전트)
  send_cancel_telegram_and_email({ recipients = [] }) {
    return { status: 'sent', recipients };
  },

  // 실시간 음성 속기 엔진 초기화 (회의록 작성 에이전트)
  initialize_transcription_engine({ mode = 'Live', lang = 'ko-KR' }) {
    return { status: 'ready', mode, lang };
  },

  // 오디오 스트리밍 시작 (회의록 작성 에이전트)
  start_audio_streaming({ room = '' }) {
    return { status: 'streaming', room };
  },

  // 녹취록을 요약하여 회의록 초안 생성 (회의록 작성 에이전트)
  summarize_transcript_to_minutes({ transcriptLength = 0 }) {
    return {
      summaryCount: 2,
      decisionCount: 3,
      actionItemCount: 2,
      transcriptLength
    };
  },

  // 회의록 초안에 대한 피드백 검토 요청 발송 (회의록 작성 에이전트)
  send_minutes_draft_for_review({ recipients = [] }) {
    return { status: 'sent', recipients };
  },

  // 호스트/참가자 피드백을 회의록에 반영 (회의록 작성 에이전트)
  merge_minutes_feedback({ feedback = '' }) {
    return { status: 'merged', hasFeedback: !!feedback };
  },

  // 최종 회의록을 아카이빙 및 배포 (회의록 작성 에이전트)
  distribute_final_archived_minutes({ recipients = [] }) {
    return { status: 'archived', recipients };
  }
};

export async function callAgentTool(toolName, args = {}) {
  const tool = agentTools[toolName];
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  // 비동기 API 호출을 흉내내기 위한 짧은 지연
  await new Promise(resolve => setTimeout(resolve, 120));
  return tool(args);
}
