/* =========================================================
   🎀 완성 로그 서식 (변환 결과에 <style>로 같이 붙어요)
   ---------------------------------------------------------
   색·크기를 바꾸고 싶으면 맨 위 --변수만 고치면 돼요.
   cs- 로 시작 = 상태창 / cl- 로 시작 = 본문
   ========================================================= */
window.LOG_CSS = `
/* 😀 감정 칸 전용 기기 기본 이모지 (Mona12 자체 이모지 대신) — 이모지 유니코드만, 폰에만 있는 새 이모지까지 */
@font-face {
  font-family: "SysEmoji";
  src: local("Apple Color Emoji"), local("AppleColorEmoji"), local("Segoe UI Emoji"), local("SegoeUIEmoji"),
       local("Noto Color Emoji"), local("NotoColorEmoji"), local("Android Emoji"), local("Samsung Color Emoji"), local("SamsungColorEmoji");
  unicode-range: U+00A9, U+00AE, U+203C, U+2049, U+20E3, U+2122, U+2139, U+2194-2199, U+21A9-21AA, U+231A-231B, U+2328, U+23CF,
    U+23E9-23F3, U+23F8-23FA, U+24C2, U+25AA-25AB, U+25B6, U+25C0, U+25FB-25FE, U+2600-27BF, U+2934-2935, U+2B05-2B07,
    U+2B1B-2B1C, U+2B50, U+2B55, U+3030, U+303D, U+3297, U+3299, U+200D, U+FE0E-FE0F, U+1F000-1F02F, U+1F0A0-1F0FF,
    U+1F100-1F1FF, U+1F200-1F2FF, U+1F300-1F5FF, U+1F600-1F64F, U+1F650-1F67F, U+1F680-1F6FF, U+1F700-1F77F, U+1F780-1F7FF,
    U+1F800-1F8FF, U+1F900-1F9FF, U+1FA00-1FA6F, U+1FA70-1FAFF, U+1FB00-1FBFF, U+E0020-E007F;
}
.cl-log {
  --cl-ink: #333;          /* 대사 (진한 글씨) */
  --cl-narr: #777;         /* 지문 (연한 글씨) */
  --cl-thought: #888;      /* 속마음 */
  --cs-ink: #444;          /* 상태창 글씨 */
  --cs-accent: #a47d91;    /* 상태창 포인트 (제목) */
  --cs-line: #bebebe;      /* 상태창 테두리 */
  --cs-pink: #fdf7fa;
  --cs-blue: #f0f6fc;
  line-height: 1.8; word-break: keep-all; overflow-wrap: break-word;
}
.cl-log .text-emoji { display: inline-block !important; float: none !important; clear: none !important; height: 1.2em; width: auto; vertical-align: middle; margin: 0 2px; }

/* ---------- 에피소드 제목 ---------- */
.cl-title { text-align: center; font-size: 14px; letter-spacing: .15em; color: var(--cl-ink); margin: 0 auto 24px; padding: 6px 10px; max-width: 380px;
  border: 1px solid var(--cs-line); border-radius: 10px; background: var(--cs-pink);
  box-shadow: inset -3px -3px 0 rgba(184,184,184,.35), inset 3px 3px 0 #fff; }
.cl-title span { color: #e07fa3; }

/* ---------- 본문 ---------- */
.cl-talk, .cl-narr, .cl-thought-line { margin-bottom: 22px; clear: both; }
/* 양쪽 맞춤 + 글자 단위 줄바꿈 (띄어쓰기 구멍 방지) */
.cl-talk, .cl-narr, .cl-thought-line { text-align: justify; word-break: break-word; overflow-wrap: anywhere; }
.cl-talk { color: var(--cl-ink); }
.cl-narr { color: var(--cl-narr); }
.cl-thought { font-size: .88em; color: var(--cl-thought); }
.cl-img { text-align: center; margin: 16px 0 18px; clear: both; }
.cl-img img { display: inline-block; max-width: 100%; height: auto; margin: 0 !important; }
.cl-sep { margin: 30px 0; clear: both; }

/* ---------- 상태창 ---------- */
.cs-wrap { clear: both; padding: 10px 0 24px; }
.cs { width: 100%; max-width: 380px; margin: 0 auto; box-sizing: border-box; padding: 2px;
  border: 10px solid transparent; border-image: url('https://i.ibb.co/CKjD0HSw/borderhearts.png') 33 round;
  background-image: linear-gradient(rgba(255,255,255,.45), rgba(255,255,255,.45)), url('https://i.pinimg.com/736x/18/59/10/185910553644f1785972c67000a65f62.jpg');
  background-clip: padding-box; background-size: cover; background-position: center;
  font-size: 11px; line-height: 1.6; color: var(--cs-ink); word-break: keep-all; }
.cs * { box-sizing: border-box; }
.cs-in { padding: 8px; }
.cs-head { display: flex; justify-content: space-between; align-items: center; gap: 6px; border-bottom: 1px solid #e7d6dd; padding-bottom: 6px; margin-bottom: 8px; }
.cs-head-l { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.cs-slot { background: #bebebe; color: #fff; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
.cs-date { font-weight: bold; color: var(--cs-accent); font-size: 10px; }
.cs-weather { font-size: 13px; }
.cs-loc { font-size: 12px; font-weight: bold; text-align: center; margin-bottom: 8px;
  text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff; }

.cs-chips { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
.cs-chip-row { display: flex; justify-content: center; gap: 5px; flex-wrap: wrap; }
.cs-chip { background: #fff; color: #555; padding: 2px 8px; font-size: 10px; font-weight: bold;
  border: 1px solid var(--cs-line); border-radius: 10px;
  box-shadow: inset -2px -2px 0 rgba(180,160,170,.35), inset 2px 2px 0 #fff; }

.cs-mission { background: var(--cs-pink); border: 1px solid var(--cs-line); border-radius: 10px; padding: 7px 9px; text-align: justify;
  box-shadow: inset -3px -3px 0 rgba(180,160,170,.35), inset 3px 3px 0 #fff;
  text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff; }
.cs-mission-t { font-weight: bold; color: var(--cs-accent); font-size: 10px; margin-bottom: 2px; }
.cs-mission-d { font-weight: bold; }

.cs-hr { border: none; border-top: 1px dashed #d8b8c8; margin: 10px 0; }

.cs-members { display: flex; flex-direction: column; gap: 5px; }
.cs-card { background: #fff; border: 1px solid var(--cs-line); border-radius: 6px; padding: 5px 9px; }
.cs-card-top { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-bottom: 2px; }
.cs-name { font-weight: bold; font-size: 11.5px; margin-right: 2px; }
.cs-tag { font-family: 'SysEmoji', inherit; background: var(--cs-pink); border: 1px solid var(--cs-line); color: #444; padding: 0 5px; border-radius: 4px; font-size: 9.5px; }
.cs-act { color: #555; padding-left: 2px; }

.cs-announce { background: var(--cs-blue); border: 1px solid var(--cs-line); border-radius: 10px; padding: 8px 10px; font-weight: bold; text-align: justify; line-height: 1.5;
  box-shadow: inset -3px -3px 0 rgba(180,160,170,.35), inset 3px 3px 0 #fff;
  text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff; }

.cs-talk { margin-top: 8px; }
.cs-talk-who { font-size: 10px; color: #888; margin: 0 0 3px 4px; }
.cs-bubble { position: relative; display: inline-block; background: #fff; border: 1px solid var(--cs-line); border-radius: 10px; border-top-left-radius: 2px;
  padding: 5px 10px; box-shadow: 2px 2px 0 rgba(0,0,0,.08); }

.cs-note { text-align: center; color: #666; margin-top: 4px; }
.cs-qa { margin-top: 8px; background: #fff; border: 1px solid #b7d3e6; border-radius: 4px; overflow: hidden; }
.cs-qa-h { font-size: 9.5px; letter-spacing: .1em; color: #7fa7c2; background: var(--cs-blue); padding: 0 8px; }
.cs-qa-q, .cs-qa-a { padding: 3px 8px; }
.cs-qa-a { border-top: 1px dotted #ddd; }
.cs-qa b { font-weight: 400; color: #e58fae; }
.cs-qa-ko { color: #888; }

/* ---------- 📝 글에 보이는 메모 (편집 단계에서 넣기) ---------- */
.cl-memo { position: relative; max-width: 420px; margin: 8px auto 26px; padding: 10px 14px 10px; background: #fff6c9; border: 1px solid #eadb93;
  box-shadow: 2px 3px 0 rgba(0,0,0,.06); color: #666; font-size: .93em; line-height: 1.7; transform: rotate(-.6deg); clear: both; }
.cl-memo::before { content: "memo ♡"; display: block; font-size: 10px; letter-spacing: .1em; color: #b3a04a; margin-bottom: 2px; }
`;
