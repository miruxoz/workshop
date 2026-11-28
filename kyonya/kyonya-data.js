/* =========================================================
   쿄냐통신 — kyonya-data.js
   ✏️ 글·문구는 전부 여기서만 고치면 돼요 (코드는 kyonya.js)
   ========================================================= */
var KY = {

  /* 티스토리 카테고리 이름 (블로그에 만든 이름과 똑같이) */
  CAT: {
    news:  'にゃにゃニュース',
    sub:   { sports:'スポーツ', ent:'エンター', life:'生活' },
    micro: 'ひとりごと'
  },
  /* 새 소식에 붙는 카테고리 딱지 [보여줄 이름, 색(p분홍/m민트/l보라/빈칸=하늘)] */
  CAT_LABEL: {
    'にゃにゃニュース': ['뉴스','l'],
    'ひとりごと':       ['한마디','p']
  },

  /* 헤더 상태 줄 */
  DDAY_START: '2026-03-27',          /* 쿄냐 1일째 날짜 (D+ 자동 계산) */
  ONLINE: [ ['<img class="text-emoji" src="https://i.imgur.com/Sp6HITL.gif" />','kyohei','방금'], ['<img class="text-emoji" src="https://i.imgur.com/qyDkStE.gif" />','sei','3분 전'] ],   /* 접속 중 목록 [아이콘, 아이디, 시간] */

  /* 흐르는 띠 */
  TICKER: '[갱신] 쿄냐통신 오픈! ♥ 쿄냐뉴스 개시 ♥ 방명록은 고객센터로 ♥ 세이 관찰 안경 절찬 판매 중 ',

  /* 갱신내역 (위가 최신) — new:true 면 NEW 딱지 */
  UPDATES: [
    { d:'11/22', t:'쿄냐통신 오픈!', new:true },
    { d:'11/22', t:'쿄냐뉴스·한마디 개시', new:true }
  ],

  /* 오늘의 알림 */
  NOTICE: { d:'2026.11.22', t:'오늘 세이는 평소보다 3% 더 귀엽습니다. 관찰 시 쿄헤이의 시선에 주의하세요.' },

  /* 인기 검색어 [검색어, 변동] — 변동: '▲2' / '-' / 'NEW' */
  HOT: [ ['세이 귀여움','▲2'], ['관찰일지','-'], ['쿄헤이 주접','NEW'], ['교환일기 벌칙','▲1'], ['블루윙스','-'] ],

  /* ---------- 가짜 로그인 ---------- */
  USERS: {
    kyohei: { name:'쿄헤이', av:'<img class="text-emoji" src="https://i.imgur.com/Sp6HITL.gif" />', grade:'👑 관리자', pt:9999, hint:'사쿠라바 쿄헤이 (관리자)',
      welcome:'관리자님 어서오세요 💕<br>오늘의 세이 자랑 글쓰기 할당량: 0/30',
      blog:'#soon', chatWith:'sei',
      mails:[ {from:'세이',sub:'ㅇ',date:'11/21',body:'ㅇ'},
              {from:'운영팀',sub:'[경고] 관찰일지 업로드 빈도가 너무 높습니다',date:'11/20',body:'관리자님, 하루 12회 업로드는 서버에 무리가 갑니다.<br>세이 사진 용량도 줄여 주세요.<br>그리고 공지사항에 세이 자랑 쓰지 마세요. 이번이 7번째 경고입니다.'} ] },
    sei: { name:'세이', av:'<img class="text-emoji" src="https://i.imgur.com/qyDkStE.gif" />', grade:'⭐ VIP 회원', pt:520, hint:'히비 세이 (VIP)',
      welcome:'세이님 접속을 확인했습니다.<br><small>(쿄헤이님에게 알림이 전송되었습니다)</small>',
      blog:'#soon', chatWith:'kyohei',
      mails:[ {from:'쿄헤이',sub:'세이야아아아 💕💕💕 연습 끝났어!!!!',date:'11/21',body:'세이야 🥺💕 나 방금 연습 끝났는데 오늘 블로킹 진짜 잘 됐거든?? 🏐✨ 근데 그거보다 중요한 거 있잖아… 오늘 아침에 세이가 내 후드티 입고 나간 거 🫠🫠🫠 나 그거 보고 하루 종일 집중 못 했어 진짜로 😭😭 감독님이 왜 웃냐고 했는데 세이 생각나서라고 할 수가 없었어 ㅠㅠㅠ 아무튼 편의점 들를 건데 뭐 먹고 싶어?? 푸딩? 푸딩이지?? 🍮🍮 두 개 살게!! 아니 세 개!!! 💕💕💕'},
              {from:'쿄헤이',sub:'ㅇ 이 무슨 뜻인지 3시간 고민함 🤔💭',date:'11/20',body:'세이야… ㅇ 은 좋다는 뜻이지?? 🥹 응의 줄임말이니까 YES 맞지?? 💕 나 팀원들한테 다 물어봤는데 다들 모른다고 해서 그냥 좋다는 뜻으로 해석하기로 했어!!! 🎉🎉 고마워 세이야 나도 좋아 💕💕💕💕💕'},
              {from:'쿄헤이',sub:'(자니…?) 🌙',date:'11/20',body:'자? 💤 안 자면 답장해 줘… 아니다 자면 푹 자 🥺🌙 세이 잘 자 사랑해 💕 내일 아침에 데리러 갈게!! 🚶‍♂️💨 아 그리고 오늘도 귀여웠어 (매일 하는 말이지만 매일 진심임) 💕💕'} ] },
    guest: { name:'손님', av:'<img class="text-emoji" src="https://mocha.crd.co/assets/images/gallery17/882c3fa6.gif?v=667e73fe" />', grade:'<img class="text-emoji" src="http://lh3.ggpht.com/_NZJzdRm10Y0/TUbe_zmFTKI/AAAAAAAAAek/N1LUyTKL98g/minivariados43.gif" /> 새싹회원', pt:10, hint:'놀러 온 손님용',
      welcome:'손님 환영합니다!<br>출석 포인트 10P 지급 ♡', blog:'#soon', chatWith:'kyohei',
      mails:[ {from:'운영팀',sub:'[쿄냐통신] 회원 가입을 환영합니다',date:'11/20',body:'쿄냐통신 회원이 되신 것을 환영합니다 ♡<br>가입 기념 포인트 10P가 지급되었습니다.<br>※ 쿄헤이 관련 문의는 받지 않습니다.'} ] }
  },
  /* 모두에게 오는 스팸 메일 */
  SPAM: [
    {from:'★당첨★',sub:'축하합니다!! 세이 무표정 해독기에 당첨되셨습니다',date:'11/21',body:'고객님은 쿄냐통신 100만 번째 방문자입니다!!<br>아래 링크를 눌러 경품을 받으세요 → <u>(링크 없음)</u><br><small>※ 쿄헤이는 경품이 아닙니다</small>'},
    {from:'쿄냐쇼핑',sub:'[광고] 쿄헤이 닮은꼴 인형 90% 세일 (오늘만)',date:'11/19',body:'키 192cm 실물 크기!<br>무표정 기능 탑재. 세이를 보면 굳는 기능은 별매입니다.<br><small>수신거부: 불가</small>'}
  ],
  /* 채팅 상대별 말투 [찾을 말, 답장] */
  CHAT: {
    kyohei: { name:'쿄헤이', av:'<img class="text-emoji" src="https://i.imgur.com/Sp6HITL.gif" />', hello:'세이!!!!! 💕💕 왔어?? 나 계속 기다리고 있었어 🥺✨',
      re:[ [/안녕|하이|ㅎㅇ/,'세이 안녕안녕 🥰💕 오늘도 귀여워 💕💕'],
           [/보고\s*싶/,'🥹🥹🥹 나도나도 진짜 너무 보고 싶어!!! 지금 갈게 기다려 🏃‍♂️💨💨 5분… 아니 3분!!!'],
           [/좋아|사랑/,'ㅠㅠㅠㅠㅠ 세이가 먼저 말해 줬어 😭💕 캡처했어 평생 간직할게 📸✨ 나도 사랑해 우주만큼 💕💕💕💕'],
           [/배고|밥|먹/,'배고파?? 🍚 뭐 먹고 싶어!! 다 사 갈게 🛒💕 푸딩도 사 갈게 당연히 🍮✨'],
           [/ㅋㅋ|ㅎㅎ/,'세이 웃었다… 🥹 오늘 하루 성공이다 진짜 🎉💕'],
           [/^ㅇ+$/,'ㅇ 받았다!!! 💕 이건 좋다는 뜻이지?? 그렇게 알게 🥰🥰'] ],
      def:['응응 💕 세이가 하는 말은 다 좋아 🥰','헉 그렇구나!! 🥺 더 얘기해 줘 세이야 💕💕','잠깐만 나 지금 세이 문자 보고 웃다가 감독님한테 혼남 ㅋㅋㅋ 😂💕','세이야 근데 오늘도 귀여운 거 알지?? 💕✨','알겠어!!! 🫡💕 세이 말이라면 뭐든지!!'] },
    sei: { name:'세이', av:'<img class="text-emoji" src="https://i.imgur.com/qyDkStE.gif" />', hello:'ㅇ',
      re:[ [/보고\s*싶/,'…딱히 나는 안 보고 싶은데. 오고 싶으면 오던가.'], [/좋아|사랑/,'알아. 그만 말해. (읽씹 안 함)'],
           [/배고|밥|먹/,'푸딩. 두 개.'], [/뭐\s*해/,'누워 있음'], [/귀여/,'시끄러.'] ],
      def:['ㅇ','ㅇㅇ','…바보.','알았으니까 연습이나 해.','ㅋ'] }
  },

    /* ✅ 투두 — ['할 일', 1] 이면 끝난 일(☑ + 취소선), 0 이면 아직 */
  TODO: [
    ['푸딩 칸 만들기', 1],
    ['메인 나누기', 1],
    ['박수 기능', 0],
    ['메일 크게!', 0],
    ['2ch 게시판', 0],
    ['쿄헤이 폰', 0]
  ],

  /* 한마디 글쓴이: 글 제목 앞에 [쿄헤이] / [세이] 를 붙이면 구분돼요 */
  MICRO_WHO: { '쿄헤이':'kyohei', '세이':'sei' },

  /* 투표 (지금은 깡통) */
  POLL: { q:'가장 멋진 동물은?', opts:[['<img class="text-emoji" src="https://graphic.neocities.org/barkbark.gif" /> 강아지',128],['<img class="text-emoji" src="https://mypillowfort.net/media5/tumblr_c3ae761030463c4b0d5a8014a1e19a8f_b164b3db_75.gif" /> 고양이',241],['<img class="text-emoji" src="https://i.imgur.com/Jr6FVxq.gif" /> 공룡',9]] },

  /* BGM — src에 mp3 주소를 넣으면 진짜 음악, 비워 두면 삑삑 소리 */
  BGM_LIST: [
    { title:'쿄냐통신 테마곡 (가제)', src:'', notes:'E5 G5 A5 G5 E5 C5 D5 E5 G5 E5 D5 C5 D5 E5 C5 -' },
    { title:'세이의 낮잠 왈츠',       src:'', notes:'C5 E5 G5 E5 F5 A5 C6 A5 G5 E5 C5 E5 D5 - C5 -' }
  ],

   // 🗓 달력 (2014 이야기 달력)
  //   글 제목 맨 앞에 【2/14】 처럼 이야기 날짜 → 그날에 스티커 (사이트 제목에선 자동으로 지워짐)
  CAL_FROM:[2014,2], CAL_TO:[2014,12],     // 넘길 수 있는 범위 [년,월]
  CAL_STK:{'にゃにゃニュース':'📰','ひとりごと':'💬','':'📝'},   // 카테고리별 스티커 ('' = 그 밖) · gif 주소 넣어도 돼요
  CAL_DAYS:{                                // 매년 같은 날 (월-일): [스티커, 말풍선 내용]
    '2-3':['👹','節分'], '2-14':['🍫','발렌타인'], '2-22':['🐱','猫の日'],
    '3-3':['🎎','ひな祭り'], '3-14':['🍬','화이트데이'], '12-25':['🎄','크리스마스']
  },
    // 🔢 방문자 카운터 숫자 gif (0~9 순서)
  CNT_DIGITS:['https://i.postimg.cc/XqMhGNk3/image.gif','https://i.postimg.cc/NF1n1hdG/1.gif','https://i.postimg.cc/7P7jv7wV/2.gif','https://i.postimg.cc/DfsRVsn9/3.gif','https://i.postimg.cc/HsgRTxLL/4.gif',
              'https://i.postimg.cc/HsgRTxLw/5.gif','https://i.postimg.cc/xT3782ky/6.gif','https://i.postimg.cc/dVQfTxdz/7.gif','https://i.postimg.cc/W1pyJHgb/8.gif','https://i.postimg.cc/cLDb7BBr/9.gif'],
  // 동글 버전:
  // CNT_DIGITS:['https://i.postimg.cc/zv57Yykr/image.gif','https://i.postimg.cc/rscj2D9K/1.gif','https://i.postimg.cc/wMVVq9Ws/2.gif','https://i.postimg.cc/J7cKcQRS/3.gif','https://i.postimg.cc/jqQvQhsN/4.gif',
  //             'https://i.postimg.cc/X7s8t7Gx/5.gif','https://i.postimg.cc/L6xTG6gS/6.gif','https://i.postimg.cc/zG3jNZTX/7.gif','https://i.postimg.cc/hthrnWV0/8.gif','https://i.postimg.cc/y85TYQTy/9.gif'],

  /* 패밀리 사이트 */
  FAMILY: [ ['🏪 쿄냐통신 분점 (러브로그)','https://luvlog.me/kyohei'], ['🧺 로그 공방','https://miruxoz.github.io/workshop/'] ],

    /* 👏 박수 — 구글 Apps Script 웹 앱 주소 (비어 있으면 내 브라우저에만 세요) */
  CLAP_URL: 'https://script.google.com/macros/s/AKfycbxqTGo27UvKbWEqvJlIish-jg2RYkKhboWZ3yC8t_IOqsgHzHHesdAR5FGWfWdnEl7laA/exec',

    // 🍡 오늘의 앙케이트 (선택지는 4개까지 추천)
  //   id: 새 투표를 올릴 때마다 바꾸기 (v1 → v2 …). 바꾸면 표가 0부터 다시 시작
  //   색: p 분홍 / y 노랑 / s 하늘 / l 라벤더 / m 민트 / '' 밀크티
  VOTE:{
    id:'v1',
    q:'최강의 동물은?',
    ops:[['<img class="text-emoji" src="https://i.postimg.cc/Bbnq0TxL/43.gif" /> 강아지','p'],['<img class="text-emoji" src="https://64.media.tumblr.com/7ee29b40fe742c08d0dad0d849ccf9c1/tumblr_inline_mjpodfeM7v1qz4rgp.gif" /> 고양이','y'],['<img class="text-emoji" src="https://i.postimg.cc/ryPJ2h97/57.gif" /> 토끼','s'],['<img class="text-emoji" src="https://i.postimg.cc/2634VHLk/5.gif"/> 공룡','']]
  },
  
};

/* ---------- preview.html 에서만 쓰는 가짜 글 (티스토리에서는 진짜 글을 불러와요) ---------- */
KY.DEMO_RSS = [
  { title:'[쿄냐스포츠] [속보] 쿄헤이, 세이 자랑 3시간째…팀원들 "제발 연습 좀"', cat:'にゃにゃニュース/スポーツ', ago:33, img:'' },
  { title:'[세이리포트] \'귀여움 주의보\' 히비 세이, 오늘도 무표정으로 간식 받아…목격담 속출', cat:'にゃにゃニュース/エンター', ago:60 },
  { title:'[세이리포트] 세이, 쿄헤이 문자에 "ㅇ" 한 글자 답장…해석 분분', cat:'にゃにゃニュース/エンター', ago:120 },
  { title:'[블루윙스일보] 블루윙스 회식 현장…세이 옆자리 쟁탈전 \'치열\'', cat:'にゃにゃニュース/スポーツ', ago:200 },
  { title:'[쿄냐경제] \'가계부 적자\' 쿄헤이, 세이 간식비가 원인?', cat:'にゃにゃニュース/生活', ago:300 },
  { title:'[2ch발] "교환일기 벌칙은 꼭" 쿄냐 커플 룰 공개', cat:'にゃにゃニュース/生活', ago:600 },
  { title:'[쿄냐기상청] [날씨] 내일 쿄냐 지역 맑음…데이트 지수 ★★★★', cat:'にゃにゃニュース/生活', ago:900 },
  { title:'쿄헤이가 또 내 후드티 입고 나갔다. 소매가 손을 다 덮는다고 좋아하던데 그거 원래 내 거거든.', cat:'ひとりごと', ago:80, img:'https://i.imgur.com/ZKogrD1.gif' },
  { title:'푸딩 맛있었다', cat:'ひとりごと', ago:150, img:'https://i.imgur.com/XU8WpKV.gif' },
  { title:'동물 다큐 보다가 잠들었다. 펭귄 나오는 데까지 기억남.', cat:'ひとりごと', ago:400, img:'https://i.imgur.com/PXL2Pvp.gif' }
];
