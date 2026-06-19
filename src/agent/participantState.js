// 양방향 참석자 역할 공유 상태
// BroadcastChannel 으로 메인앱 ↔ 검색 페이지 실시간 동기화

const STORAGE_KEY = 'ai_meeting_participants';
const CHANNEL_NAME = 'meeting-coordinator';

let bc = null;
try { bc = new BroadcastChannel(CHANNEL_NAME); } catch { /* no-op */ }

export function loadParticipants() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveParticipants(participants) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
  bc?.postMessage({ type: 'participants_updated', participants });
}

export function onParticipantsChanged(callback) {
  bc?.addEventListener('message', e => {
    if (e.data?.type === 'participants_updated') callback(e.data.participants);
  });
}
