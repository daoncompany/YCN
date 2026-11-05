/* 메인 히어로 시안 V1·V2·V3 — 페이지에 있는 히어로만 동작한다 */
(() => {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 히어로가 화면을 덮고 있는 동안 헤더를 어두운 투명 헤더로
  const headerOver = on => document.body.classList.toggle('home-top', on);

  /* ---------- V1: 콜라주 → 플랜트 사진 풀스크린 → 줄어들어 두 번째 섹션의 플랜트 카드로 ---------- */
  const v1 = document.querySelector('.v1-hero');
  if (v1) {
    const stick = v1.querySelector('.v1-stick'), kv = v1.querySelector('.v1-kv'), kvImg = kv.querySelector('img');
    const center = v1.querySelector('.v1-img.c'), title = v1.querySelector('.v1-title'), copy = v1.querySelector('.v1-copy');
    const cue = v1.querySelector('.v1-cue'), fh = v1.querySelector('.v1-fields h2');
    const cards = [...v1.querySelectorAll('.v1-fields .field')], plant = cards[1];
    const sides = [...v1.querySelectorAll('.v1-img:not(.c)')].map(el => ({ el, dir: el.matches('.lm,.bl') ? -1 : 1 }));
    const lerp = (a, b, t) => a + (b - a) * t;
    const tick = () => {
      const hr = v1.getBoundingClientRect();
      if (hr.bottom > 0) {
        const p = reduce ? 1 : clamp(-hr.top / (hr.height - innerHeight));
        const e1 = eio(clamp(p / .26)), k = 1 - e1;            // 1단계: 콜라주 가운데 사진이 화면 가득
        const e2 = eio(clamp((p - .5) / .3));                  // 2단계: 화면 가득 → 플랜트 카드 크기로
        const sr = stick.getBoundingClientRect();
        if (e2 <= 0) {
          const cr = center.getBoundingClientRect();
          const t = (cr.top - sr.top) * k, l = (cr.left - sr.left) * k;
          const r = Math.max(0, sr.right - cr.right) * k, b = Math.max(0, sr.bottom - cr.bottom) * k;
          kv.style.clipPath = `inset(${t}px ${r}px ${b}px ${l}px round ${16 * k}px)`;
          Object.assign(kv.style, { left: '0px', top: '0px', width: sr.width + 'px', height: sr.height + 'px' });
        } else {
          // 상자 자체를 줄여야 마지막 사진 크롭이 카드(object-fit:cover)와 똑같아져 바꿔 끼워도 티가 안 난다
          const pr = plant.getBoundingClientRect();
          kv.style.clipPath = 'none';
          Object.assign(kv.style, {
            left: lerp(0, pr.left - sr.left, e2) + 'px', top: lerp(0, pr.top - sr.top, e2) + 'px',
            width: lerp(sr.width, pr.width, e2) + 'px', height: lerp(sr.height, pr.height, e2) + 'px' });
        }
        const done = e2 >= .999;
        kv.style.visibility = done ? 'hidden' : 'visible';
        plant.style.opacity = done ? 1 : 0;
        kvImg.style.transform = `scale(${1.22 - .22 * e1})`;
        kv.style.setProperty('--o', clamp((p - .2) / .15) * (1 - e2)); kv.style.setProperty('--o2', e2);
        sides.forEach(({ el, dir }) => {
          el.style.transform = `translate(${dir * e1 * 32}vw,${-e1 * 8}vh)`;
          el.style.opacity = 1 - e1 * 1.3;
        });
        title.style.transform = `translateY(${-e1 * 22}vh)`;
        title.style.opacity = 1 - e1 * 1.8;
        const c = clamp((p - .2) / .1) * (1 - clamp((p - .44) / .07));   // 히어로 문구: 나타났다가 축소 전에 사라짐
        copy.style.opacity = c;
        copy.style.transform = `translateY(${(1 - clamp((p - .2) / .1)) * 30}px)`;
        const f = clamp((p - .6) / .2);                         // 다른 카드·제목이 제자리로
        fh.style.opacity = f; fh.style.transform = `translateY(${(1 - f) * 40}px)`;
        cards.forEach((el, i) => { if (el !== plant) { el.style.opacity = f; el.style.transform = `translateY(${(1 - f) * 60}px)`; } });
        const ct = clamp((p - .8) / .06);                       // 플랜트 카드 글자
        plant.querySelectorAll('.num,b,p').forEach(el => el.style.opacity = ct);
        cue.style.opacity = 1 - p * 4;
        headerOver(e1 > .85 && e2 < .5 && hr.bottom > 92);
      }
      requestAnimationFrame(tick);
    };
    tick();
  }

  /* ---------- V2: 선 다발 웨이브 (LX bg-wave 방식을 SVG 벡터로) ---------- */
  const v2 = document.querySelector('.v2-hero');
  if (v2) {
    const svg = v2.querySelector('.v2-wave'), grad = svg.querySelector('#v2grad'), g = svg.querySelector('g');
    const N = 50;                                   // 선 개수 + 1
    for (let i = 0; i <= N; i++) g.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
    const paths = [...g.children];
    // 기준 곡선 5개의 y 값 15개가 각자 다른 주기(8~15초)로 위아래를 오간다
    const rnd = (a, b) => a + Math.random() * (b - a);
    const osc = Array.from({ length: 15 }, () => ({ T: rnd(8, 15), d: rnd(0, 5) }));
    let W, H, minX, minY, varX, varY, w1;
    const size = () => {
      const r = svg.getBoundingClientRect();
      W = r.width; H = r.height;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      grad.setAttribute('x2', W);
      minX = 20; minY = H * .2; varX = W / 10 - 2; varY = H - minY * 2; w1 = (W - minX * 2 - varX) / 4;
    };
    const ys = (k, t) => {                      // k번째 기준 곡선의 y1,y2,y3
      const lo = minY, hi = H - minY, up = minY - varY / 2, dn = minY + varY * 4 / 3;
      const pairs = k % 2 ? [[hi, lo], [up, dn], [hi, lo]] : [[lo, hi], [dn, up], [lo, hi]];
      return pairs.map(([a, b], j) => {
        const o = osc[k * 3 + j], u = Math.max(0, t - o.d) / o.T;
        return a + (b - a) * (1 - Math.cos(Math.PI * u)) / 2;
      });
    };
    const xs = k => k === 0 ? [minX, minX, minX] : k === 4 ? [W - minX, W - minX, W - minX]
      : [minX + w1 * k, minX + w1 * k + varX / 2, minX + w1 * k + varX];
    const spline = P => {                       // 카디널 스플라인(장력 .5) → 3차 베지어
      const Q = [P[0], ...P, P[P.length - 1]];
      let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
      for (let i = 1; i < Q.length - 2; i++) {
        const [a, b, c, e] = [Q[i - 1], Q[i], Q[i + 1], Q[i + 2]];
        d += `C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)},${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ` +
             `${(c[0] - (e[0] - b[0]) / 6).toFixed(1)},${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`;
      }
      return d;
    };
    const draw = t => {
      const C = [0, 1, 2, 3, 4].map(k => ({ x: xs(k), y: ys(k, t) }));
      paths.forEach((p, i) => {
        const s = i / N, q = 1 - s;
        p.setAttribute('d', spline(C.map(c => [
          q * q * c.x[0] + 2 * q * s * c.x[1] + s * s * c.x[2],
          q * q * c.y[0] + 2 * q * s * c.y[1] + s * s * c.y[2]])));
      });
    };
    size(); addEventListener('resize', size);
    const t0 = performance.now();
    const loop = now => {
      const r = v2.getBoundingClientRect();
      if (r.bottom > 0) draw((now - t0) / 1000);   // 화면 밖이면 그리지 않음
      headerOver(r.bottom > 92);
      requestAnimationFrame(loop);
    };
    reduce ? draw(6) : requestAnimationFrame(loop);
    if (reduce) { const h = () => headerOver(v2.getBoundingClientRect().bottom > 92); addEventListener('scroll', h, { passive: true }); h(); }
  }

  /* ---------- V3: 쇼릴이 끝나면 아래 섹션으로 자동 스크롤 ---------- */
  const v3 = document.querySelector('.v3-hero');
  if (v3) {
    const next = () => window.scrollTo({ top: document.querySelector('.flow').offsetTop, behavior: 'smooth' });
    addEventListener('message', e => {
      // 사용자가 이미 내려가 있으면 끌어내리지 않는다
      if (e.data === 'ycn-reel-end' && scrollY < v3.offsetHeight * .5) next();
      if (e.data && e.data.ycnHud) document.body.classList.toggle('v3-light', e.data.ycnHud === '#05070D');   // 흰 장면 → 헤더 글자 먹색
    });
    v3.querySelector('.v3-skip').onclick = next;
    const h = () => headerOver(v3.getBoundingClientRect().bottom > 92);
    addEventListener('scroll', h, { passive: true }); h();
  }
})();
