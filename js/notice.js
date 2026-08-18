// 공지사항 — 구글 시트를 그대로 데이터 소스로 쓴다 (백엔드·API 키 없음)
//
// [ 시트 준비 방법 ]
// 1. 구글 시트를 만들고 1행에 아래 머리글을 그대로 입력한다.
//      제목 | 내용 | 작성일 | 팝업 | 시작일 | 종료일
//    - 작성일/시작일/종료일 : 2026-09-20 형식
//    - 팝업 : 메인에 띄울 공지만 Y (비워두면 목록에만 노출)
//    - 시작일/종료일 : 비워두면 기간 제한 없이 계속 노출
// 2. 파일 > 공유 > 웹에 게시 > 해당 시트 선택, 형식은 '쉼표로 구분된 값(.csv)'
// 3. 나온 주소를 아래 NOTICE_CSV 에 붙여넣는다.
const NOTICE_CSV = '';   // 예: https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=0&single=true&output=csv

// ── CSV 파싱 (따옴표 안의 쉼표·줄바꿈까지 처리) ──────────────
function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; }
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// 머리글 이름으로 매핑해 둔다 — 시트 열 순서가 바뀌어도 깨지지 않게
function toRecords(rows) {
  if (!rows.length) return [];
  const head = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(r => r.some(c => c.trim()))
    .map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
}

const today = () => new Date().toLocaleDateString('sv-SE');   // YYYY-MM-DD

// 날짜 문자열은 YYYY-MM-DD 고정이라 문자열 비교로 충분하다
function inRange(rec, day) {
  if (rec.시작일 && day < rec.시작일) return false;
  if (rec.종료일 && day > rec.종료일) return false;
  return true;
}

async function loadNotices() {
  if (!NOTICE_CSV) return [];
  try {
    const res = await fetch(NOTICE_CSV);
    if (!res.ok) throw new Error(res.status);
    return toRecords(parseCSV(await res.text()));
  } catch (e) {
    console.warn('공지사항을 불러오지 못했습니다:', e);
    return [];
  }
}

// ── 목록 (notice.html) ─────────────────────────────────────
async function initNoticeList() {
  const tbody = document.querySelector('#notice-list');
  if (!tbody) return;

  const list = await loadNotices();
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty">등록된 게시물이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  list.forEach((n, i) => {
    const tr = document.createElement('tr');
    const no = document.createElement('td');
    no.textContent = list.length - i;
    const subject = document.createElement('td');
    subject.className = 'subject';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = n.제목;
    subject.appendChild(btn);
    const date = document.createElement('td');
    date.textContent = n.작성일;
    tr.append(no, subject, date);

    const detail = document.createElement('tr');
    detail.className = 'detail';
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.textContent = n.내용;
    detail.appendChild(cell);

    btn.onclick = () => detail.classList.toggle('on');
    tbody.append(tr, detail);
  });
}

// ── 메인 팝업 (index.html) ─────────────────────────────────
async function initNoticePopup() {
  if (!document.querySelector('.hero')) return;   // 메인에서만

  const day = today();
  const list = (await loadNotices())
    .filter(n => n.팝업.toUpperCase() === 'Y' && inRange(n, day));

  list.forEach(n => {
    const key = 'ycn-notice-' + n.작성일 + '-' + n.제목;
    if (localStorage.getItem(key) === day) return;   // 오늘 하루 보지 않기

    const dlg = document.createElement('dialog');
    dlg.className = 'pop-notice';
    dlg.innerHTML = '<div class="pop-head"><h3></h3><button data-close aria-label="닫기">×</button></div>'
      + '<div class="pop-body"></div>'
      + '<div class="pop-foot"><label><input type="checkbox"> 오늘 하루 보지 않기</label>'
      + '<button data-close class="btn">닫기</button></div>';
    dlg.querySelector('h3').textContent = n.제목;
    dlg.querySelector('.pop-body').textContent = n.내용;

    const skip = dlg.querySelector('.pop-foot input');
    dlg.querySelectorAll('[data-close]').forEach(b => b.onclick = () => {
      if (skip.checked) localStorage.setItem(key, day);
      dlg.close();
    });
    document.body.appendChild(dlg);
    dlg.showModal();
  });
}

// ── 자체 점검 : ?selftest=1 로 열면 콘솔에서 확인 ───────────
function noticeSelfTest() {
  const csv = '제목,내용,작성일,팝업\n"추석, 휴무","1줄\n2줄",2026-09-20,Y\n일반공지,본문,2026-08-01,\n';
  const recs = toRecords(parseCSV(csv));
  console.assert(recs.length === 2, '행 수', recs);
  console.assert(recs[0].제목 === '추석, 휴무', '따옴표 안 쉼표', recs[0]);
  console.assert(recs[0].내용 === '1줄\n2줄', '따옴표 안 줄바꿈', recs[0]);
  console.assert(recs[1].팝업 === '', '빈 칸', recs[1]);
  console.assert(inRange({ 시작일: '2026-01-01', 종료일: '2026-12-31' }, '2026-06-01'), '기간 안');
  console.assert(!inRange({ 시작일: '2026-07-01' }, '2026-06-01'), '시작 전');
  console.assert(!inRange({ 종료일: '2026-05-01' }, '2026-06-01'), '종료 후');
  console.assert(inRange({ 시작일: '', 종료일: '' }, '2026-06-01'), '기간 없음');
  console.log('notice selftest 완료');
}
if (location.search.includes('selftest')) noticeSelfTest();
