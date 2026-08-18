// 공통 스크립트 — 헤더/푸터 인클루드 후 초기화
// 정적 호스팅용이라 서버사이드 include 대신 fetch로 삽입한다 (file:// 로 열면 CORS로 막히니 서버에서 볼 것)

async function includePartials() {
  const slots = [...document.querySelectorAll('[data-include]')];
  await Promise.all(slots.map(async el => {
    const res = await fetch(el.dataset.include);
    el.outerHTML = await res.text();
  }));
}

function initGnb() {
  const gnb = document.querySelector('.gnb');
  if (!gnb) return;

  // 모바일 전체메뉴
  gnb.querySelector('.hamb').onclick = () => {
    gnb.classList.toggle('open');
    document.body.style.overflow = gnb.classList.contains('open') ? 'hidden' : '';
  };
  gnb.querySelector('.menu').onclick = e => {
    if (e.target.tagName === 'A') { gnb.classList.remove('open'); document.body.style.overflow = ''; }
  };

  // 현재 페이지 메뉴 활성화
  const here = location.pathname.split('/').pop() || 'index.html';
  gnb.querySelectorAll('.menu a').forEach(a => {
    if (a.getAttribute('href') === here) {
      a.classList.add('on');
      a.closest('.menu > li').querySelector('a').classList.add('on');
    }
  });
}

function initPopups() {
  document.querySelectorAll('[data-pop]').forEach(a => a.onclick = e => {
    e.preventDefault();
    document.getElementById('pop-' + a.dataset.pop).showModal();
  });
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.closest('dialog').close());
}

// 메인 Our System 탭
function initTabs() {
  const tabs = [...document.querySelectorAll('#tabs button')];
  const panels = [...document.querySelectorAll('#panels .panel')];
  tabs.forEach((t, i) => t.onclick = () => {
    tabs.forEach(x => x.classList.remove('on'));
    panels.forEach(x => x.classList.remove('on'));
    t.classList.add('on');
    panels[i].classList.add('on');
  });
}

// 서브 비주얼의 페이지 이동 셀렉트
function initPageSelect() {
  document.querySelectorAll('.page-select select').forEach(sel => {
    sel.onchange = () => { if (sel.value) location.href = sel.value; };
  });
}

includePartials().then(() => {
  initGnb();
  initPopups();
  initTabs();
  initPageSelect();
});
