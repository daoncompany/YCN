// 공지사항 — 구글 시트를 그대로 데이터 소스로 쓴다 (백엔드·API 키 없음)
//
// [ 시트 준비 방법 ]
// 1. 구글 시트를 만들고 1행에 아래 머리글을 그대로 입력한다.
//      제목 | 내용 | 작성일 | 팝업 | 시작일 | 종료일 | 첨부
//    - 작성일/시작일/종료일 : 2026-09-20 형식
//    - 팝업 : 메인에 띄울 공지만 Y (비워두면 목록에만 노출)
//    - 시작일/종료일 : 비워두면 기간 제한 없이 계속 노출
//    - 첨부 : 구글 드라이브 등에 올린 파일 주소. 여러 개면 세미콜론(;)으로 구분한다.
//            "안전관리 지침.pdf|https://..." 처럼 앞에 이름을 적으면 그 이름으로 표시된다.
//            드라이브 파일은 공유 설정을 '링크가 있는 모든 사용자'로 해야 방문자가 열 수 있다.
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

// 첨부 셀 → [{name, url}] . 이름을 안 적으면 '첨부파일'로 표시한다
function parseAttachments(cell) {
  if (!cell) return [];
  return cell.split(';').map(s => s.trim()).filter(Boolean).map(item => {
    const at = item.lastIndexOf('|');
    const name = at > -1 ? item.slice(0, at).trim() : '';
    const url = (at > -1 ? item.slice(at + 1) : item).trim();
    return { name: name || '첨부파일', url };
  }).filter(a => /^https?:\/\//.test(a.url));
}

// 첨부 목록 DOM. 링크 문자열은 시트에서 오므로 textContent/href 로만 넣는다
function attachmentList(cell) {
  const files = parseAttachments(cell);
  if (!files.length) return null;
  const ul = document.createElement('ul');
  ul.className = 'attach';
  files.forEach(f => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = f.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = f.name;
    li.appendChild(a);
    ul.appendChild(li);
  });
  return ul;
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
    const body = document.createElement('p');
    body.textContent = n.내용;
    cell.appendChild(body);
    const files = attachmentList(n.첨부);
    if (files) cell.appendChild(files);
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
    const popFiles = attachmentList(n.첨부);
    if (popFiles) dlg.querySelector('.pop-body').appendChild(popFiles);

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
  const at = parseAttachments('지침.pdf|https://a.com/x.pdf ; https://b.com/y.zip');
  console.assert(at.length === 2, '첨부 개수', at);
  console.assert(at[0].name === '지침.pdf' && at[0].url === 'https://a.com/x.pdf', '이름|링크', at[0]);
  console.assert(at[1].name === '첨부파일', '이름 생략', at[1]);
  console.assert(parseAttachments('javascript:alert(1)').length === 0, 'http 아닌 주소는 제외');
  console.assert(parseAttachments('').length === 0, '빈 첨부');
  console.log('notice selftest 완료');
}
if (location.search.includes('selftest')) noticeSelfTest();
