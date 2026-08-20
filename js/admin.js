const NOTICE_API = 'https://script.google.com/macros/s/AKfycbyWE6Ngwwyfi0jVJylSDeNSiwXkMultR9mkRA5gBNrAV82jhj70YUwVIRH0s33N9hd3rQ/exec';

const MAX_FILE_MB = 8;

function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error(file.name + ' 읽기 실패'));
    r.onload = () => resolve({
      name: file.name,
      type: file.type,
      data: String(r.result).split(',')[1]
    });
    r.readAsDataURL(file);
  });
}

function oversized(files, maxMB = MAX_FILE_MB) {
  return [...files].filter(f => f.size > maxMB * 1024 * 1024).map(f => f.name);
}

function initAdminForm() {
  const form = document.querySelector('#notice-form');
  if (!form) return;

  const msg = form.querySelector('#w-msg');
  const submit = form.querySelector('#w-submit');
  const popup = form.querySelector('#w-popup');
  const range = form.querySelector('#popup-range');
  const date = form.querySelector('#w-date');

  date.value = new Date().toLocaleDateString('sv-SE');
  popup.onchange = () => { range.hidden = !popup.checked; };

  const say = (text, kind) => { msg.textContent = text; msg.className = 'form-msg ' + (kind || ''); };

  form.onsubmit = async e => {
    e.preventDefault();
    if (!NOTICE_API) { say('전송 주소(NOTICE_API)가 아직 설정되지 않았습니다.', 'err'); return; }

    const images = form.querySelector('#w-images').files;
    const files = form.querySelector('#w-files').files;
    const tooBig = [...oversized(images), ...oversized(files)];
    if (tooBig.length) { say(`${MAX_FILE_MB}MB를 넘는 파일이 있습니다: ${tooBig.join(', ')}`, 'err'); return; }

    submit.disabled = true;
    say('등록 중입니다…');

    try {
      const payload = {
        password: form.querySelector('#w-pw').value,
        제목: form.querySelector('#w-title').value.trim(),
        내용: form.querySelector('#w-body').value,
        작성일: date.value,
        작성자: form.querySelector('#w-writer').value,
        팝업: popup.checked ? 'Y' : '',
        시작일: popup.checked ? form.querySelector('#w-start').value : '',
        종료일: popup.checked ? form.querySelector('#w-end').value : '',
        images: await Promise.all([...images].map(readFile)),
        files: await Promise.all([...files].map(readFile))
      };

      const res = await fetch(NOTICE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const out = await res.json();

      if (!out.ok) throw new Error(out.error || '등록에 실패했습니다.');
      say('등록되었습니다. 공지사항 목록에서 확인하세요.', 'ok');
      form.reset();
      date.value = new Date().toLocaleDateString('sv-SE');
      range.hidden = true;
    } catch (err) {
      say('등록에 실패했습니다: ' + err.message, 'err');
    } finally {
      submit.disabled = false;
    }
  };
}

function adminSelfTest() {
  const big = { name: 'big.zip', size: 9 * 1024 * 1024 };
  const ok = { name: 'ok.png', size: 1024 };
  console.assert(oversized([big, ok]).length === 1, '초과 파일 검출');
  console.assert(oversized([big, ok])[0] === 'big.zip', '초과 파일 이름');
  console.assert(oversized([ok]).length === 0, '정상 파일 통과');
  console.assert(oversized([{ name: 'edge', size: 8 * 1024 * 1024 }]).length === 0, '경계값 8MB 허용');
  console.log('admin selftest 완료');
}
if (location.search.includes('selftest')) adminSelfTest();
