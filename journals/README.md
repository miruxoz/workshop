# 📔 관찰일지 틀 (journals 폴더)

이 폴더에 html 파일을 넣으면 `journal.html`(📔 일지)의 틀 선택지에 떠요. (🔄 누르면 다시 읽어요)

## 파일 모양
```html
<!-- name: 선택지 이름 -->
<script type="application/json" class="tpl-data"> { 칸마다 색·아이콘 표 } </script>
<div class="sjn"> … {{빈칸}} … </div>
<style> … </style>
```

## AI 글 양식 → 빈칸
| AI 글 | 빈칸 |
|---|---|
| `날짜: 2014.09.28` | `{{date.y}}` `{{date.m}}` `{{date.d}}`(28) `{{date.wday}}`(日) `{{date.dot}}`(2014.09.28) `{{date.mmdd}}`(0928) `{{date.mNum}}` `{{date.dNum}}` |
| `번호: 02` (없으면 01) | `{{no}}` |
| `[프로필]` 이름: 한글 \| 후리가나 · 칭호 · 보호자: 이름 \| 연락처 · 특기 · 약점 · 좋아 · 싫어 · 한마디 | `{{p.name}}` `{{p.kana}}` `{{p.title}}` `{{p.guard}}` `{{p.contact}}` `{{#p.skill}}{{num}} {{text}}{{/p.skill}}` (weak·like·dislike 도 같은 모양) `{{p.say}}` |
| `[스테이터스]` 이름: 숫자 \| 코멘트 | `{{#status}} {{label}} {{val}} {{cmt}} {{/status}}` + tpl-data 의 pb·c·fill·icon |
| `[오늘의 세이]` 이름: 내용 | `{{#today}} {{label}} {{text}} {{/today}}` |
| `[관찰 기록]` `# 제목 \| 시간` + 본문 | `{{#memos}} {{title}} {{time}} {{body}} {{n}} {{nn}} {{prev}} {{next}} {{first}} {{#dots}}{{on}}{{/dots}} {{/memos}}` |
| `[새로 알게 된 점]` 항목: 설명 | `{{#wiki.found}} {{k}} {{v}} {{/wiki.found}}` · 번호 `{{wiki.nFound}}` |
| `[선택지]` 행동 \| 반응 \| ◎△× | `{{#wiki.choice}} {{act}} {{res}} {{cls}}(o·m·x) {{mark}} {{word}} {{/wiki.choice}}` · `{{wiki.nChoice}}` |
| `[주변 반응]` 이름: 반응 | `{{#wiki.around}} {{k}} {{v}} {{/wiki.around}}` · `{{wiki.nAround}}` · 목차 `{{#wiki.toc}}{{n}} {{name}}{{/wiki.toc}}` |
| `[어록]` 말: 대사 \| 시간 · 답장: 속마음 | `{{#quote.say}} {{text}} {{time}} {{/quote.say}}` `{{quote.reply}}` |
| `[세이어 사전]` 단어: 뜻 | `{{#dict}} {{word}} {{mean}} {{/dict}}` |
| `[이상 증세]` 증상·수술·검사 (보기 중 하나) / 병명·심박수·진단 | `{{#karte.rows}} {{label}} {{#opts}}{{text}} {{on}}{{/opts}} {{/karte.rows}}` `{{#karte.lines}} {{label}} {{text}} {{/karte.lines}}` |
| `[다음 관찰 계획]` · `[총평]` | `{{plan}}` `{{review}}` |

- 칸이 있는지: `{{#has.profile}}` `has.status` `has.today` `has.ss` `has.memos` `has.wiki` `has.found` `has.choice` `has.around` `has.quote` `has.dict` `has.lab` `has.karte` `has.card`
- 라디오 이름이 겹치지 않게 `{{uid}}` 를 쓰세요 (일지마다 달라요)
- 글 속 `==형광펜==` → `<mark>`, `~~취소선~~` → `<del>`
- `{{#이름}}…{{/이름}}` 안에 **같은 이름**을 또 열면 안 돼요 (그래서 바깥은 `has.○○` 로 감싸요)
