// ────────────────────────────────────────────────────────
// MOCK DATA (회사 인사/캘린더/자원 데이터베이스)
// ────────────────────────────────────────────────────────

export const EMPLOYEES = [
  { id: 'emp_host', name: '김경남', dept: '경남은행 디지털전략부', pos: '과장', duty: '사내 AI 기획 및 회의 주관 호스트', active: true },
  { id: 'emp_marketing', name: '김마케', dept: '마케팅전략팀', pos: '팀장', duty: '브랜드 총괄, Q3 마케팅 전략 수립 및 플랫폼 광고 예산 집행', active: false },
  { id: 'emp_design', name: '이디자', dept: '브랜드디자인팀', pos: '대리', duty: 'BI/CI 디자인, 브랜드 이미지 개선 및 시각 광고 시안 제작', active: false },
  { id: 'emp_budget', name: '박예산', dept: '기획예산팀', pos: '과장', duty: '전사 사업 계획 조율, 부서별 예산 타당성 검토 및 승인', active: false },
  { id: 'emp_dev', name: '정개발', dept: '플랫폼개발팀', pos: '수석', duty: '온라인 광고 서버 구축, 서비스 플랫폼 API 개발 및 인프라 관리', active: false },
  { id: 'emp_hr', name: '최인사', dept: '인사총무팀', pos: '대리', duty: '사내 임직원 근무 평가, 부서 배치 및 신규 채용 프로세스 총괄', active: false }
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
  create_online_meeting_link({ provider = 'Teams', topic = '' }) {
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
    return { responses, attendanceRate: responses.length ? 100 : 0 };
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
