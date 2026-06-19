import { EMPLOYEES } from './agent/tools.js';
import { recommendEmployees } from './agent/recommend.js';
import { loadParticipants, saveParticipants, onParticipantsChanged } from './agent/participantState.js';

// ── 참석자 역할 상태 ─────────────────────────────────────
// 외부(메인앱)에서 온 값 우선, 없으면 'excluded' 기본값
let roles = loadParticipants() ?? {};

function getRole(id) {
  return roles[id] ?? 'excluded';
}

function setRole(empId, newRole) {
  roles = { ...roles, [empId]: newRole };
  saveParticipants(roles);
  rerenderResults();
  rerenderTable();
  showSyncToast(empId, newRole);
}

function showSyncToast(empId, role) {
  const emp = EMPLOYEES.find(e => e.id === empId);
  if (!emp) return;
  const label = role === 'required' ? '필수 참가자' : role === 'optional' ? '선택 참가자' : '제외';
  const t = document.createElement('div');
  t.className = 'sync-toast';
  t.textContent = `${emp.name} → ${label} ↗ 메인앱 반영`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

// ── 추천 엔진 ────────────────────────────────────────────
function recommend(title, agenda) {
  return recommendEmployees(EMPLOYEES, `${title} ${agenda}`);
}

// ── 마지막 검색 결과 캐시 (역할 변경 후 재렌더 용) ───────
let cachedResults = [];

// ── DOM refs ──────────────────────────────────────────────
const titleEl   = document.getElementById('inp-title');
const agendaEl  = document.getElementById('inp-agenda');
const btnSearch = document.getElementById('btn-search');
const btnClear  = document.getElementById('btn-clear');
const tokensEl  = document.getElementById('tokens');
const resultEl  = document.getElementById('results');
const emptyEl   = document.getElementById('empty');
const countEl   = document.getElementById('result-count');
const tableBody = document.getElementById('all-table-body');

// ── 역할 버튼 HTML 생성 ───────────────────────────────────
const POS_COLOR = {
  '팀장': '#f78166', '차장': '#ffa657', '과장': '#58a6ff',
  '선임': '#3fb950', '수석': '#3fb950', '대리': '#d2a8ff', '주임': '#8b949e',
};

function roleButtons(empId) {
  const cur = getRole(empId);
  return `
    <div class="card-roles" data-emp-id="${empId}">
      <button class="role-btn ${cur === 'required' ? 'role-required' : ''}" data-role="required" data-id="${empId}">필수</button>
      <button class="role-btn ${cur === 'optional' ? 'role-optional' : ''}" data-role="optional" data-id="${empId}">선택</button>
      <button class="role-btn ${cur === 'excluded' ? 'role-excluded' : ''}" data-role="excluded" data-id="${empId}">제외</button>
    </div>`;
}

function roleBadge(empId) {
  const r = getRole(empId);
  const label = r === 'required' ? '필수' : r === 'optional' ? '선택' : '제외';
  const cls   = r === 'required' ? 'badge-required' : r === 'optional' ? 'badge-optional' : 'badge-excluded';
  return `<span class="role-badge ${cls}">${label}</span>`;
}

// ── 카드 렌더 ─────────────────────────────────────────────
function renderCard(r, rank) {
  const matchBadges = r.matched.map(m => `<span class="match-badge">${m}</span>`).join('');
  const posColor = POS_COLOR[r.emp.pos] ?? '#8b949e';
  const rankLabel = rank <= 3 ? `★ ${rank}순위` : `${rank}순위`;
  return `
    <div class="result-card" data-score="${r.score}">
      <div class="card-rank">${rankLabel}</div>
      <div class="card-header">
        <div class="card-avatar">${r.emp.name[0]}</div>
        <div class="card-info">
          <div class="card-name">${r.emp.name} ${roleBadge(r.emp.id)}</div>
          <div class="card-meta">
            <span class="card-dept">${r.emp.dept}</span>
            <span class="card-pos" style="color:${posColor}">${r.emp.pos}</span>
          </div>
        </div>
        <div class="card-score">
          <div class="score-num">${r.score}</div>
          <div class="score-label">매칭점수</div>
        </div>
      </div>
      <div class="card-duty">${r.emp.duty}</div>
      <div class="card-matches">매칭 키워드: ${matchBadges}</div>
      ${roleButtons(r.emp.id)}
    </div>`;
}

// ── 토큰 렌더 ─────────────────────────────────────────────
function renderTokens(tokens) {
  tokensEl.innerHTML = tokens.length
    ? tokens.map(t => `<span class="token">${t}</span>`).join('')
    : '<span class="token-empty">안건을 입력하면 추출된 키워드가 표시됩니다</span>';
}

// ── 결과 렌더 ─────────────────────────────────────────────
function renderResults(results) {
  if (!results.length) {
    resultEl.innerHTML = '';
    emptyEl.hidden = false;
    countEl.textContent = '0명';
    return;
  }
  emptyEl.hidden = true;
  countEl.textContent = `${results.length}명 추천됨`;
  resultEl.innerHTML = results.map((r, i) => renderCard(r, i + 1)).join('');
}

function rerenderResults() {
  if (cachedResults.length) renderResults(cachedResults);
}

// ── 전체 직원 테이블 렌더 ────────────────────────────────
function rerenderTable() {
  const list = EMPLOYEES.filter(e => e.id !== 'emp_host');
  tableBody.innerHTML = list.map(e => {
    const posColor = POS_COLOR[e.pos] ?? '#8b949e';
    return `<tr>
      <td><span class="table-name">${e.name}</span></td>
      <td>${e.dept}</td>
      <td style="color:${posColor}">${e.pos}</td>
      <td class="duty-cell">${e.duty}</td>
      <td>${(e.tags ?? []).map(t => `<span class="tag-chip">${t}</span>`).join('')}</td>
      <td>${roleButtons(e.id)}</td>
    </tr>`;
  }).join('');
}

// ── 검색 실행 ─────────────────────────────────────────────
function run() {
  const { tokens, results } = recommend(titleEl.value.trim(), agendaEl.value.trim());
  cachedResults = results;
  renderTokens(tokens);
  renderResults(results);
}

function clear() {
  titleEl.value = '';
  agendaEl.value = '';
  cachedResults = [];
  renderTokens([]);
  resultEl.innerHTML = '';
  emptyEl.hidden = false;
  countEl.textContent = '0명';
}

// ── 이벤트 ───────────────────────────────────────────────
btnSearch.addEventListener('click', run);
btnClear.addEventListener('click', clear);
[titleEl, agendaEl].forEach(el =>
  el.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run(); })
);

// 역할 버튼 — 이벤트 위임 (결과 + 테이블 공통)
function handleRoleClick(e) {
  const btn = e.target.closest('[data-role][data-id]');
  if (!btn) return;
  setRole(btn.dataset.id, btn.dataset.role);
}
resultEl.addEventListener('click', handleRoleClick);
tableBody.addEventListener('click', handleRoleClick);

// 예시 버튼
document.querySelectorAll('[data-title]').forEach(btn =>
  btn.addEventListener('click', () => {
    titleEl.value  = btn.dataset.title;
    agendaEl.value = btn.dataset.agenda;
  })
);

// 탭 전환
document.querySelectorAll('.tab-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
  })
);

// ── 메인앱에서 온 변경 수신 ──────────────────────────────
onParticipantsChanged(newRoles => {
  roles = newRoles;
  rerenderResults();
  rerenderTable();
});

// ── 초기 렌더 ────────────────────────────────────────────
renderTokens([]);
rerenderTable();
