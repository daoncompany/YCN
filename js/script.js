async function includePartials() {
  const slots = [...document.querySelectorAll('[data-include]')];
  await Promise.all(slots.map(async el => {
    const res = await fetch(el.dataset.include, { cache: 'no-cache' });
    el.outerHTML = await res.text();
  }));
}

function initGnb() {
  const gnb = document.querySelector('.gnb');
  if (!gnb) return;

  gnb.querySelector('.hamb').onclick = () => {
    gnb.classList.toggle('open');
    document.body.style.overflow = gnb.classList.contains('open') ? 'hidden' : '';
  };
  gnb.querySelector('.menu').onclick = e => {
    if (e.target.tagName === 'A') { gnb.classList.remove('open'); document.body.style.overflow = ''; }
  };

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

includePartials().then(() => {
  initGnb();
  initPopups();
  initTabs();
  if (typeof initNoticeList === 'function') { initNoticeList(); initNoticePopup(); }
  if (typeof initAdminForm === 'function') initAdminForm();
});
