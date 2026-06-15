import { callAgentTool } from './tools.js';

// ────────────────────────────────────────────────────────
// 협업 에이전트 네트워크 정의
// ────────────────────────────────────────────────────────
export const AGENTS = {
  coordinator: { label: '회의 조율 에이전트', short: 'Coordinator', icon: '🧭' },
  resource: { label: '자원 예약 에이전트', short: 'Resource', icon: '🏢' },
  rsvp: { label: 'RSVP 관리 에이전트', short: 'RSVP', icon: '📨' },
  scribe: { label: '회의록 작성 에이전트', short: 'Scribe', icon: '📝' }
};

// ────────────────────────────────────────────────────────
// ReAct (Reasoning + Acting) 추론 엔진
// THOUGHT -> ACTION(도구 호출) -> OBSERVATION -> ... -> OUTPUT 루프를
// 콘솔에 실시간으로 렌더링하고, 협업 에이전트 위젯을 활성화한다.
// ────────────────────────────────────────────────────────
export class AgenticEngine {
  constructor() {
    this.consoleElement = null;
    this.onAgentActive = null; // (agentKey) => void
  }

  getConsole() {
    if (!this.consoleElement) {
      this.consoleElement = document.getElementById('agent-monologue-console');
    }
    return this.consoleElement;
  }

  clearConsole() {
    const el = this.getConsole();
    if (el) el.innerHTML = '';
  }

  addLog(type, text, agent = 'coordinator') {
    const el = this.getConsole();
    if (!el) return;

    const placeholder = el.querySelector('.console-placeholder');
    if (placeholder) placeholder.remove();

    const timeStr = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type.toLowerCase()} agent-${agent}`;

    let typeBadge = '';
    if (type === 'THOUGHT') typeBadge = '[THOUGHT]';
    else if (type === 'ACTION') typeBadge = '[ACTION]';
    else if (type === 'OBSERVATION') typeBadge = '[OBSERVATION]';
    else if (type === 'OUTPUT') typeBadge = '[SYSTEM OUTPUT]';

    const agentInfo = AGENTS[agent] || AGENTS.coordinator;
    const agentBadge = agent === 'coordinator'
      ? ''
      : `<span class="log-agent-tag">${agentInfo.icon} ${agentInfo.short}</span>`;

    logEntry.innerHTML = `
      <span class="log-time">${timeStr}</span>
      <span class="log-badge">${typeBadge}</span>${agentBadge}
      <span class="log-text">${text}</span>
    `;

    el.appendChild(logEntry);
    el.scrollTop = el.scrollHeight;

    if (this.onAgentActive) this.onAgentActive(agent);
  }

  // 시나리오 단계 배열(THOUGHT/ACTION/OBSERVATION/OUTPUT)을 순서대로 실행.
  // ACTION 단계는 실제 도구(tools.js)를 호출하여 그 결과를 OBSERVATION으로 기록한다.
  async runSteps(steps, appState) {
    this.clearConsole();

    for (const step of steps) {
      const agent = step.agent || 'coordinator';

      if (step.type === 'ACTION' && step.tool) {
        const args = typeof step.args === 'function' ? step.args(appState) : (step.args || {});
        this.addLog('ACTION', `call_tool("${step.tool}", ${JSON.stringify(args)})`, agent);
        await new Promise(resolve => setTimeout(resolve, step.delay || 500));

        const result = await callAgentTool(step.tool, args);
        if (step.onResult) step.onResult(result, appState);

        if (step.observation) {
          await new Promise(resolve => setTimeout(resolve, 250));
          this.addLog('OBSERVATION', step.observation(result, appState), agent);
        }
      } else {
        const text = typeof step.text === 'function' ? step.text(appState) : step.text;
        this.addLog(step.type, text, agent);
      }

      await new Promise(resolve => setTimeout(resolve, step.delay || 600));
    }

    if (this.onAgentActive) this.onAgentActive('coordinator');
  }
}
