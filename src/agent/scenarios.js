import { EMPLOYEES } from './tools.js';

// ────────────────────────────────────────────────────────
// 헬퍼: AppState 기준 참석자 목록 계산
// ────────────────────────────────────────────────────────
function requiredIds(appState) {
  return EMPLOYEES.filter(e => e.id !== 'emp_host' && appState.participants[e.id] === 'required').map(e => e.id);
}

function activeIds(appState) {
  return EMPLOYEES.filter(e => e.id !== 'emp_host' && (appState.participants[e.id] === 'required' || appState.participants[e.id] === 'optional')).map(e => e.id);
}

function namesOf(ids) {
  return ids.map(id => {
    const emp = EMPLOYEES.find(e => e.id === id);
    return emp ? `${emp.name} ${emp.pos}` : id;
  });
}

function countActive(appState) {
  // 호스트 포함 인원
  return activeIds(appState).length + 1;
}

// ────────────────────────────────────────────────────────
// 시나리오 단계 정의 (ReAct: THOUGHT -> ACTION(도구 호출) -> OBSERVATION -> OUTPUT)
// ACTION 단계의 observation은 도구의 실제 반환값을 기반으로 동적으로 생성된다.
// ────────────────────────────────────────────────────────

export const SCENARIOS = {
  step_1: [
    { type: 'THOUGHT', agent: 'coordinator', text: '회의 기획 요청 접수 완료. 안건 분석 및 참석자 추천 계획 수립 필요.' },
    {
      type: 'ACTION', agent: 'coordinator', tool: 'analyze_agenda',
      args: (s) => ({ title: s.meetingName, agenda: s.meetingAgenda }),
      observation: (r) => `키워드 [${r.keywords.join(', ')}] 감지. 관련 부서: ${r.departments.join(', ')}.`
    },
    { type: 'THOUGHT', agent: 'coordinator', text: '안건 검토 결과에 따라 관련 부서 실무 담당자 추천 및 호스트의 가용 시간 분석 필요.' },
    { type: 'OUTPUT', agent: 'coordinator', text: '회의 개설 준비 단계 진입 완료. 호스트의 일정을 조회하겠습니다.' }
  ],

  step_2: [
    { type: 'THOUGHT', agent: 'coordinator', text: '호스트 김경남 과장의 캘린더 빈 시간대 탐색 개시.' },
    {
      type: 'ACTION', agent: 'coordinator', tool: 'check_user_calendar',
      args: () => ({ userId: 'emp_host' }),
      observation: (r) => `${r.freeSlots.map(([s, e]) => `${s}~${e}`).join(', ')} 가용 시간 탐색됨.`
    },
    { type: 'THOUGHT', agent: 'coordinator', text: '가장 여유 있는 추천 일정 후보 2건을 선별하여 화면에 표시.' },
    { type: 'OUTPUT', agent: 'coordinator', text: '호스트 추천 캘린더 분석 및 렌더링 완료.' }
  ],

  step_3: [
    { type: 'THOUGHT', agent: 'coordinator', text: (s) => `가설정 일정: ${s.selectedDate} ${s.selectedTimeStart} ~ ${s.selectedTimeEnd}. 안건 연관 참석자 매칭.` },
    {
      type: 'ACTION', agent: 'coordinator', tool: 'search_employees_by_duty',
      args: () => ({ keywords: ['마케팅', '브랜드', '예산'] }),
      observation: (r) => `${r.matched.map(m => `${m.name}(${m.dept})`).join(', ')} 매칭.`
    },
    { type: 'THOUGHT', agent: 'coordinator', text: '매칭된 인원을 필수 참석자로 추천하고, 임직원 검색 창에 렌더링.' },
    { type: 'OUTPUT', agent: 'coordinator', text: '참석자 자동 추천 매칭 완료. 호스트의 역할을 확정해 주십시오.' }
  ],

  step_4: [
    { type: 'THOUGHT', agent: 'coordinator', text: '지정된 필수 참가자의 캘린더 일정 충돌 여부 정밀 분석.' },
    {
      type: 'ACTION', agent: 'coordinator', tool: 'batch_check_schedule_collision',
      args: (s) => ({ users: requiredIds(s), time: `${s.selectedTimeStart}-${s.selectedTimeEnd}` }),
      onResult: (r, s) => { s._collisionResult = r; },
      observation: (r) => r.hasCollision
        ? `충돌 발견! ${r.collisions.map(c => `${c.name}(${c.event.start}~${c.event.end}, ${c.event.name})`).join(', ')}과 일정 중복.`
        : '충돌 없음. 모든 필수 참석자의 일정이 비어있습니다.'
    },
    {
      type: 'THOUGHT', agent: 'coordinator',
      text: (s) => s._collisionResult?.hasCollision
        ? '일정 중복이 감지되었으므로, 충돌 경고 UI를 표출하고 호스트의 강행 또는 스마트 재추천 결정을 대기함.'
        : '충돌이 없으므로 현재 시간대로 바로 자원 예약 단계로 진행 가능함.'
    },
    { type: 'OUTPUT', agent: 'coordinator', text: '일정 충돌 분석 결과 표출 완료.' }
  ],

  action_force_meeting: [
    { type: 'THOUGHT', agent: 'coordinator', text: '호스트가 일정 충돌에도 불구하고 회의 강행을 선택함. 자원 예약을 속행함.' },
    {
      type: 'ACTION', agent: 'coordinator', tool: 'override_schedule_collision',
      args: () => ({ reason: 'Force registration' }),
      observation: (r, s) => `강제 등록 승인됨(${r.reason}). 일정: ${s.selectedDate} ${s.selectedTimeStart}~${s.selectedTimeEnd}.`
    },
    { type: 'OUTPUT', agent: 'coordinator', text: '충돌 상태로 회의가 가설정되었습니다. 회의 공간(자원)을 조회합니다.' }
  ],

  action_smart_adjust: [
    { type: 'THOUGHT', agent: 'coordinator', text: '일정 충돌 조율을 위해 필수 참가자 전원(호스트 포함)의 가용 일정을 교차 분석.' },
    {
      type: 'ACTION', agent: 'coordinator', tool: 'find_common_free_slot',
      args: (s) => ({ users: ['emp_host', ...requiredIds(s)], durationMin: 90 }),
      onResult: (r, s) => { if (r) { s.selectedTimeStart = r.start; s.selectedTimeEnd = r.end; } },
      observation: (r) => r ? `${r.start} ~ ${r.end} 시간대 전원 가용 가능함 확인.` : '공통 가용 시간을 찾지 못했습니다.'
    },
    { type: 'THOUGHT', agent: 'coordinator', text: '충돌이 없는 최적의 시간으로 시간 슬롯 자동 보정 진행.' },
    { type: 'OUTPUT', agent: 'coordinator', text: (s) => `일정 스마트 재조율 완료 (${s.selectedTimeStart}~${s.selectedTimeEnd}). 자원 예약 에이전트를 가동합니다.` }
  ],

  action_book_offline: [
    { type: 'THOUGHT', agent: 'coordinator', text: (s) => `대면 회의실 예약 요청 수신. 참가 인원 ${countActive(s)}명을 수용하는 유효 회의실 스캔을 자원 예약 에이전트에게 위임합니다.` },
    {
      type: 'ACTION', agent: 'resource', tool: 'query_available_meeting_rooms',
      args: (s) => ({ capacity: countActive(s) }),
      observation: (r) => `${r.rooms.map(room => `${room.name}(${room.cap}인, 예약가능)`).join(', ')}.`
    },
    { type: 'THOUGHT', agent: 'coordinator', text: '추천 자원인 "크리에이티브룸"을 자원 예약 에이전트를 통해 예약 실행.' },
    {
      type: 'ACTION', agent: 'resource', tool: 'reserve_room_resource',
      args: (s) => ({ roomId: 'room_creative', time: `${s.selectedTimeStart}-${s.selectedTimeEnd}` }),
      onResult: (r, s) => { s.selectedRoom = r.room.id; s._reservationId = r.reservationId; },
      observation: (r) => `예약 확인서 생성 완료. 예약번호 ${r.reservationId} (${r.room.name}).`
    },
    { type: 'OUTPUT', agent: 'coordinator', text: '대면 회의실 자원 예약 성공. 참가자 전원에게 캘린더 메일을 발송합니다.' }
  ],

  action_toggle_online: [
    { type: 'THOUGHT', agent: 'coordinator', text: '비대면 온라인 화상회의 변경 요청을 자원 예약 에이전트에게 위임. Teams 미팅 인스턴스 생성 요청.' },
    {
      type: 'ACTION', agent: 'resource', tool: 'create_online_meeting_link',
      args: (s) => ({ provider: 'Teams', topic: s.meetingName }),
      onResult: (r, s) => { s.onlineLink = r.link; },
      observation: (r) => `${r.provider} 회의 링크 생성 성공: ${r.link}`
    },
    { type: 'OUTPUT', agent: 'coordinator', text: '온라인 화상 미팅 링크 연동 완료. 참가자 전원에게 캘린더 메일을 발송합니다.' }
  ],

  step_6: [
    { type: 'THOUGHT', agent: 'coordinator', text: '최종 결정 정보 전송 스케줄링.' },
    {
      type: 'ACTION', agent: 'coordinator', tool: 'send_calendar_and_email',
      args: (s) => ({ recipients: namesOf(activeIds(s)), subject: `[확정안내] ${s.meetingName}` }),
      observation: (r) => `발송 상태: 성공. 수신인: ${r.recipients.join(', ')}. 캘린더 등록 완료.`
    },
    { type: 'OUTPUT', agent: 'coordinator', text: '회의 안내 이메일 발송 및 캘린더 연동 완결.' }
  ],

  step_7: [
    { type: 'THOUGHT', agent: 'coordinator', text: '회의 D-24시간 도달. RSVP(참석여부) 피드백 수집을 RSVP 관리 에이전트에게 위임합니다.' },
    {
      type: 'ACTION', agent: 'rsvp', tool: 'broadcast_telegram_rsvp',
      args: (s) => ({ users: requiredIds(s) }),
      onResult: (r, s) => { s._rsvp = r; },
      observation: (r) => `${r.responses.map(x => `${x.name}(참석 회신)`).join(', ')} 전원 응답 완료.`
    },
    { type: 'THOUGHT', agent: 'coordinator', text: '수집된 응답 데이터를 파싱하여 최종 참석률 보고서 가공.' },
    { type: 'OUTPUT', agent: 'coordinator', text: (s) => `RSVP 자동 수렴 및 현황 보고 완료. (참석률 ${s._rsvp?.attendanceRate ?? 100}%)` }
  ],

  action_trigger_cancel: [
    { type: 'THOUGHT', agent: 'coordinator', text: '호스트의 회의 전면 취소 요청 감지. 긴급 취소 전파 프로세스 작동.' },
    {
      type: 'ACTION', agent: 'coordinator', tool: 'cancel_meeting_and_purge',
      args: (s) => ({ reason: s.cancelReason }),
      observation: (r) => `회의 데이터베이스 상태 변경: CANCELLED. 사유: ${r.reason}. 예약 자원 반납 처리 완료.`
    },
    {
      type: 'ACTION', agent: 'rsvp', tool: 'send_cancel_telegram_and_email',
      args: (s) => ({ recipients: namesOf(activeIds(s)) }),
      observation: (r) => `이메일 및 메신저 취소 전파 완료. 전 참석자(${r.recipients.length}명) 캘린더 취소선 그어짐.`
    },
    { type: 'OUTPUT', agent: 'coordinator', text: '회의 일정 취소 및 비상 전파 프로세스 완료.' }
  ],

  step_8: [
    { type: 'THOUGHT', agent: 'coordinator', text: '회의 D-1시간 및 시작 시점 도달. 실시간 음성 속기 엔진 활성화를 회의록 작성 에이전트에게 위임합니다.' },
    {
      type: 'ACTION', agent: 'scribe', tool: 'initialize_transcription_engine',
      args: () => ({ mode: 'Live', lang: 'ko-KR' }),
      observation: (r) => `STT 엔진 가동 준비 완료(${r.lang}). 마이크 스트림 대기 상태.`
    },
    { type: 'OUTPUT', agent: 'coordinator', text: '음성 자동 녹음 및 속기를 대기하고 있습니다.' }
  ],

  step_9: [
    { type: 'THOUGHT', agent: 'scribe', text: '회의 종료 확인. 축적된 실시간 속기 데이터를 분석하여 안건 요약·결정 사항·Action Item을 자동 구조화합니다.' },
    {
      type: 'ACTION', agent: 'scribe', tool: 'summarize_transcript_to_minutes',
      args: () => ({ transcriptLength: 512 }),
      observation: (r) => `안건 요약 ${r.summaryCount}개, 결정 사항 ${r.decisionCount}개, Action Item ${r.actionItemCount}개 구조화 완료.`
    },
    {
      type: 'ACTION', agent: 'scribe', tool: 'send_minutes_draft_for_review',
      args: (s) => ({ recipients: namesOf(requiredIds(s)) }),
      observation: (r) => `회의록 초안 검토 요청 메일 발송 성공 (수신: ${r.recipients.join(', ')}).`
    },
    { type: 'OUTPUT', agent: 'coordinator', text: 'AI 회의록 초안 완성. 호스트 및 필수 참가자 검토 대기 중.' }
  ],

  action_start_recording: [
    { type: 'THOUGHT', agent: 'coordinator', text: '호스트가 회의 음성 속기를 개시함. 마이크 스트림 활성화를 회의록 작성 에이전트에게 요청.' },
    {
      type: 'ACTION', agent: 'scribe', tool: 'start_audio_streaming',
      args: (s) => ({ room: s.meetingType === 'offline' ? s.selectedRoom : 'online' }),
      observation: (r) => `오디오 스트리밍 연결됨(${r.room}). 음성 패킷 전송 중.`
    },
    { type: 'OUTPUT', agent: 'coordinator', text: '실시간 AI 속기록 작성이 가동되었습니다.' }
  ],

  action_stop_recording: [
    { type: 'THOUGHT', agent: 'scribe', text: '녹화 종료 요청 수신. 축적된 음성 텍스트 원본 데이터 가공 및 요약 알고리즘 실행.' },
    {
      type: 'ACTION', agent: 'scribe', tool: 'summarize_transcript_to_minutes',
      args: () => ({ transcriptLength: 512 }),
      observation: (r) => `안건 요약 ${r.summaryCount}개, 결정 사항 ${r.decisionCount}개, Action Item ${r.actionItemCount}개 요약본 생성 성공.`
    },
    {
      type: 'ACTION', agent: 'scribe', tool: 'send_minutes_draft_for_review',
      args: (s) => ({ recipients: namesOf(requiredIds(s)) }),
      observation: (r) => `초안 검토 및 피드백 요청 메일 전송 성공 (수신: ${r.recipients.join(', ')}).`
    },
    { type: 'OUTPUT', agent: 'coordinator', text: 'AI 회의록 초안 생성 및 피드백 검토 절차 개시.' }
  ],

  action_apply_feedback: [
    { type: 'THOUGHT', agent: 'scribe', text: '호스트가 수정한 피드백 의견 접수. 회의록 문서 보정 알고리즘 작동.' },
    {
      type: 'ACTION', agent: 'scribe', tool: 'merge_minutes_feedback',
      args: (s) => ({ feedback: s.minutesFeedback }),
      observation: (r) => r.hasFeedback ? '기존 초안에 검토 피드백 반영 완료.' : '추가 피드백 없이 초안 그대로 확정.'
    },
    {
      type: 'ACTION', agent: 'scribe', tool: 'distribute_final_archived_minutes',
      args: (s) => ({ recipients: namesOf(activeIds(s)) }),
      observation: (r) => `최종 이메일 발송(${r.recipients.length}명) 및 사내 지식 관리 저장소 영구 아카이빙 성공.`
    },
    { type: 'OUTPUT', agent: 'coordinator', text: '피드백 반영 및 최종 회의록 배포 완결.' }
  ]
};

export { requiredIds, activeIds, namesOf, countActive };
