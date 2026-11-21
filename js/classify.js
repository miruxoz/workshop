/* =========================================================
   🔍 자동 분류 — 백업 명령어 v4 의 경계 표시 줄을 보고 메시지를 나눠요
   ---------------------------------------------------------
   📖 본편     : [ T66 | … ] 헤더로 시작          → 붙여넣기 칸에 남김
   🗑 요약본   : 🔸[ 로 시작 / 📋유저노트 / 💬세션명대사 → 지움
   📓 관찰일지 : 첫 줄(코드블록 표시 빼고)이 '관찰일지' · 바로 앞 내 메시지에 📔 또는 「세이 관찰일지」 → 관찰일지 서랍
   💬 OOC     : 그 밖의 AI 메시지 (바로 앞 내 메시지 = 요청문) → OOC 서랍
   본편에 쓴 내 메시지는 버려요
   ========================================================= */
const Classifier = (() => {
  const MARK = /^♡━+\s*(AI|ME)\s*━+♡\s*$/;
  const HEADER_RE = /^\[[^\]]*\|[^\]]*\|[^\]]*\]$/;

  const hasMarks = text => text.split('\n').some(l => MARK.test(l.trim()));

  function split(text) {
    const out = []; let cur = { who: 'PRE', lines: [] };
    text.replace(/\r\n?/g, '\n').split('\n').forEach(line => {
      const m = line.trim().match(MARK);
      if (m) { out.push(cur); cur = { who: m[1], lines: [] }; }
      else cur.lines.push(line);
    });
    out.push(cur);
    return out.map(m => ({ who: m.who, text: m.lines.join('\n').trim() })).filter(m => m.text);
  }

  // 관찰 일자: 2014년 2월 3일 → 2014.02.03
  function journalDate(text) {
    const m = text.match(/관찰\s*일자\s*[:：]\s*(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
    return m ? `${m[1]}.${m[2].padStart(2, '0')}.${m[3].padStart(2, '0')}` : '';
  }
  // [ T66 | 2014.02.03(월) | … ] → 2014.02.03
  function headerDate(text) {
    const m = text.match(/^\s*\[[^\]]*?(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/m);
    return m ? `${m[1]}.${m[2].padStart(2, '0')}.${m[3].padStart(2, '0')}` : '';
  }

  function run(text) {
    if (!hasMarks(text)) return null;
    const res = { main: [], journals: [], oocs: [], removed: 0, mainCount: 0 };
    let prevMe = '';
    split(text).forEach(m => {
      if (m.who === 'PRE') { res.main.push(m.text); return; }   // 표시 줄 앞에 원래 있던 글은 그대로
      if (m.who === 'ME') { prevMe = m.text; return; }
      const first = m.text.split('\n')[0].trim();
      // 코드블록(```) 줄은 건너뛴 진짜 첫 줄 (관찰일지는 코드블록 안에 오기도 해요)
      const firstReal = (m.text.split('\n').map(l => l.trim()).find(l => l && !/^```/.test(l)) || '');
      if (HEADER_RE.test(first)) { res.main.push(m.text); res.mainCount++; }
      else if (first.startsWith('🔸[') || m.text.includes('📋유저노트') || m.text.includes('💬세션명대사')) res.removed++;
      else if (/^(세이\s*)?관찰\s*일지/.test(firstReal) || prevMe.includes('📔') || /「세이 관찰일지」/.test(prevMe)) res.journals.push({ text: m.text, request: prevMe, storyDate: journalDate(m.text) });
      else res.oocs.push({ text: m.text, request: prevMe });
      prevMe = '';
    });
    return { ...res, main: res.main.join('\n\n') };
  }

  return { run, hasMarks, headerDate, journalDate };
})();
