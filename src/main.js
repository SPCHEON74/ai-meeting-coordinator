import './style.css';
import { EMPLOYEES, BASE_SCHEDULES, MEETING_ROOMS } from './agent/tools.js';
import { AgenticEngine } from './agent/engine.js';
import { SCENARIOS } from './agent/scenarios.js';
import { buildScoreMap } from './agent/recommend.js';
import { loadParticipants, saveParticipants, onParticipantsChanged } from './agent/participantState.js';

const agenticEngine = new AgenticEngine();

// ────────────────────────────────────────────────────────
// 2. APPLICATION GLOBAL STATE
// ────────────────────────────────────────────────────────

let appState = {
  currentStep: 1,
  autoMode: false, // 자율 모드(Auto-run): true면 추천 액션을 자동 실행

  // 회의 기본 정보
  meetingName: '생성형 AI 플랫폼 활용도 제고 방안',
  meetingAgenda: '생성형 AI 플랫폼을 활용하여 업무를 효율화 할 수 있는 아이디어 회의',
  meetingAttachment: 'AI_타행활용사례.pdf',

  // 일정 조율 상태
  selectedDate: '2026-06-20', // 토요일 기본 지정
  selectedTimeStart: '14:00',
  selectedTimeEnd: '15:30',
  
  // 참석자 정보 및 배정 (required: 필수, optional: 선택, excluded: 제외)
  // EMPLOYEES 전체를 excluded 기본값으로 초기화 → init()에서 localStorage 병합
  participants: Object.fromEntries(
    EMPLOYEES.map(e => [e.id, e.id === 'emp_host' ? 'required' : 'excluded'])
  ),
  
  // 자원 예약 상태
  meetingType: 'offline', // 'offline' (대면) | 'online' (비대면)
  selectedRoom: 'room_creative', // 기본 선택 회의실
  onlineLink: '', // 비대면일 시 생성되는 링크
  
  // 기타 시뮬레이션 트리거
  isCollision: false,
  isConfirmed: false,
  isCancelled: false,
  cancelReason: '',
  isRecording: false,
  
  // 회의 알림 및 피드백 상태
  telegramAnswers: {}, // 24시간 전 응답 상태 { empId: 'yes' | 'no' }
  minutesDraft: `[생성형 AI 플랫폼 활용도 제고 방안 회의록 초안]
일시: 2026년 6월 20일 16:00 - 17:30
장소: 크리에이티브룸 (신관 2층)
참석자: 김경남(호스트), 이데이(필수), 박시스(필수), 최혁신(필수)

[핵심 요약]
- 행내 생성형 AI 플랫폼(SNAP) 활용 현황 점검 및 부서별 업무 효율화 아이디어 공유.
- 타행 AI 활용 사례(AI_타행활용사례.pdf) 검토 후 적용 가능 업무 영역 도출.

[결정 사항]
1. 여신심사 자동 초안 생성 기능을 시범 적용하여 심사 처리 시간 단축 가능성 검토.
2. 고객 상담 AI 어시스턴트 도입 시 상담 품질 지표(CSAT) 측정 기준 마련 필요.
3. AI 생성 문서에 대한 최종 책임자 검토 프로세스를 반드시 병행하도록 내규 보완.

[Action Items]
- 여신심사 AI 초안 생성 파일럿 기획서 작성 (담당자: 박시스 과장, 기한: 6/27)
- 타행 AI 활용 사례 심화 분석 보고서 제출 (담당자: 이데이 대리, 기한: 6/30)`,
  minutesFeedback: '', // 사용자가 입력할 수정 피드백
  minutesFinal: '', // 최종 완성된 회의록
  
  // 피드 시뮬레이터 히스토리
  chatHistory: [],
  telegramHistory: [],
  emails: []
};

// ────────────────────────────────────────────────────────
// 3. SCENARIO MESSAGES AND DIALOGUES
// ────────────────────────────────────────────────────────

const AGENT_MESSAGES = {
  1: {
    init: "안녕하세요! 회의 조율 및 관리 보조 에이전트입니다. 사내 회의 준비를 도와드리겠습니다. 호스트님, 준비하고 계신 **회의명, 회의 안건, 회의 자료(옵션)**를 알려주시면 검토하여 회의 일정을 조율해 드리겠습니다.",
    actions: [
      { text: "회의 기획안 전달하고 일정 준비 부탁하기", next: 2, action: "submit_draft" }
    ]
  },
  2: {
    init: "호스트님의 입력 사항을 확인했습니다!\n\n**[회의 기획안 접수]**\n• 회의명: 생성형 AI 플랫폼 활용도 제고 방안\n• 회의 안건: 생성형 AI 플랫폼을 활용하여 업무를 효율화 할 수 있는 아이디어 회의\n• 첨부 자료: AI_타행활용사례.pdf\n\n호스트님의 향후 캘린더 일정을 분석한 결과, 아래 일자들이 회의 개설이 가능합니다. **선호하시는 일자와 시간대**를 선택해 주세요.",
    actions: [
      { text: "추천 1순위: 6월 20일(토) 14:00 ~ 15:30 선택", action: "select_time_1" },
      { text: "추천 2순위: 6월 24일(수) 10:00 ~ 11:30 선택", action: "select_time_2" }
    ]
  },
  3: {
    init: "선택하신 일시로 스케줄링을 시작합니다.\n• **선택 일시**: 2026년 6월 20일(토) 14:00 ~ 15:30\n\n회의 안건의 주요 키워드(**AI, 플랫폼, 업무효율화**)를 기반으로 **인사 시스템의 업무 분장표와 직원 검색**을 실행하여 회의 참석이 필요한 사내 임직원 후보군을 분석했습니다.\n\n우측 '인사시스템' 탭에 매칭된 참석자 리스트를 띄워드렸습니다. 역할을 검토하시어 **필수 참가자, 선택 참가자, 제외자**를 확정해 주시기 바랍니다.",
    actions: [
      { text: "추천된 참석 대상자 그대로 확정하기", next: 4, action: "confirm_members" }
    ]
  },
  4: {
    init: "참석자 역할 지정을 확인했습니다. 이제 **필수 참가자의 일정표**를 스캔하여 지정하신 시간에 일정 충돌이 발생하는지 확인하겠습니다.",
    actions: [
      { text: "필수 참석자 캘린더 스캔 시작", action: "scan_calendars" }
    ],
    collision: "🚨 **일정 충돌이 감지되었습니다!**\n필수 참가자인 **김마케 팀장(14:30~15:30)**과 **이디자 대리(14:00~15:00)**가 해당 시간에 이미 사전 선약이 있어 캘린더가 겹칩니다.\n\n회의를 그대로 강행하시겠습니까, 아니면 필수 참석자 전원이 비어 있는 **최적의 시간대로 일정을 자동 조율(재추천)** 하시겠습니까?",
    collisionActions: [
      { text: "그냥 이대로 강행하여 등록", action: "force_meeting" },
      { text: "⭐ (추천) AI 스마트 추천 시간(16:00~17:30)으로 조율", action: "smart_adjust" }
    ]
  },
  5: {
    init: "최종 개최 일시가 확정되었습니다!\n• **최종 일시**: 2026년 6월 20일(토) 16:00 ~ 17:30 (충돌 없음)\n\n대면 회의인 경우 회의실 예약이 필요합니다. **자원 예약 에이전트**를 호출하여 참석자 규모(4인)를 완벽히 수용하고 해당 시간에 예약 가능한 회의실을 검색하겠습니다.\n\n*(비대면 화상회의인 경우 Teams 회의 링크가 자동 생성됩니다.)*",
    actions: [
      { text: "대면 회의실 자동 예약 실행", action: "book_offline" },
      { text: "비대면 Teams 화상 회의로 전환", action: "toggle_online" }
    ]
  },
  6: {
    init: "회의실 자원 예약 및 회의 준비가 모두 완료되었습니다!\n\n**[회의 예약 정보]**\n• 회의실: 크리에이티브룸 (신관 2층) 예약 완료\n• 일정표 연동: 참석자 전원 캘린더에 일정 자동 등록 및 링크 첨부\n\n회의 최종 정보(일정표 링크, 안건, 자료 등)가 포함된 **초청 안내 메일**을 호스트 및 참가자 전원에게 발송했습니다. 우측 'Gmail' 탭에서 전송된 메일을 확인하실 수 있습니다.",
    actions: [
      { text: "회의 개최 24시간 전 참석 조사 시뮬레이션", next: 7, action: "simulate_d24" }
    ]
  },
  7: {
    init: "회의 개최 24시간 전입니다.\n임직원들의 메신저(텔레그램)로 **참석 가능 여부(RSVP) 설문**을 자동 발송하여 실시간 회신 결과를 수집합니다. 우측 '텔레그램' 탭에서 전송 상태와 피드백을 모니터링하세요.\n\n*(참고: 개최 1일 전인 현재 시점까지는 일정 변경이 자유롭게 가능하며, 2시간 전까지 회의 취소도 지원합니다.)*",
    actions: [
      { text: "회의 개최 1시간 전 요청 알림 및 회의 시작", next: 8, action: "start_meeting_flow" },
      { text: "🚨 긴급 현안으로 회의 취소 시뮬레이션", action: "trigger_cancel" }
    ]
  },
  8: {
    init: "회의 개최 1시간 전, 메신저로 최종 참석 요청 알림이 전 참가자에게 전송되었습니다. \n\n회의 시간이 도래하여 **AI 회의 녹화 및 실시간 녹취록 작성**을 개시합니다. 회의실 내 임직원 발언이 텍스트로 즉각 정리됩니다. 회의가 진행되는 과정을 시뮬레이션해 보세요.",
    actions: [
      { text: "회의 시작 및 실시간 음성 녹화 진행", action: "start_recording" }
    ],
    recordingActions: [
      { text: "회의 종료 및 AI 회의록 초안 생성 요청", action: "stop_recording" }
    ]
  },
  9: {
    init: "회의가 성공적으로 종료되었습니다!\n녹취록을 기반으로 AI 에이전트가 **회의록 초안(안건 요약, 결정사항, Action Item)**을 신속하게 정리했습니다.\n\n이 회의록을 호스트 및 필수 참가자들에게 공유하고 **피드백 요청 메일**을 발송했습니다. 회의록 내용을 검토한 후, 수정 피드백을 입력하여 최종본을 배포해 주세요.",
    actions: [
      { text: "회의록 검토 및 피드백 수정/최종 공유", action: "edit_minutes" }
    ]
  }
};

// ────────────────────────────────────────────────────────
// 4. CORE ENGINE & SCENARIO CONTROLLER
// ────────────────────────────────────────────────────────

const ChatContainer = document.getElementById('chat-messages');
const ActionContainer = document.getElementById('quick-actions-container');
const CalColumnsGrid = document.getElementById('calendar-columns-grid');
const CalDateLabel = document.getElementById('cal-date-label');

const ResourceBody = document.getElementById('resource-body-content');
const SmartSuggestionBox = document.getElementById('smart-suggestion-box');
const SmartSuggestionList = document.getElementById('suggestion-times-list');
const CalendarInfoText = document.getElementById('calendar-info-text');
const OrgList = document.getElementById('org-list');
const OrgSearchInput = document.getElementById('org-search-input');
const TgHistory = document.getElementById('tg-history');
const AgentActiveBadge = document.getElementById('agent-active-badge');

// 인사 검색 상태 (추천 엔진 결과)
let orgSearchState = { tokens: [], scoreMap: {} };
const GmailListPane = document.getElementById('gmail-list-pane');
const GmailViewPane = document.getElementById('gmail-view-pane');
const MailCountBadge = document.getElementById('mail-count');

// 시뮬레이터 구동 함수
function init() {
  // localStorage에 저장된 참석자 역할 복원 (전체 직원 대상)
  const saved = loadParticipants();
  if (saved && Object.keys(saved).length > 0) {
    Object.entries(saved).forEach(([id, role]) => {
      appState.participants[id] = role;
    });
  } else {
    // 저장값 없을 때만 시뮬레이션 기본값 적용
    appState.participants['emp_marketing'] = 'required';
    appState.participants['emp_design']    = 'required';
    appState.participants['emp_budget']    = 'required';
  }

  // 검색 페이지에서 역할 변경 시 실시간 반영
  onParticipantsChanged(newRoles => {
    if (appState.currentStep > 4) return;
    Object.entries(newRoles).forEach(([id, role]) => {
      appState.participants[id] = role;
    });
    renderOrg();
    renderCalendar();
    showToast('직원검색 화면에서 참석자 역할이 변경되었습니다.', 'info');
  });

  setupEventListeners();
  agenticEngine.onAgentActive = updateAgentNetwork;
  runStep(1);
  renderOrg();
  renderCalendar();
  renderResources();
}

async function runStep(step) {
  appState.currentStep = step;
  updateStepper();

  // AI Agent 상태 변경 안내
  const activeBadge = AgentActiveBadge;
  if (activeBadge) {
    activeBadge.textContent = "생각 중...";
    activeBadge.className = "agent-status-badge status-writing";
  }

  // Trigger Agentic ReAct thoughts in console
  const scenario = SCENARIOS['step_' + step];
  if (scenario) {
    await agenticEngine.runSteps(scenario, appState);
  }

  if (activeBadge) {
    activeBadge.textContent = "업무 완료";
    activeBadge.className = "agent-status-badge status-working";
  }

  const messageData = AGENT_MESSAGES[step];
  if (messageData) {
    addChatMessage('agent', messageData.init);
    renderQuickActions(messageData.actions);
    maybeAutoAdvance(messageData.actions);
  }

  // 특정 단계별 부가 화면 제어
  handleStepTransitions(step);
}

// 단계 진입 시 동적 시뮬레이션 처리
function handleStepTransitions(step) {
  if (step === 2) {
    CalendarInfoText.textContent = "호스트 캘린더 분석 뷰";
    renderCalendar();
    // 스마트 추천 타임라인 노출
    SmartSuggestionBox.classList.remove('hidden');
    document.getElementById('suggestion-reason-text').textContent = "호스트 캘린더 여유 일자";
    SmartSuggestionList.innerHTML = `
      <button class="suggest-btn" data-time="6/20 14:00">6월 20일(토) 14:00~15:30</button>
      <button class="suggest-btn" data-time="6/24 10:00">6월 24일(수) 10:00~11:30</button>
    `;
    
    // 스마트 추천 시간 클릭 바인딩
    SmartSuggestionList.querySelectorAll('.suggest-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const timeVal = e.target.getAttribute('data-time');
        if (timeVal.includes('6/20')) {
          handleAction('select_time_1');
        } else {
          handleAction('select_time_2');
        }
      });
    });
  } else if (step === 3) {
    CalendarInfoText.textContent = "선택 일자 스케줄러";
    showToast("AI가 안건 키워드 매칭 인원을 인사 DB에서 탐색했습니다.", "info");

    // 추천 엔진으로 매칭 & 검색창 자동 채우기
    runOrgSearch(`${appState.meetingName} ${appState.meetingAgenda}`);

    // 상위 3명을 필수 참석자로 자동 지정
    const top3 = Object.entries(orgSearchState.scoreMap)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 3)
      .map(([id]) => id);
    EMPLOYEES.forEach(emp => {
      if (emp.id === 'emp_host') return;
      appState.participants[emp.id] = top3.includes(emp.id) ? 'required' : 'excluded';
    });
    saveParticipants(appState.participants);
    renderOrg();
  } else if (step === 4) {
    CalendarInfoText.textContent = "참석 인원 전체 캘린더 스캔";
    renderCalendar();
  } else if (step === 5) {
    CalendarInfoText.textContent = `최종 확정 일정표 (${appState.selectedTimeStart}~${appState.selectedTimeEnd})`;
    renderCalendar();
    renderResources();
  } else if (step === 6) {
    renderCalendar();
    renderResources();
  } else if (step === 8) {
    renderCalendar();
  }
}

// ────────────────────────────────────────────────────────
// 5. ACTION RESOLUTION (대화형 버튼 클릭 이벤트 분석)
// ────────────────────────────────────────────────────────

async function handleAction(actionName) {
  addChatMessage('user', getActionButtonLabel(actionName));
  
  const activeBadge = AgentActiveBadge;
  if (activeBadge) {
    activeBadge.textContent = "처리 중...";
    activeBadge.className = "agent-status-badge status-writing";
  }

  // Pre-action Thought Simulation
  let scenario = null;
  if (actionName === "scan_calendars") {
    scenario = SCENARIOS.step_4;
  } else if (actionName === "force_meeting") {
    scenario = SCENARIOS.action_force_meeting;
  } else if (actionName === "smart_adjust") {
    scenario = SCENARIOS.action_smart_adjust;
  } else if (actionName === "book_offline") {
    scenario = SCENARIOS.action_book_offline;
  } else if (actionName === "toggle_online") {
    scenario = SCENARIOS.action_toggle_online;
  } else if (actionName === "start_recording") {
    scenario = SCENARIOS.action_start_recording;
  } else if (actionName === "stop_recording") {
    scenario = SCENARIOS.action_stop_recording;
  }

  if (scenario) {
    await agenticEngine.runSteps(scenario, appState);
  } else {
    // Wait a brief moment if there are no logs to let user see status change
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (activeBadge) {
    activeBadge.textContent = "업무 완료";
    activeBadge.className = "agent-status-badge status-working";
  }

  switch (actionName) {
    case "submit_draft":
      await runStep(2);
      break;
      
    case "select_time_1":
      appState.selectedDate = '2026-06-20';
      appState.selectedTimeStart = '14:00';
      appState.selectedTimeEnd = '15:30';
      CalDateLabel.textContent = "2026년 6월 20일 (토요일)";
      showToast("회의 일정이 6월 20일 14:00로 가설정되었습니다.", "success");
      await runStep(3);
      break;
      
    case "select_time_2":
      appState.selectedDate = '2026-06-24';
      appState.selectedTimeStart = '10:00';
      appState.selectedTimeEnd = '11:30';
      CalDateLabel.textContent = "2026년 6월 24일 (수요일)";
      showToast("회의 일정이 6월 24일 10:00로 가설정되었습니다.", "success");
      await runStep(3);
      break;
      
    case "confirm_members":
      await runStep(4);
      break;
      
    case "scan_calendars":
      appState.isCollision = !!appState._collisionResult?.hasCollision;
      renderCalendar();
      if (appState.isCollision) {
        addChatMessage('agent', AGENT_MESSAGES[4].collision);
        renderQuickActions(AGENT_MESSAGES[4].collisionActions);
        maybeAutoAdvance(AGENT_MESSAGES[4].collisionActions);
        showToast("필수 참석자 일정 중 겹치는 일정이 검출되었습니다.", "warning");
      } else {
        appState.isConfirmed = true;
        showToast("필수 참석자 전원 일정이 비어있어 충돌 없이 확정되었습니다.", "success");
        await runStep(5);
      }
      break;

    case "force_meeting":
      appState.isCollision = false;
      appState.isConfirmed = true;
      showToast("충돌을 감수하고 기존 시간으로 회의 진행을 선택했습니다.", "info");
      await runStep(5);
      break;

    case "smart_adjust":
      appState.isCollision = false;
      appState.isConfirmed = true;
      showToast(`AI 추천 빈 시간대(${appState.selectedTimeStart}~${appState.selectedTimeEnd})로 재조율되었습니다.`, "success");
      await runStep(5);
      break;
      
    case "book_offline":
      appState.meetingType = 'offline';
      appState.selectedRoom = 'room_creative';
      appState.onlineLink = '';
      renderResources();
      showToast("자원 예약 에이전트: '크리에이티브룸' 예약에 성공했습니다.", "success");
      await runStep(6);
      sendMeetingEmails();
      break;
      
    case "toggle_online":
      appState.meetingType = 'online';
      appState.selectedRoom = null;
      appState.onlineLink = 'https://teams.microsoft.com/l/meetup-join/ai-coordinator-9988-1234';
      renderResources();
      showToast("비대면 회의 전환 및 화상 접속 주소(Teams) 생성 완료.", "success");
      await runStep(6);
      sendMeetingEmails();
      break;
      
    case "simulate_d24":
      await runStep(7);
      simulateTelegramRSVP();
      break;
      
    case "trigger_cancel":
      openCancelModal();
      break;
      
    case "start_meeting_flow":
      await runStep(8);
      break;
      
    case "start_recording":
      appState.isRecording = true;
      showToast("회의 음성 녹화 및 실시간 녹취록 작성이 개시되었습니다.", "info");
      addChatMessage('agent', "🎙️ **[회의 안내]** 호스트님이 회의를 시작하셨으며, 현 시간부로 에이전트의 AI 음성 녹화 및 실시간 속기가 진행됩니다. 회의 내용은 녹화 종료 후 자동으로 회의록으로 가공됩니다.");
      addTelegramMessage('out', "📢 회의가 시작되었습니다. 전 참석자는 지정된 장소(또는 Teams 화상 링크)로 참석해 주십시오. (회의 자동 속기 중)");
      startLiveTranscriptionSimulation();
      break;
      
    case "stop_recording":
      appState.isRecording = false;
      showToast("회의 녹화가 종료되었으며 AI가 회의록 분석을 마쳤습니다.", "success");
      sendMinutesDraftEmails();
      simulateSatisfactionSurvey();
      await runStep(9);
      break;
      
    case "edit_minutes":
      openMinutesFeedbackModal();
      break;
  }
}

function getActionButtonLabel(action) {
  const allActions = [
    ...AGENT_MESSAGES[1].actions,
    ...AGENT_MESSAGES[2].actions,
    ...AGENT_MESSAGES[3].actions,
    ...AGENT_MESSAGES[4].actions,
    ...AGENT_MESSAGES[4].collisionActions,
    ...AGENT_MESSAGES[5].actions,
    ...AGENT_MESSAGES[6].actions,
    ...AGENT_MESSAGES[7].actions,
    ...AGENT_MESSAGES[8].actions,
    ...AGENT_MESSAGES[8].recordingActions,
    ...AGENT_MESSAGES[8].minutesActions
  ];
  const found = allActions.find(a => a.action === action);
  return found ? found.text : action;
}

// ────────────────────────────────────────────────────────
// 6. UI RENDERERS & SYNC METHODS
// ────────────────────────────────────────────────────────

function updateStepper() {
  const stepNodes = document.querySelectorAll('.step-node');
  stepNodes.forEach(node => {
    const stepNum = parseInt(node.getAttribute('data-step'));
    node.className = 'step-node';
    if (stepNum === appState.currentStep) {
      node.classList.add('active');
    } else if (stepNum < appState.currentStep) {
      node.classList.add('completed');
    }
  });
}

function addChatMessage(sender, text) {
  const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender}`;
  
  // 마크다운 파싱(간이)
  let parsedText = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/• (.*?)\n/g, '• $1<br>')
    .replace(/\n/g, '<br>');
    
  bubble.innerHTML = `
    <div class="content">${parsedText}</div>
    <span class="meta">${sender === 'agent' ? '회의 에이전트' : '호스트'} • ${time}</span>
  `;
  
  ChatContainer.appendChild(bubble);
  ChatContainer.scrollTop = ChatContainer.scrollHeight;
}

function renderQuickActions(actions) {
  ActionContainer.innerHTML = '';
  if (!actions) return;

  actions.forEach(act => {
    const btn = document.createElement('button');
    btn.className = 'quick-btn';
    btn.textContent = act.text;
    btn.addEventListener('click', () => handleAction(act.action));
    ActionContainer.appendChild(btn);
  });
}

// 자율 모드(Auto-run)에서 추천 액션을 자동으로 클릭. 취소/회의록 편집처럼
// 사용자의 명시적 결정이 필요한 액션은 자동 실행하지 않는다.
const AUTO_ADVANCE_SKIP = ['trigger_cancel', 'edit_minutes'];

function maybeAutoAdvance(actions) {
  if (!appState.autoMode || !actions || actions.length === 0) return;

  const candidate =
    actions.find(a => a.action === 'smart_adjust') ||
    actions.find(a => !AUTO_ADVANCE_SKIP.includes(a.action));

  if (!candidate) return;

  setTimeout(() => handleAction(candidate.action), 1200);
}

// 멀티 에이전트 협업 네트워크 위젯 업데이트
const AGENT_LINK_IDS = { resource: 'link-resource', rsvp: 'link-rsvp', scribe: 'link-scribe' };
let agentLinkTimeout = null;

function updateAgentNetwork(agentKey) {
  document.querySelectorAll('.agent-node').forEach(node => {
    node.classList.toggle('active', node.getAttribute('data-agent') === agentKey);
  });

  document.querySelectorAll('.agent-link').forEach(link => link.classList.remove('active'));

  const linkId = AGENT_LINK_IDS[agentKey];
  if (linkId) {
    const link = document.getElementById(linkId);
    if (link) {
      link.classList.add('active');
      clearTimeout(agentLinkTimeout);
      agentLinkTimeout = setTimeout(() => link.classList.remove('active'), 800);
    }
  }
}

// 스마트 캘린더 동적 렌더러
function renderCalendar() {
  CalColumnsGrid.innerHTML = '';
  
  // 활성화된(참석이 확정된) 인원만 열로 렌더링
  const columnsToRender = EMPLOYEES.filter(emp => {
    if (appState.currentStep < 3) {
      // 3단계 이전엔 호스트만 출력
      return emp.id === 'emp_host';
    }
    // 3단계 이후엔 필수 및 선택 참석자 모두 캘린더 열로 렌더링
    return appState.participants[emp.id] === 'required' || appState.participants[emp.id] === 'optional';
  });
  
  columnsToRender.forEach(emp => {
    const col = document.createElement('div');
    col.className = 'cal-column';
    
    const isHost = emp.id === 'emp_host';
    const isRequired = appState.participants[emp.id] === 'required';
    
    col.innerHTML = `
      <div class="col-header ${isHost ? 'host' : (isRequired ? 'required-member' : 'optional-member')}">
        ${emp.name} ${emp.pos} (${emp.dept.substring(0, 3)})
      </div>
      <div class="col-grid-slots" id="slots-${emp.id}">
        <!-- Time Slots & Busy blocks -->
      </div>
    `;
    
    CalColumnsGrid.appendChild(col);
    
    // 각 열의 시간 공간 채우기
    const slotsContainer = document.getElementById(`slots-${emp.id}`);
    
    // 1. 기존의 고정 스케줄 (Busy block) 배치
    const baseEvents = BASE_SCHEDULES[emp.id] || [];
    baseEvents.forEach(evt => {
      const block = createEventBlock(evt.start, evt.end, evt.name, 'busy');
      slotsContainer.appendChild(block);
    });
    
    // 2. 현재 조율 중인 가설정 및 확정 회의 블록 매핑
    if (appState.currentStep >= 2) {
      let blockType = 'suggested-block';
      let blockName = appState.meetingName;
      
      if (appState.isConfirmed) {
        blockType = 'confirmed-block';
      }
      if (appState.isCancelled) {
        blockType = 'cancelled-block';
        blockName = `[취소] ${blockName}`;
      }
      
      // 4단계이며 스캔 실행 시 충돌 체크 (도구 호출 결과 기반 동적 판정)
      if (appState.currentStep === 4 && appState.isCollision) {
        const checkCollision = appState._collisionResult?.collisions?.some(c => c.userId === emp.id);
        if (checkCollision) {
          blockType = 'collision';
          blockName = `⚠️ 충돌 발생: ${blockName}`;
        }
      }
      
      const meetingBlock = createEventBlock(
        appState.selectedTimeStart,
        appState.selectedTimeEnd,
        blockName,
        blockType
      );
      slotsContainer.appendChild(meetingBlock);
    }
  });
}

// 시간 계산 헬퍼: top과 height를 절댓값 px로 변환 (9시 기준, 1시간당 40px)
function createEventBlock(startTime, endTime, name, type) {
  const startHour = parseFloat(startTime.split(':')[0]) + parseFloat(startTime.split(':')[1])/60;
  const endHour = parseFloat(endTime.split(':')[0]) + parseFloat(endTime.split(':')[1])/60;
  
  const baseHour = 9; // 시작 기준시 9:00
  const slotHeight = 40; // 1시간당 40px
  
  const top = (startHour - baseHour) * slotHeight;
  const height = (endHour - startHour) * slotHeight;
  
  const block = document.createElement('div');
  block.className = `cal-event ${type}`;
  block.style.top = `${top}px`;
  block.style.height = `${height}px`;
  
  block.innerHTML = `
    <div class="event-time">${startTime} - ${endTime}</div>
    <div class="event-name">${name}</div>
  `;
  
  return block;
}

// 인사시스템 렌더러 (추천 엔진 결과 반영)
function renderOrg() {
  OrgList.innerHTML = '';
  const { scoreMap } = orgSearchState;
  const hasSearch = Object.keys(scoreMap).length > 0;

  // 호스트 → 매칭 점수 높은 순 → 나머지
  const sorted = [...EMPLOYEES].sort((a, b) => {
    if (a.id === 'emp_host') return -1;
    if (b.id === 'emp_host') return 1;
    return (scoreMap[b.id]?.score ?? 0) - (scoreMap[a.id]?.score ?? 0);
  });

  // 구분선: 매칭 그룹 / 비매칭 그룹
  let separatorAdded = false;

  sorted.forEach(emp => {
    const isHost = emp.id === 'emp_host';
    const match  = scoreMap[emp.id];
    const role   = appState.participants[emp.id] || 'excluded';

    // 비매칭 직원 구분선 (검색 결과 있을 때만)
    if (hasSearch && !isHost && !match && !separatorAdded) {
      separatorAdded = true;
      const sep = document.createElement('div');
      sep.className = 'org-separator';
      sep.textContent = '── 기타 직원';
      OrgList.appendChild(sep);
    }

    const item = document.createElement('div');
    item.className = `emp-item${match ? ' matched' : ''}`;

    const scoreBadge = match
      ? `<span class="emp-score-badge">점수 ${match.score}</span>`
      : '';
    const matchedKeywords = match?.matched.length
      ? `<div class="emp-match-keywords">${match.matched.map(k => `<span class="emp-kw">${k}</span>`).join('')}</div>`
      : '';

    item.innerHTML = `
      <div class="emp-card-top">
        <div class="emp-name-dept">
          <span class="emp-name">${emp.name} ${emp.pos}</span>
          <span class="emp-dept">${emp.dept}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          ${scoreBadge}
          <span class="emp-role">${isHost ? '호스트' : '참석 대상'}</span>
        </div>
      </div>
      <div class="emp-duty"><strong>담당업무:</strong> ${emp.duty}</div>
      ${matchedKeywords}
      ${!isHost ? `
        <div class="emp-card-actions">
          <button class="emp-role-btn ${role === 'required' ? 'active-required' : ''}" data-role="required" data-id="${emp.id}">필수</button>
          <button class="emp-role-btn ${role === 'optional' ? 'active-optional' : ''}" data-role="optional" data-id="${emp.id}">선택</button>
          <button class="emp-role-btn ${role === 'excluded' ? 'active-excluded' : ''}" data-role="excluded" data-id="${emp.id}">제외</button>
        </div>
      ` : ''}
    `;

    if (!isHost) {
      item.querySelectorAll('.emp-role-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          if (appState.currentStep > 4) {
            showToast("회의 일정이 완료된 후에는 참석자 변경이 불가능합니다.", "error");
            return;
          }
          const targetId = e.target.getAttribute('data-id');
          const nextRole = e.target.getAttribute('data-role');
          appState.participants[targetId] = nextRole;
          saveParticipants(appState.participants);
          renderOrg();
          renderCalendar();
          const label = nextRole === 'required' ? '필수 참가자' : nextRole === 'optional' ? '선택 참가자' : '제외자';
          showToast(`${emp.name}님이 ${label}로 재지정되었습니다.`, "info");
        });
      });
    }

    OrgList.appendChild(item);
  });
}

// 인사 검색 실행 (검색창 또는 시뮬레이션 step 3 에서 호출)
function runOrgSearch(query) {
  const text = query ?? OrgSearchInput.value.trim();
  if (!text) return;

  OrgSearchInput.value = text;
  orgSearchState = buildScoreMap(EMPLOYEES, text);
  renderOrg();
}

// 자원 예약 섹션 렌더러
function renderResources() {
  const isOffline = appState.meetingType === 'offline';
  const typeBadge = document.getElementById('meeting-type-badge');
  if (typeBadge) {
    typeBadge.textContent = isOffline ? "대면 회의실 예약" : "비대면 화상 회의";
    typeBadge.className = `resource-type-toggle ${isOffline ? 'offline' : 'online'}`;
  }

  if (isOffline) {
    ResourceBody.innerHTML = `
      <div class="room-list-view">
        <div class="room-item ${appState.selectedRoom === 'room_brain' ? 'selected' : ''}" data-room="room_brain">
          <div class="room-info">
            <span class="room-name">집단지성실 (본관 3층)</span>
            <span class="room-cap">수용: 최대 8명 • 빔프로젝터, 대형 화이트보드 완비</span>
          </div>
          <span class="room-cap">${appState.selectedRoom === 'room_brain' ? '✅ 예약됨' : '예약가능'}</span>
        </div>
        <div class="room-item ${appState.selectedRoom === 'room_creative' ? 'selected' : ''}" data-room="room_creative">
          <div class="room-info">
            <span class="room-name">크리에이티브룸 (신관 2층)</span>
            <span class="room-cap">수용: 최대 6명 • 화상 카메라, 모바일 미러링 장비 완비</span>
          </div>
          <span class="room-cap">${appState.selectedRoom === 'room_creative' ? '✅ 예약됨' : '예약가능'}</span>
        </div>
        <div class="room-item ${appState.selectedRoom === 'room_strategy' ? 'selected' : ''}" data-room="room_strategy">
          <div class="room-info">
            <span class="room-name">미래전략실 (본관 5층)</span>
            <span class="room-cap">수용: 최대 4명 • 소규모 스마트 모니터 원탁</span>
          </div>
          <span class="room-cap">${appState.selectedRoom === 'room_strategy' ? '✅ 예약됨' : '예약가능'}</span>
        </div>
      </div>
    `;
    
    // 회의실 클릭 변경 기능 바인딩
    ResourceBody.querySelectorAll('.room-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const roomItem = e.currentTarget;
        const roomId = roomItem.getAttribute('data-room');
        if (appState.currentStep >= 7) {
          showToast("회의 전파가 끝난 후에는 회의 장소 변경이 제한됩니다.", "error");
          return;
        }
        appState.selectedRoom = roomId;
        renderResources();
        renderCalendar();
        showToast("회의실 예약 자원이 성공적으로 교체되었습니다.", "success");
      });
    });
  } else {
    ResourceBody.innerHTML = `
      <div class="online-meeting-box" style="padding:10px; background:rgba(6,182,212,0.05); border:1px solid rgba(6,182,212,0.2); border-radius:8px;">
        <div style="font-weight:600; color:var(--accent-cyan); display:flex; align-items:center; gap:8px;">
          <svg xmlns="http://www.w3.org/2000/svg" style="width:18px;height:18px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Teams 온라인 화상회의 생성 완료
        </div>
        <div style="font-size:0.75rem; margin-top:8px; word-break:break-all; font-family:var(--font-mono); color:var(--text-secondary);">
          <a href="${appState.onlineLink}" target="_blank" style="color:var(--accent-cyan); text-decoration:none;">${appState.onlineLink}</a>
        </div>
        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:6px;">
          * 화상회의 접속 주소는 회의 개시 1시간 전에 이메일 및 텔레그램 메신저로 전체 참가자에게 실시간 자동 리마인드 발송됩니다.
        </div>
      </div>
    `;
  }
}

// ────────────────────────────────────────────────────────
// 7. VIRTUAL MESSENGER (TELEGRAM) SIMULATOR
// ────────────────────────────────────────────────────────

function addTelegramMessage(dir, text, time = null) {
  const tgTime = time || new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  const msg = document.createElement('div');
  msg.className = `tg-msg ${dir}`;
  
  let parsed = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
    
  msg.innerHTML = `
    <div class="content">${parsed}</div>
    <span style="font-size:0.55rem; color:rgba(255,255,255,0.4); display:block; text-align:right; margin-top:3px;">${tgTime}</span>
  `;
  
  TgHistory.appendChild(msg);
  TgHistory.scrollTop = TgHistory.scrollHeight;
  const monitorBody = document.getElementById('monitor-panel-body');
  if (monitorBody?.classList.contains('collapsed')) showInboxNotification('telegram');
}

// 24시간 전 참석 여부 응답 시뮬레이션
function simulateTelegramRSVP() {
  TgHistory.innerHTML = '';
  showToast("텔레그램 알림 에이전트 가동: 참석 현황 조사를 진행합니다.", "info");
  
  addTelegramMessage('out', "📢 **[RSVP 조사]** 6/20(토) 16:00 개최되는 **'생성형 AI 플랫폼 활용도 제고 방안'** 회의의 참석 여부를 확인해 주십시오.\n\n• 장소: 크리에이티브룸\n• 안건: 생성형 AI 플랫폼을 활용하여 업무를 효율화 할 수 있는 아이디어 회의\n\n아래 버튼을 눌러 회신해 주시기 바랍니다.");
  
  // 임직원들 자동 회신 시뮬레이션 연출
  const activeParticipants = EMPLOYEES.filter(emp => emp.id !== 'emp_host' && (appState.participants[emp.id] === 'required' || appState.participants[emp.id] === 'optional'));
  
  let delay = 1000;
  
  activeParticipants.forEach(emp => {
    setTimeout(() => {
      const answer = 'yes';
      appState.telegramAnswers[emp.id] = answer;
      
      const answerText = answer === 'yes' ? '👍 참석 가능합니다.' : '👎 불참 (사유: 외근 일정)';
      addTelegramMessage('in', `**[${emp.name} ${emp.pos}]**\n${answerText}`);
      
      showToast(`${emp.name} ${emp.pos} 참석 여부 수신: 참석`, "success");
    }, delay);
    delay += 1200;
  });
  
  // 모든 회신이 완료된 후 호스트 보고용 보고서 발송
  setTimeout(() => {
    addTelegramMessage('out', `📊 **[참석 여부 회신 현황 보고]**\n호스트님, RSVP 수집 결과를 공유합니다.\n\n• **필수 참석 대상**: 3명 중 3명 참석 확인 완료 (100%)\n- 김마케 (참석)\n- 이디자 (참석)\n- 박예산 (참석)\n\n회의를 그대로 계획대로 정상 진행하겠습니다.`);
    showToast("참석 설문 피드백 보고서가 호스트에게 전달되었습니다.", "success");
  }, delay + 500);
}

// ────────────────────────────────────────────────────────
// 7-B. 회의 만족도 설문 시뮬레이터
// ────────────────────────────────────────────────────────

const SCORE_META = [
  { emoji: '😡', label: '매우불만족' },
  { emoji: '😞', label: '불만족' },
  { emoji: '😐', label: '보통' },
  { emoji: '😊', label: '만족' },
  { emoji: '🤩', label: '매우만족' },
];

// 직원별 시뮬레이션 응답 데이터
const SURVEY_RESPONSES = {
  emp_marketing: { score: 4, comment: '안건별 토론 시간 배분이 적절했습니다. 다음 번엔 사전 자료를 좀 더 일찍 공유해 주시면 더 좋을 것 같습니다.' },
  emp_design:    { score: 5, comment: 'AI 회의록 자동 생성 덕분에 내용 정리에 따로 시간을 쓰지 않아도 돼서 집중할 수 있었습니다! 앞으로도 이 방식을 유지해 주세요 😊' },
  emp_budget:    { score: 3, comment: '예산 검토 안건이 충분히 논의되지 못한 점이 조금 아쉬웠습니다. 다음 회의 전에 숫자 자료를 미리 배포해 주시면 감사하겠습니다.' },
  default:       { score: 4, comment: '전반적으로 효율적인 회의였습니다. 안건이 명확하게 정리되어 좋았습니다.' },
};

function addTelegramRawCard(html) {
  const wrap = document.createElement('div');
  wrap.className = 'tg-msg out';
  wrap.style.maxWidth = '90%';
  wrap.style.padding = '10px 12px';
  wrap.innerHTML = html;
  TgHistory.appendChild(wrap);
  TgHistory.scrollTop = TgHistory.scrollHeight;
}

function renderScoreRow() {
  return SCORE_META.map((m, i) => `
    <div class="tg-score-btn">
      <span class="tg-score-emoji">${m.emoji}</span>
      <span class="tg-score-num">${i + 1}</span>
      <span class="tg-score-label">${m.label}</span>
    </div>`).join('');
}

function renderStars(avg) {
  const full  = Math.floor(avg);
  const half  = avg - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function simulateSatisfactionSurvey() {
  const participants = EMPLOYEES.filter(emp =>
    emp.id !== 'emp_host' &&
    (appState.participants[emp.id] === 'required' || appState.participants[emp.id] === 'optional')
  );
  if (!participants.length) return;

  // 텔레그램 탭으로 자동 전환
  const tgTabBtn = document.querySelector('.tab-btn[data-tab="telegram"]');
  if (tgTabBtn) tgTabBtn.click();

  let delay = 1200;

  // ── 1단계: 만족도 점수 질문 ──────────────────────────
  setTimeout(() => {
    addTelegramRawCard(`
      <div class="tg-survey-card">
        <div class="tg-survey-label">📋 회의 만족도 조사</div>
        <div class="tg-survey-question">이번 회의에 대한 만족도는 몇 점인가요?</div>
        <div class="tg-score-row">${renderScoreRow()}</div>
        <div class="tg-survey-hint">1 매우불만족 · 2 불만족 · 3 보통 · 4 만족 · 5 매우만족</div>
      </div>
    `);
    showToast('참가자들에게 회의 만족도 설문이 발송되었습니다.', 'info');
  }, delay);

  // ── 참가자별 점수 + 정성 피드백 통합 응답 ───────────
  delay += 1500;
  const scores = [];

  participants.forEach(emp => {
    setTimeout(() => {
      const resp = SURVEY_RESPONSES[emp.id] ?? SURVEY_RESPONSES.default;
      const meta = SCORE_META[resp.score - 1];
      scores.push(resp.score);
      addTelegramMessage('in',
        `**[${emp.name} ${emp.pos}]**\n` +
        `${meta.emoji} **${resp.score}점** — ${meta.label}\n\n` +
        `💬 ${resp.comment}`
      );
    }, delay);
    delay += 1400;
  });

  // ── 결과 요약 카드 ────────────────────────────────────
  delay += 800;
  setTimeout(() => {
    const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    const avgFixed = avg.toFixed(1);

    // 점수 분포 계산
    const dist = [0, 0, 0, 0, 0];
    scores.forEach(s => { dist[s - 1]++; });
    const barRows = SCORE_META.map((_m, i) => {
      const pct = scores.length ? Math.round((dist[i] / scores.length) * 100) : 0;
      return `
        <div class="tg-result-bar-row">
          <span style="width:28px">${i + 1}점</span>
          <div class="tg-result-bar">
            <div class="tg-result-bar-fill" style="width:${pct}%"></div>
          </div>
          <span style="width:20px;text-align:right">${dist[i]}명</span>
        </div>`;
    }).join('');

    addTelegramRawCard(`
      <div class="tg-result-card">
        <div class="tg-result-title">📊 만족도 조사 결과</div>
        <div class="tg-result-avg">${avgFixed}점 / 5.0점</div>
        <div class="tg-result-stars">${renderStars(avg)}</div>
        <div class="tg-result-bar-wrap">${barRows}</div>
        <div class="tg-result-row">
          <span>응답자 ${scores.length}/${participants.length}명</span>
          <span>정성 피드백 ${scores.length}건 수집 완료</span>
        </div>
      </div>
    `);

    addChatMessage('agent',
      `📊 **[회의 만족도 조사 완료]**\n참가자 ${scores.length}명 전원의 피드백 수렴이 완료되었습니다.\n\n` +
      `• **평균 만족도**: ${avgFixed}점 / 5.0점\n` +
      `• **정성 피드백**: ${scores.length}건 수집 완료\n\n` +
      `수렴된 피드백은 향후 회의 개선에 반영될 예정입니다.`
    );
    showToast(`회의 만족도 조사 완료 — 평균 ${avgFixed}점`, 'success');
  }, delay);
}

// ────────────────────────────────────────────────────────
// 8. VIRTUAL EMAIL (GMAIL) SIMULATOR
// ────────────────────────────────────────────────────────

function sendMail({ subject, from, to, body, attachment = null }) {
  const mailId = 'mail_' + Math.random().toString(36).substring(2, 11);
  const time = new Date().toLocaleDateString('ko-KR') + ' ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  
  appState.emails.unshift({
    id: mailId,
    subject,
    from,
    to,
    body,
    time,
    attachment,
    read: false
  });
  
  renderGmailList();
  const monitorBody = document.getElementById('monitor-panel-body');
  if (monitorBody?.classList.contains('collapsed')) showInboxNotification('email');
}

function renderGmailList() {
  GmailListPane.innerHTML = '';
  
  let unreadCount = 0;
  appState.emails.forEach(mail => {
    if (!mail.read) unreadCount++;
    
    const item = document.createElement('div');
    item.className = `mail-item ${!mail.read ? 'unread' : ''}`;
    item.setAttribute('data-id', mail.id);
    
    item.innerHTML = `
      <div class="mail-meta">
        <span>보낸이: ${mail.from}</span>
        <span>${mail.time}</span>
      </div>
      <div class="mail-subj">${mail.subject}</div>
      <div class="mail-snippet">${mail.body.substring(0, 45)}...</div>
    `;
    
    item.addEventListener('click', () => openEmailDetail(mail.id));
    GmailListPane.appendChild(item);
  });
  
  MailCountBadge.textContent = unreadCount;
}

function openEmailDetail(mailId) {
  const mail = appState.emails.find(m => m.id === mailId);
  if (!mail) return;
  
  mail.read = true;
  renderGmailList();
  
  GmailListPane.classList.add('hidden');
  GmailViewPane.classList.remove('hidden');
  
  GmailViewPane.innerHTML = `
    <span class="mail-view-back" id="mail-back-btn">&larr; 목록으로</span>
    <div class="mail-view-header">
      <div class="mail-view-subj">${mail.subject}</div>
      <div class="mail-view-from-to">
        <div><strong>발신:</strong> ${mail.from}</div>
        <div><strong>수신:</strong> ${mail.to}</div>
        <div><strong>일시:</strong> ${mail.time}</div>
      </div>
    </div>
    <div class="mail-view-body">${mail.body}</div>
    ${mail.attachment ? `
      <div class="mail-view-attachment">
        <svg xmlns="http://www.w3.org/2000/svg" style="width:16px;height:16px;color:var(--accent-orange)" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.034 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
        </svg>
        <span>첨부파일: <strong>${mail.attachment}</strong></span>
      </div>
    ` : ''}
  `;
  
  document.getElementById('mail-back-btn').addEventListener('click', () => {
    GmailViewPane.classList.add('hidden');
    GmailListPane.classList.remove('hidden');
  });
}

// 회의 완료 후 초대 메일 일괄 발송
function sendMeetingEmails() {
  const roomName = appState.meetingType === 'offline' 
    ? MEETING_ROOMS.find(r => r.id === appState.selectedRoom).name 
    : "비대면 Teams 온라인 화상회의";
    
  const emailText = `안녕하세요, AI 일정 관리 도우미입니다.

김경남 과장님이 주관하시는 아래 회의 일정이 확정되어 안내 메일을 드립니다. 본 정보는 모든 참가자의 아웃룩 및 구글 캘린더 일정표에 자동으로 동기화 등록되었습니다.

[회의 확정 안내 정보]
• 회의명: ${appState.meetingName}
• 회의 일시: 2026년 6월 20일 (토) 16:00 ~ 17:30
• 개최 장소: ${roomName}
${appState.onlineLink ? `• Teams 링크: ${appState.onlineLink}\n` : ''}
[회의 개요 및 안건]
• 안건: ${appState.meetingAgenda}

[사전 지참 자료]
• 첨부파일: ${appState.meetingAttachment}

참석 여부에 변동이 생기시는 경우, 개최 24시간 전까지 캘린더 초청 승인/거절을 통해 업데이트해 주시거나 본 에이전트 봇에게 알려 주시기 바랍니다.

감사합니다.
AI Meeting Agent 드림`;

  const recipients = EMPLOYEES.filter(emp => emp.id !== 'emp_host' && (appState.participants[emp.id] === 'required' || appState.participants[emp.id] === 'optional'))
    .map(emp => `${emp.name} ${emp.pos}`)
    .join(', ');

  sendMail({
    subject: `[확정안내] ${appState.meetingName}`,
    from: "AI Meeting Assistant <agent@company.com>",
    to: recipients,
    body: emailText,
    attachment: appState.meetingAttachment
  });
  
  showToast("참석 대상자 전원에게 캘린더 등록 및 초대 이메일 발송 완료.", "success");
}

// 회의록 피드백 요청 이메일 발송
function sendMinutesDraftEmails() {
  const draftMailText = `참석자 여러분 안녕하십니까.

금일 진행된 [${appState.meetingName}]의 회의 녹취 요약을 바탕으로 작성된 AI 자동 회의록 초안을 송부드립니다.

내용을 면밀히 검토해 보시고 추가 반영이나 정정이 필요한 내용이 있으시다면 아래 피드백 수집 폼 또는 이메일 회신을 통해 전달해 주시기 바랍니다. 수렴된 피드백은 최종본에 즉각 반영되어 최종 배포됩니다.

[회의록 주요 사항 요약]
${appState.minutesDraft}

[피드백 회신 기한]
- 회의 종료 후 24시간 이내

감사합니다.
AI Meeting Agent 드림`;

  const reqRecipients = EMPLOYEES.filter(emp => appState.participants[emp.id] === 'required')
    .map(emp => `${emp.name} ${emp.pos}`)
    .join(', ');

  sendMail({
    subject: `[검토요청] ${appState.meetingName} 회의록 피드백 수렴`,
    from: "AI Meeting Assistant <agent@company.com>",
    to: reqRecipients,
    body: draftMailText
  });
  
  showToast("호스트 및 필수참가자 전원에게 회의록 검토 및 피드백 메일 전송 완료.", "success");
}

// ────────────────────────────────────────────────────────
// 9. LIVE RECORDING & TRANSCRIPTION SIMULATION
// ────────────────────────────────────────────────────────

let transInterval = null;
function startLiveTranscriptionSimulation() {
  if (transInterval) { clearInterval(transInterval); transInterval = null; }
  const transContainer = document.createElement('div');
  transContainer.className = 'agent-embed-card';
  transContainer.innerHTML = `
    <div class="agent-embed-header" style="display:flex; justify-content:space-between; align-items:center;">
      <span>🎙️ 실시간 AI 속기록 작성 중</span>
      <span class="recording-indicator"><span class="pulse-dot"></span>REC</span>
    </div>
    <div id="trans-text" style="font-family:var(--font-mono); font-size:0.75rem; height:80px; overflow-y:auto; color:var(--text-secondary); padding:4px;">
      [대기] 마이크 입력을 스캔하고 있습니다...
    </div>
  `;
  
  ChatContainer.appendChild(transContainer);
  ChatContainer.scrollTop = ChatContainer.scrollHeight;

  const transTextNode = document.getElementById('trans-text');
  const scripts = [
    "[김경남 과장] 안녕하세요, 생성형 AI 플랫폼 활용도 제고 방안 회의를 시작하겠습니다. 오늘은 각 부서에서 AI로 업무를 효율화할 수 있는 아이디어를 자유롭게 공유해 주시면 됩니다.",
    "[이데이 대리] 저는 여신심사 업무에서 AI를 활용할 수 있을 것 같습니다. 타행 사례를 보면 대출 신청서 초안 자동 생성으로 심사 처리 시간이 약 40% 단축된 사례가 있었습니다.",
    "[박시스 과장] 고객 센터 상담 로그를 AI가 분석해 자주 묻는 질문 답변을 자동 생성하면 상담원 응대 품질도 올라가고 대기 시간도 줄일 수 있을 것입니다. — 🌐 **[외국어 감지: 영어]** 'Using AI-driven FAQ automation, Mizuho Bank reduced call center handling time by 35% in Q1 2025.' — 🔄 **[AI 자동 번역]** '미즈호 은행은 AI 기반 FAQ 자동화를 통해 2025년 1분기 콜센터 처리 시간을 35% 단축했습니다.'",
    "[최혁신 선임] AI 문서 자동화는 좋지만, 생성된 내용에 대한 최종 책임은 담당자가 반드시 검토해야 한다고 생각합니다. 오류나 편향이 발생할 수 있기 때문에 내규 보완이 선행되어야 합니다.",
    "[김경남 과장] 모두 좋은 의견 감사합니다. 박 과장님이 여신심사 파일럿 기획서를, 이 대리님이 타행 사례 분석 보고서를 이달 말까지 제출해 주시면 다음 단계를 논의하겠습니다."
  ];

  let idx = 0;
  transInterval = setInterval(() => {
    if (idx < scripts.length) {
      if (idx === 0) transTextNode.innerHTML = '';
      transTextNode.innerHTML += `<div>${scripts[idx]}</div>`;
      transTextNode.scrollTop = transTextNode.scrollHeight;
      idx++;
    } else {
      clearInterval(transInterval);

      // 녹음 종료 액션 노출
      renderQuickActions(AGENT_MESSAGES[8].recordingActions);
      maybeAutoAdvance(AGENT_MESSAGES[8].recordingActions);
    }
  }, 3500);
}

// ────────────────────────────────────────────────────────
// 10. MODALS AND USER INTERACTION
// ────────────────────────────────────────────────────────

const Modal = document.getElementById('modal-container');
const ModalTitle = document.getElementById('modal-title');
const ModalBody = document.getElementById('modal-body-content');
const ModalFooter = document.getElementById('modal-footer-content');

function openModal(title, bodyHtml, footerHtml) {
  ModalTitle.textContent = title;
  ModalBody.innerHTML = bodyHtml;
  ModalFooter.innerHTML = footerHtml;
  
  Modal.classList.remove('hidden');
  setTimeout(() => {
    Modal.classList.add('active');
  }, 50);
}

function closeModal() {
  Modal.classList.remove('active');
  setTimeout(() => {
    Modal.classList.add('hidden');
  }, 300);
}

// 회의 취소 모달 열기
function openCancelModal() {
  const body = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <p style="color:var(--text-secondary)">회의 취소 시 전 참가자에게 이메일 및 메신저로 즉시 취소 사실이 전파되며 캘린더에 취소선이 적용됩니다.</p>
      <label style="font-weight:600; font-size:0.75rem; color:var(--text-muted)">취소 사유 입력</label>
      <textarea id="cancel-reason-input" class="minutes-textarea" placeholder="예: 타 부서 긴급 전사 회의 소집으로 일정 취소"></textarea>
    </div>
  `;
  const footer = `
    <button class="btn btn-secondary" id="cancel-modal-close">닫기</button>
    <button class="btn btn-danger" id="cancel-modal-submit">🚨 즉시 회의 취소 및 전파</button>
  `;
  
  openModal("회의 취소 및 비상 알림 전파", body, footer);
  
  document.getElementById('cancel-modal-close').addEventListener('click', closeModal);
  document.getElementById('cancel-modal-submit').addEventListener('click', () => {
    const reason = document.getElementById('cancel-reason-input').value || "긴급 사유 발생";
    appState.isCancelled = true;
    appState.cancelReason = reason;
    
    closeModal();
    executeCancellationFlow();
  });
}

// 실제 회의 취소 비즈니스 로직
function executeCancellationFlow() {
  showToast("회의 취소 사유 전파 중...", "warning");
  
  // 캘린더 UI 리렌더링 (취소선 반영)
  renderCalendar();
  
  // 에이전트 챗창에 통지
  addChatMessage('agent', `🚨 **[비상 공지 - 회의 취소 전파]**\n호스트님이 회의를 취소하셨습니다.\n\n• **취소 사유**: ${appState.cancelReason}\n\n전체 참가자에게 즉각 이메일 및 메신저(텔레그램)로 취소 전파 처리를 수행하였으며 모든 임직원 캘린더 일정에 취소선이 적용되었습니다.`);
  
  // 텔레그램 메신저 전파
  addTelegramMessage('out', `⚠️ **[긴급 회의 취소 알림]**\n6/20(토) 16:00 개최 예정이던 **'생성형 AI 플랫폼 활용도 제고 방안'** 회의가 호스트 긴급 요청으로 인해 공식 취소되었습니다.\n\n• 취소 사유: ${appState.cancelReason}\n\n일정에 참고하시기 바라며 캘린더를 확인해 주세요.`);
  
  // 취소 이메일 전송
  const recipients = EMPLOYEES.filter(emp => emp.id !== 'emp_host' && (appState.participants[emp.id] === 'required' || appState.participants[emp.id] === 'optional'))
    .map(emp => `${emp.name} ${emp.pos}`)
    .join(', ');

  const cancelMailText = `안녕하십니까, AI 회의 보조 에이전트입니다.

개최 예정이던 다음 회의 일정이 호스트님의 긴급 요청으로 전면 취소되었음을 급히 공유해 드립니다.

[취소된 회의 정보]
• 회의명: ${appState.meetingName}
• 원래 일시: 2026년 6월 20일 (토) 16:00 ~ 17:30
• 취소 사유: ${appState.cancelReason}

참석자 여러분의 아웃룩 및 구글 캘린더 일정표의 해당 항목은 취소선([취소])으로 그어져 일시가 취소되었음을 명확히 표기하도록 연동 완료하였습니다.

업무에 불편을 드려 대단히 죄송합니다.

AI Meeting Agent 드림`;

  sendMail({
    subject: `[취소안내] ${appState.meetingName} 일정이 취소되었습니다`,
    from: "AI Meeting Assistant <agent@company.com>",
    to: recipients,
    body: cancelMailText
  });

  showToast("회의가 안전하게 취소되고 모든 전파 작업이 마쳐졌습니다.", "success");
  
  // 시뮬레이션 제어 버튼 변경
  ActionContainer.innerHTML = `
    <button class="btn btn-secondary" onclick="window.location.reload()">새로운 시뮬레이션 리셋하기</button>
  `;
}

// 회의록 검토 및 피드백 입력 모달
function openMinutesFeedbackModal() {
  const body = `
    <div class="minutes-editor">
      <div class="minutes-meta">
        <div class="min-meta-item"><span class="min-meta-label">회의명</span><span class="min-meta-val">${appState.meetingName}</span></div>
        <div class="min-meta-item"><span class="min-meta-label">개최지</span><span class="min-meta-val">크리에이티브룸 (신관 2층)</span></div>
      </div>
      <label style="font-weight:600; font-size:0.75rem; color:var(--text-muted)">작성된 AI 회의록 요약본</label>
      <textarea id="minutes-editor-content" class="minutes-textarea" style="height:200px;">${appState.minutesDraft}</textarea>
      
      <label style="font-weight:600; font-size:0.75rem; color:var(--text-muted)">호스트/필수참가자 피드백 반영 사항 입력</label>
      <input type="text" id="minutes-feedback-input" class="minutes-textarea" style="min-height:40px; padding:8px 12px;" placeholder="예: '결정사항 3번에 예산 한도 검토율을 15%에서 10%로 한도 완화' 피드백을 추가하고 Action Item 기한 보정" />
    </div>
  `;
  const footer = `
    <button class="btn btn-secondary" id="min-modal-close">닫기</button>
    <button class="btn btn-primary" id="min-modal-submit">피드백 즉시 반영 및 최종 배포</button>
  `;
  
  openModal("AI 회의록 검토 및 피드백 최종 반영", body, footer);
  
  document.getElementById('min-modal-close').addEventListener('click', closeModal);
  document.getElementById('min-modal-submit').addEventListener('click', () => {
    const feedback = document.getElementById('minutes-feedback-input').value;
    const currentText = document.getElementById('minutes-editor-content').value;
    
    appState.minutesFeedback = feedback;
    closeModal();
    
    applyMinutesFeedbackAndDistribute(currentText, feedback);
  });
}

// 최종 피드백 반영 및 배포 로직
async function applyMinutesFeedbackAndDistribute(baseText, feedback) {
  const activeBadge = AgentActiveBadge;
  if (activeBadge) {
    activeBadge.textContent = "반영 처리 중...";
    activeBadge.className = "agent-status-badge status-writing";
  }

  showToast("AI 에이전트가 회의록 수정 중...", "info");
  await agenticEngine.runSteps(SCENARIOS.action_apply_feedback, appState);

  if (activeBadge) {
    activeBadge.textContent = "업무 완료";
    activeBadge.className = "agent-status-badge status-working";
  }
  
  let finalMinutesText = baseText;
  if (feedback) {
    finalMinutesText += `\n\n[호스트 및 필수참가자 검토 피드백 반영 완료]\n- 반영 의견: "${feedback}" (반영 일시: ${new Date().toLocaleDateString()})\n\n최종 배포본으로 확정되었습니다.`;
  }
  
  appState.minutesFinal = finalMinutesText;
  
  addChatMessage('agent', `🎉 **[최종 보고 - 피드백 반영 완료]**\n호스트 및 필수 참가자의 검토 의견을 수렴하여 최종 회의록 리비전을 완료했습니다.\n\n최종 확정된 회의록은 **호스트, 필수 참가자, 선택 참가자 전원**에게 이메일로 무사히 최종 공유되었습니다.`);
  
  // 이메일 발송
  const allParticipants = EMPLOYEES.filter(emp => emp.id !== 'emp_host' && (appState.participants[emp.id] === 'required' || appState.participants[emp.id] === 'optional'))
    .map(emp => `${emp.name} ${emp.pos}`)
    .join(', ');

  sendMail({
    subject: `[최종배포] ${appState.meetingName} 최종 회의록 배포`,
    from: "AI Meeting Assistant <agent@company.com>",
    to: allParticipants,
    body: `참석자 여러분 안녕하십니까.
  
  호스트 및 필수 참가자의 피드백을 충실히 검토·반영하여 완성된 [${appState.meetingName}]의 최종 확정 회의록을 배포해 드립니다.
  
  [최종 배포 회의록 정보]
  ${appState.minutesFinal}
  
  본 문서는 사내 아카이브에 영구 기록 및 저장되었습니다.
  
  감사합니다.
  AI Meeting Agent 드림`
  });

  showToast("최종 조율 회의록이 전원에게 정상 배송되었습니다.", "success");

  // 10단계 스테퍼 완료 표시
  appState.currentStep = 10;
  updateStepper();

  // 최종 시나리오 단계 종료
  ActionContainer.innerHTML = `
    <button class="btn btn-secondary" onclick="window.location.reload()">새 회의 조율 시작하기 (리셋)</button>
  `;
}

// ────────────────────────────────────────────────────────
// 11. HELPER AND SYSTEM EVENT HANDLERS
// ────────────────────────────────────────────────────────

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-wrapper');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  toast.innerHTML = `
    <span class="toast-indicator"></span>
    <span class="toast-message">${msg}</span>
  `;
  
  container.appendChild(toast);
  
  // 5초 후 자동 삭제
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

function setupEventListeners() {
  // 모의 대화 입력창 이벤트
  const input = document.getElementById('chat-user-input');
  const sendBtn = document.getElementById('chat-send-btn');
  
  const sendMessage = async () => {
    const text = input.value.trim();
    if (!text) return;
    
    addChatMessage('user', text);
    input.value = '';

    const activeBadge = AgentActiveBadge;
    if (activeBadge) {
      activeBadge.textContent = "생각 중...";
      activeBadge.className = "agent-status-badge status-writing";
    }

    let logs = [];
    let responseText = '';

    if (text.includes('일정') || text.includes('캘린더') || text.includes('스케줄') || text.includes('시간')) {
      logs = [
        { type: 'THOUGHT', text: `사용자가 일정/캘린더에 대한 문의를 보냄: "${text}". 현재 캘린더 상태 분석 개시.` },
        { type: 'ACTION', text: 'call_tool("read_active_calendar_columns")' },
        { type: 'OBSERVATION', text: `현재 활성화된 캘린더 열: ${EMPLOYEES.filter(e => appState.currentStep < 3 ? e.id === 'emp_host' : appState.participants[e.id] !== 'excluded').map(e => e.name).join(', ')}` },
        { type: 'THOUGHT', text: '일시 및 충돌 여부 파악.' },
        { type: 'OBSERVATION', text: `날짜: ${appState.selectedDate}, 시간: ${appState.selectedTimeStart}~${appState.selectedTimeEnd}, 충돌상태: ${appState.isCollision ? '충돌 있음' : '충돌 없음'}` },
        { type: 'OUTPUT', text: '캘린더 분석 결과를 정리하여 대화창에 답변합니다.' }
      ];
      responseText = `호스트님, 현재 설정된 회의 일시는 **${appState.selectedDate} ${appState.selectedTimeStart} ~ ${appState.selectedTimeEnd}**입니다. 
      현재 캘린더에는 ${appState.isCollision ? '🚨 **필수 참석자 간의 일정 충돌**이 표시되어 조율이 필요한 상태입니다. 중앙 캘린더에서 붉은 블록을 확인해 보세요.' : '✅ **충돌 없는 깨끗한 일정**으로 구성되어 있습니다.'}`;
    } else if (text.includes('회의실') || text.includes('공간') || text.includes('예약') || text.includes('자원')) {
      logs = [
        { type: 'THOUGHT', text: `사용자가 회의 공간/자원 상태 조회를 요구함: "${text}"` },
        { type: 'ACTION', text: 'call_tool("query_active_resource_state")' },
        { type: 'OBSERVATION', text: `회의 형태: ${appState.meetingType === 'offline' ? '대면' : '비대면'}, 선택 회의실: ${appState.selectedRoom || '없음'}, 화상 링크: ${appState.onlineLink || '없음'}` },
        { type: 'OUTPUT', text: '회의실 자원 정보를 대화창에 요약하여 답변합니다.' }
      ];
      if (appState.meetingType === 'offline') {
        const roomName = MEETING_ROOMS.find(r => r.id === appState.selectedRoom)?.name || '없음';
        responseText = `현재 대면 회의로 설정되어 있으며, **${roomName}**이 예약되어 있습니다. 다른 회의실로 변경하려면 중앙 패널 하단의 회의실 목록을 클릭하여 직접 자원을 교체하실 수 있습니다.`;
      } else {
        responseText = `현재 비대면 화상 회의로 설정되어 있으며, 생성된 Teams 링크는 **[${appState.onlineLink}](${appState.onlineLink})**입니다.`;
      }
    } else if (text.includes('직원') || text.includes('참석') || text.includes('인사') || text.includes('부서')) {
      logs = [
        { type: 'THOUGHT', text: `사용자가 사내 임직원 검색 및 참석자 자격에 대해 질문함: "${text}"` },
        { type: 'ACTION', text: 'call_tool("fetch_participant_roles")' },
        { type: 'OBSERVATION', text: `필수 참가자: ${EMPLOYEES.filter(e => appState.participants[e.id] === 'required').map(e => e.name).join(', ')} | 선택 참가자: ${EMPLOYEES.filter(e => appState.participants[e.id] === 'optional').map(e => e.name).join(', ') || '없음'}` },
        { type: 'OUTPUT', text: '참석자 배정 상태를 설명합니다.' }
      ];
      responseText = `현재 구성된 회의 참석자는 다음과 같습니다.
      - **필수 참가자**: ${EMPLOYEES.filter(e => appState.participants[e.id] === 'required').map(e => `${e.name} ${e.pos}(${e.dept})`).join(', ')}
      - **선택 참가자**: ${EMPLOYEES.filter(e => appState.participants[e.id] === 'optional').map(e => `${e.name} ${e.pos}`).join(', ') || '없음'}
      
      우측 '사내 인사시스템' 영역의 [필수/선택/제외] 버튼을 활용하여 실시간으로 참석자 역할을 재구성하실 수 있습니다.`;
    } else {
      logs = [
        { type: 'THOUGHT', text: `사용자의 자연어 메시지 해석 중: "${text}"` },
        { type: 'ACTION', text: 'call_tool("parse_intent", { text: text })' },
        { type: 'OBSERVATION', text: '매칭되는 정적 도구가 없음. 일반 대화 응답으로 폴백.' },
        { type: 'OUTPUT', text: '사용자에게 시나리오 도우미로서 응답합니다.' }
      ];
      responseText = `호스트님, 말씀하신 지시 사항을 검토했습니다. 본 시뮬레이터는 회의 조율의 자율적 흐름을 보여주는 에이전트 시스템입니다. 
      보다 명확한 시나리오 확인을 위해 **'하단의 현재 단계 추천 액션 버튼'**을 활용해 진행해 주시면, 제가 Thought-Action-Observation 추론 루프를 통해 완벽한 처리를 시각화하여 보여드리겠습니다!`;
    }

    await agenticEngine.runSteps(logs, appState);

    if (activeBadge) {
      activeBadge.textContent = "업무 완료";
      activeBadge.className = "agent-status-badge status-working";
    }

    addChatMessage('agent', responseText);
  };
  
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  
  // 리셋 버튼
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      window.location.reload();
    });
  }

  // 자율 모드(Auto-run) 토글
  const autoModeCheckbox = document.getElementById('auto-mode-checkbox');
  if (autoModeCheckbox) {
    autoModeCheckbox.addEventListener('change', (e) => {
      appState.autoMode = e.target.checked;
      showToast(
        appState.autoMode
          ? "자율 모드(Auto-run)가 활성화되었습니다. 에이전트가 추천 액션을 자동으로 실행합니다."
          : "반자율 모드(Human-in-the-loop)로 전환되었습니다.",
        "info"
      );
    });
  }

  // 탭 제어 이벤트 (텔레그램 / 메일함)
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      const tabTarget = e.currentTarget.getAttribute('data-tab');
      e.currentTarget.classList.add('active');

      const targetPane = document.getElementById(`tab-${tabTarget}`);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // 인사시스템 검색 버튼
  const searchTrigger = document.getElementById('search-trigger');
  if (searchTrigger) {
    searchTrigger.addEventListener('click', () => runOrgSearch());
  }
  if (OrgSearchInput) {
    OrgSearchInput.removeAttribute('readonly');
    OrgSearchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') runOrgSearch();
    });
  }
}

// 아코디언 토글 (캘린더 / 자원 예약 / 메신저)
function setupCollapsibles() {
  const pairs = [
    { headerId: 'cal-panel-header',  bodyId: 'cal-panel-body',         arrowId: 'cal-arrow' },
    { headerId: 'res-panel-header',  bodyId: 'resource-body-content',  arrowId: 'res-arrow' },
    { headerId: 'monitor-tabs-header', bodyId: 'monitor-panel-body',   arrowId: 'monitor-arrow' },
  ];
  pairs.forEach(({ headerId, bodyId, arrowId }) => {
    const header = document.getElementById(headerId);
    const body   = document.getElementById(bodyId);
    const arrow  = document.getElementById(arrowId);
    if (!header || !body) return;
    header.addEventListener('click', (e) => {
      if (e.target.closest('.tab-btn')) return; // 탭 버튼 클릭은 토글 제외
      const isCollapsed = body.classList.toggle('collapsed');
      if (arrow) arrow.textContent = isCollapsed ? '▼' : '▲';
    });
  });
}

// 수신 알림 토스트 (메신저/이메일)
function showInboxNotification(type) {
  const label = type === 'telegram' ? '메신저' : '이메일';
  const n = document.createElement('div');
  n.className = 'inbox-notification';
  n.innerHTML = `<span class="inbox-notif-icon">${type === 'telegram' ? '💬' : '📧'}</span> ${label} 수신되었습니다.`;
  n.addEventListener('click', () => {
    // 클릭 시 해당 패널 열기
    const body  = document.getElementById('monitor-panel-body');
    const arrow = document.getElementById('monitor-arrow');
    if (body?.classList.contains('collapsed')) {
      body.classList.remove('collapsed');
      if (arrow) arrow.textContent = '▲';
    }
    // 해당 탭 활성화
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    const tabId = type === 'telegram' ? 'telegram' : 'gmail';
    document.querySelector(`.tab-btn[data-tab="${tabId}"]`)?.classList.add('active');
    document.getElementById(`tab-${tabId}`)?.classList.add('active');
    n.remove();
  });
  document.body.appendChild(n);
  setTimeout(() => n.classList.add('show'), 50);
  setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 400); }, 5000);
}

// 좌측 패널 탭 전환 (조율 센터 ↔ 모니터링)
function setupLeftTabs() {
  document.querySelectorAll('.left-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.left-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.left-tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('left-tab-' + btn.dataset.leftTab)?.classList.add('active');
    });
  });
}

// 윈도우 초기 로딩 연동
window.addEventListener('DOMContentLoaded', () => { init(); setupCollapsibles(); setupLeftTabs(); });
