/* 메인 시안 V4 · 3SZONE V2 — 페이지에 있는 요소만 동작한다 */
(() => {
  document.documentElement.classList.add('v4-js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 스크롤 등장
  const io = new IntersectionObserver((rows, ob) => rows.forEach(r => {
    if (r.isIntersecting) { r.target.classList.add('on'); ob.unobserve(r.target); }
  }), { threshold: .2 });
  document.querySelectorAll('.v4-rv').forEach(el => io.observe(el));

  /* ---------- 히어로: 헤더 투명 + 물결 선 ---------- */
  const hero = document.querySelector('.v4-hero');
  if (hero) {
    const top = () => document.body.classList.toggle('home-top', scrollY < hero.offsetHeight - 92);
    addEventListener('scroll', top, { passive: true });
    top();

    const cv = hero.querySelector('.v4-wave'), ctx = cv.getContext('2d');
    let w, h, run = true, raf;
    const size = () => {
      const d = Math.min(devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * d; cv.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    const N = 34;
    const draw = t => {
      ctx.clearRect(0, 0, w, h);
      const mid = h * .56, A = Math.min(h * .07, 60);
      for (let k = 0; k < N; k++) {
        const o = k / (N - 1) - .5;                       // -0.5 ~ 0.5
        ctx.beginPath();
        for (let x = -10; x <= w + 10; x += 10) {
          const u = x / w;
          const spread = .25 + .75 * Math.abs(Math.cos(u * Math.PI));   // 가장자리에서 벌어지고 가운데서 모인다
          const y = mid + Math.sin(u * 5.2 + t * .00035 + o * 1.4) * A
                        + o * h * .32 * spread;
          x < 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(110,170,255,${.12 + (1 - Math.abs(o) * 2) * .4})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    };
    /* 원통: 저절로 천천히 돌고, 마우스·손가락으로 끌면 그 방향으로 돌아간다(놓으면 관성 후 원래 속도로) */
    const ring = hero.querySelector('.v4-ring'), stage = hero.querySelector('.v4-stage');
    const AUTO = reduce ? 0 : -4.5 / 1000;             // 도/ms (기존 CSS 80초 한 바퀴와 같은 속도)
    let ang = 0, vel = 0, drag = null, lastT = 0;
    const set = () => { ring.style.transform = `rotateY(${ang}deg)`; };
    stage.addEventListener('pointerdown', e => {
      drag = { x: e.clientX, t: e.timeStamp, id: e.pointerId };
      vel = 0; stage.setPointerCapture(e.pointerId); stage.classList.add('grab');
    });
    stage.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dt = Math.max(1, e.timeStamp - drag.t);
      ang += dx * .25;
      vel = dx * .25 / dt;                               // 놓을 때 관성으로 쓴다
      drag.x = e.clientX; drag.t = e.timeStamp;
      set();
    });
    const end = () => { drag = null; stage.classList.remove('grab'); };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    const spin = t => {
      const dt = Math.min(50, t - (lastT || t)); lastT = t;
      if (!drag) {
        vel += (AUTO - vel) * Math.min(1, dt * .0025);   // 관성이 서서히 기본 속도로 돌아온다
        ang += vel * dt;
        set();
      }
    };
    vel = AUTO;
    set();
    hero.classList.add('v4-drive');                      // 여기까지 준비돼야 CSS 자동 회전을 넘겨받는다

    const loop = t => { draw(t); spin(t); if (run) raf = requestAnimationFrame(loop); else lastT = 0; };
    size();
    addEventListener('resize', () => { size(); draw(performance.now()); });
    if (reduce) draw(0);
    else {
      new IntersectionObserver(([e]) => {
        run = e.isIntersecting;
        cancelAnimationFrame(raf);
        if (run) raf = requestAnimationFrame(loop);
      }).observe(hero);
    }
  }

  /* ---------- 원스톱 슬라이드 ---------- */
  const track = document.getElementById('oneTrack');
  if (track) {
    /* 끝없이 도는 슬라이드: 8장 앞뒤에 복사본을 한 벌씩 붙여 가운데 벌에서 시작한다.
       그래서 첫 화면 왼쪽에 맨 끝(위치 관제)이 보이고, 복사본 벌로 넘어가면 같은 장의 원본으로 몰래 옮긴다 */
    const orig = [...track.children], N = orig.length;
    const clone = s => { const c = s.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.tabIndex = -1; return c; };
    track.prepend(...orig.map(clone));
    track.append(...orig.map(clone));
    const slides = [...track.children];
    const band = track.parentElement;
    const prev = band.querySelector('.prev'), next = band.querySelector('.next');
    let cur = N, settle;
    const left = s => s.offsetLeft - (track.clientWidth - s.offsetWidth) / 2;
    const sync = () => {
      const c = track.scrollLeft + track.clientWidth / 2;
      let best = 0, d = Infinity;
      slides.forEach((s, i) => {
        const m = Math.abs(s.offsetLeft + s.offsetWidth / 2 - c);
        if (m < d) { d = m; best = i; }
      });
      cur = best;
      slides.forEach((s, i) => s.classList.toggle('on', i === cur));
    };
    const jump = i => {                                  // 애니메이션 없이 같은 장의 원본 자리로
      track.classList.add('jump');
      track.scrollTo({ left: left(slides[i]), behavior: 'auto' });
      sync();
      requestAnimationFrame(() => requestAnimationFrame(() => track.classList.remove('jump')));
    };
    const recenter = () => { if (cur < N || cur >= 2 * N) jump(N + (cur % N)); };
    const go = i => track.scrollTo({ left: left(slides[i]), behavior: reduce ? 'auto' : 'smooth' });
    prev.onclick = () => go(cur - 1);
    next.onclick = () => go(cur + 1);
    // 옆 카드를 누르면 이동만 하고, 가운데 카드만 상세 페이지로 간다
    slides.forEach((s, i) => s.addEventListener('click', e => { if (i !== cur) { e.preventDefault(); go(i); } }));
    track.addEventListener('scroll', () => {
      requestAnimationFrame(sync);
      clearTimeout(settle); settle = setTimeout(recenter, 160);
    }, { passive: true });
    addEventListener('resize', () => jump(N + (cur % N)));
    jump(N);

    // 자동 롤링: 보이는 동안 4초마다 다음 장. 마우스를 올리거나 만지면 쉰다
    if (!reduce) {
      let seen = false, hold = false;
      new IntersectionObserver(([e]) => { seen = e.isIntersecting; }, { threshold: .4 }).observe(band);
      band.addEventListener('pointerenter', () => { hold = true; });
      band.addEventListener('pointerleave', () => { hold = false; });
      band.addEventListener('focusin', () => { hold = true; });
      band.addEventListener('focusout', () => { hold = false; });
      setInterval(() => { if (seen && !hold && !document.hidden) go(cur + 1); }, 4000);
    }
  }

  /* ---------- Our System: 검정 카드가 차례로 옮겨 간다 ---------- */
  const grid = document.querySelector('.v4-sys-grid');
  if (grid && !reduce) {
    const cards = [...grid.querySelectorAll('a')];
    let k = Math.max(0, cards.findIndex(a => a.classList.contains('dark'))), seen = false, hold = false;
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; }, { threshold: .3 }).observe(grid);
    grid.addEventListener('pointerenter', () => { hold = true; });
    grid.addEventListener('pointerleave', () => { hold = false; });
    setInterval(() => {
      if (!seen || hold || document.hidden) return;
      cards[k].classList.remove('dark');
      k = (k + 1) % cards.length;
      cards[k].classList.add('dark');
    }, 2200);
  }
})();
