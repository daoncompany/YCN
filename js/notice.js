// 공지사항 — 구글 시트를 그대로 데이터 소스로 쓴다 (백엔드·API 키 없음)
//
// [ 시트 준비 방법 ]
// 1. 구글 시트 1행에 아래 머리글을 그대로 둔다.
//      제목 | 내용 | 작성일 | 작성자 | 팝업 | 시작일 | 종료일 | 이미지 | 첨부
//    - 작성일/시작일/종료일 : 2026-09-20 형식
//    - 팝업 : 메인에 띄울 공지만 Y (비워두면 목록에만 노출)
//    - 시작일/종료일 : 비워두면 기간 제한 없이 계속 노출
//    - 이미지 : 본문에 함께 보여줄 이미지 주소. 여러 개면 세미콜론(;)으로 구분한다.
//    - 첨부 : 내려받을 파일 주소. 여러 개면 세미콜론(;)으로 구분한다.
//            "안전관리 지침.pdf|https://..." 처럼 앞에 이름을 적으면 그 이름으로 표시된다.
//            드라이브 파일은 공유 설정을 '링크가 있는 모든 사용자'로 해야 방문자가 열 수 있다.
// 2. 공유 설정을 '링크가 있는 모든 사용자 - 뷰어' 로 둔다. (웹에 게시는 하지 않아도 된다)
// 3. 시트 주소의 문서 ID 부분만 아래에 넣는다.
const SHEET_ID = '1ST7W5gHOVJ5cD_2IdonuZmkpidpP-StXhhP6FHxy_V8';
const NOTICE_CSV = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

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
  return cell.split(/[;\n]/).map(s => s.trim()).filter(Boolean).map(item => {
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

// 시트 날짜 셀 → YYYY-MM-DD . 서식이 날짜형이면 로케일 표기로 나오기도 해서 한 번 정규화한다
function normalizeDate(v) {
  if (!v) return '';
  const t = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^Date\((\d+),(\d+),(\d+)/);      // gviz 날짜형 표기
  if (m) return `${m[1]}-${String(+m[2] + 1).padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const n = t.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/); // 2026. 9. 20 / 2026/9/20
  if (n) return `${n[1]}-${n[2].padStart(2, '0')}-${n[3].padStart(2, '0')}`;
  return t;
}

// 드라이브 파일 ID 추출 (uc?id= / file/d/ / thumbnail?id= / lh3 형식 모두)
function driveFileId(url) {
  const m = String(url).match(/(?:drive\.google\.com\/(?:uc\?(?:[^#]*&)?id=|file\/d\/|thumbnail\?(?:[^#]*&)?id=)|lh3\.googleusercontent\.com\/d\/)([-\w]{10,})/);
  return m ? m[1] : '';
}

// 드라이브 주소는 <img> 로 직접 안 뜨므로(uc?export=view 는 차단됨) 원본을 주는 형식으로 바꾼다
function imageSrc(url) {
  const id = driveFileId(url);
  return id ? 'https://lh3.googleusercontent.com/d/' + id : url;
}

// 이미지 목록 DOM
function imageList(cell) {
  const files = parseAttachments(cell);
  if (!files.length) return null;
  const box = document.createElement('div');
  box.className = 'notice-img';
  files.forEach(f => {
    const img = document.createElement('img');
    img.src = imageSrc(f.url);
    img.alt = f.name === '첨부파일' ? '' : f.name;
    // 상세는 클릭해야 열리므로 lazy 로 미루면 펼친 직후 빈 공간이 생긴다
    box.appendChild(img);
  });
  return box;
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
    const list = toRecords(parseCSV(await res.text()));
    list.forEach(n => {
      n.작성일 = normalizeDate(n.작성일);
      n.시작일 = normalizeDate(n.시작일);
      n.종료일 = normalizeDate(n.종료일);
    });
    return list;
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
    tbody.innerHTML = '<tr><td colspan="4" class="empty">등록된 게시물이 없습니다.</td></tr>';
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
    const writer = document.createElement('td');
    writer.className = 'writer';
    writer.textContent = n.작성자 || 'YCN';
    const date = document.createElement('td');
    date.textContent = n.작성일;
    tr.append(no, subject, writer, date);

    const detail = document.createElement('tr');
    detail.className = 'detail';
    const cell = document.createElement('td');
    cell.colSpan = 4;
    const body = document.createElement('p');
    body.textContent = n.내용;
    cell.appendChild(body);
    const pics = imageList(n.이미지);
    if (pics) cell.appendChild(pics);
    const files = attachmentList(n.첨부);
    if (files) cell.appendChild(files);
    detail.appendChild(cell);

    btn.onclick = () => detail.classList.toggle('on');
    tbody.append(tr, detail);
  });
}

// ── 메인 팝업 (index.html) ─────────────────────────────────
// 공지 하나를 <dialog> 로 만든다. 아직 열지는 않는다.
// onDone 은 닫힌 뒤 다음 공지를 띄우는 콜백 (close 이벤트가 안 오는 브라우저가 있어 직접 호출한다)
function buildNoticeDialog(n, day, key, onDone) {
  const dlg = document.createElement('dialog');
  dlg.className = 'pop-notice';
  dlg.innerHTML = '<div class="pop-head"><h3></h3><button data-close aria-label="닫기">×</button></div>'
    + '<div class="pop-body"></div>'
    + '<div class="pop-foot"><label><input type="checkbox"> 오늘 하루 보지 않기</label>'
    + '<button data-close class="btn">닫기</button></div>';
  dlg.querySelector('h3').textContent = n.제목;
  const body = dlg.querySelector('.pop-body');
  body.textContent = n.내용;

  const pics = imageList(n.이미지);
  if (pics) { body.appendChild(pics); dlg.classList.add('has-img'); }
  const files = attachmentList(n.첨부);
  if (files) body.appendChild(files);

  const skip = dlg.querySelector('.pop-foot input');
  const done = () => {
    if (skip.checked) localStorage.setItem(key, day);
    dlg.close();
    onDone();
  };
  dlg.querySelectorAll('[data-close]').forEach(b => b.onclick = done);
  dlg.addEventListener('cancel', e => { e.preventDefault(); done(); });   // ESC
  return dlg;
}

async function initNoticePopup() {
  if (!document.querySelector('.hero')) return;   // 메인에서만

  const day = today();
  const day_ = day;
  const list = (await loadNotices())
    .filter(n => n.팝업.toUpperCase() === 'Y' && inRange(n, day_))
    .filter(n => localStorage.getItem('ycn-notice-' + n.작성일 + '-' + n.제목) !== day_);

  // 여러 건이면 겹쳐 쌓지 않고 하나 닫을 때마다 다음 것을 띄운다
  let i = 0;
  const queue = [];
  const showNext = () => { if (i < queue.length) queue[i++].showModal(); };

  list.forEach(n => {
    const dlg = buildNoticeDialog(n, day_, 'ycn-notice-' + n.작성일 + '-' + n.제목, showNext);
    document.body.appendChild(dlg);
    queue.push(dlg);
  });
  showNext();
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
  console.assert(normalizeDate('2026-09-20') === '2026-09-20', '이미 정규형');
  console.assert(normalizeDate('2026. 9. 20') === '2026-09-20', '로케일 표기');
  console.assert(normalizeDate('2026/9/5') === '2026-09-05', '슬래시 표기');
  console.assert(normalizeDate('Date(2026,8,20)') === '2026-09-20', 'gviz 날짜형');
  console.assert(normalizeDate('') === '', '빈 날짜');
  console.assert(parseAttachments('https://a.com/1.png\nhttps://a.com/2.png').length === 2, '줄바꿈 구분');
  console.log('notice selftest 완료');
}
if (location.search.includes('selftest')) noticeSelfTest();
