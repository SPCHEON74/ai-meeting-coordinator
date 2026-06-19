// 공용 키워드 추출 & 직원 추천 유틸리티
// main.js 와 search.js 가 공유하는 순수 함수 모음

export function tokenize(text) {
  return [...new Set(text.match(/[가-힣]{2,}|[A-Za-z]{2,}/g) ?? [])];
}

export function scoreEmployee(emp, tokens) {
  const target = `${emp.dept} ${emp.duty} ${(emp.tags ?? []).join(' ')}`;
  const matched = [...new Set(tokens.filter(t => target.includes(t)))];
  return { score: matched.length, matched };
}

// employees 배열과 자유 텍스트를 받아 scoreMap 반환
// scoreMap: { [empId]: { score, matched[] } }
export function buildScoreMap(employees, text) {
  const tokens = tokenize(text);
  if (!tokens.length) return { tokens: [], scoreMap: {} };

  const scoreMap = {};
  employees
    .filter(e => e.id !== 'emp_host')
    .forEach(emp => {
      const r = scoreEmployee(emp, tokens);
      if (r.score > 0) scoreMap[emp.id] = r;
    });

  return { tokens, scoreMap };
}

// 텍스트로 직원 추천 목록을 점수 내림차순으로 반환 (search.js / main.js 공용)
export function recommendEmployees(employees, text, hostId = 'emp_host') {
  const tokens = tokenize(text);
  if (!tokens.length) return { tokens: [], results: [] };
  const results = employees
    .filter(e => e.id !== hostId)
    .map(emp => ({ emp, ...scoreEmployee(emp, tokens) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
  return { tokens, results };
}
