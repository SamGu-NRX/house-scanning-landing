(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  // The wide figure: one wall walked end to end, then split into three readings. The markup is the finished
  // state; each beat below adds one attribute, and CSS transitions carry the change, so a replay mid-way
  // simply restarts from the joined wall.
  const film = document.querySelector('[data-film]');
  if (film) {
    const stage = film.querySelector('.film-stage');
    const replay = document.querySelector('[data-film-replay]');
    const drawing = film.querySelector('.film-whole svg');
    const panels = film.querySelectorAll('[data-panel]');
    if (!stage || !replay || !drawing || panels.length !== 3) throw new Error('The wide figure requires .film-stage, [data-film-replay], one drawing and three panels.');
    // Each panel shows its third of the same drawing. Without JavaScript the uncut drawing shows instead.
    panels.forEach((panel) => panel.prepend(drawing.cloneNode(true)));
    film.dataset.panels = '';
    // 2800 ms is the walk's transform transition in styles.css; the split starts as it settles.
    const beats = [['walked', 250], ['split', 3150], ['read', 3700]];
    let timers = [];
    const reset = () => {
      timers.forEach(clearTimeout);
      timers = [];
      film.dataset.instant = '';
      beats.forEach(([name]) => { delete film.dataset[name]; });
      stage.getBoundingClientRect(); // commit the joined wall before transitions come back
      delete film.dataset.instant;
    };
    const play = () => {
      reset();
      for (const [name, time] of beats) timers.push(setTimeout(() => { film.dataset[name] = ''; }, time));
    };
    const finish = () => {
      timers.forEach(clearTimeout);
      timers = [];
      beats.forEach(([name]) => { film.dataset[name] = ''; });
    };
    replay.addEventListener('click', play);
    reduced.addEventListener('change', () => { if (reduced.matches) finish(); });
    if (!reduced.matches) {
      // Start joined while the figure is still below the fold, and play the first time most of it is in view.
      reset();
      const observer = new IntersectionObserver(([entry]) => {
        // The first callback reports the current state even below the threshold, so check the ratio.
        if (!entry.isIntersecting || entry.intersectionRatio < .45) return;
        observer.disconnect();
        play();
      }, { threshold: .45 });
      observer.observe(stage);
    }
  }

  // A figure plays its entrance only if it starts below the screen; one already in view (a reload part-way
  // down, a link to its section) stays in its finished state instead of vanishing and replaying.
  const belowFold = (element) => element.getBoundingClientRect().top > innerHeight;

  // The client stack: the four layers start stacked as one and separate once, the first time a third of the
  // layer drawing is in view, showing that one scene is built from them. The markup's default is the separated state.
  const stack = document.querySelector('[data-stack]');
  const layerDrawing = stack?.querySelector('.layers');
  if (stack && layerDrawing && !reduced.matches && belowFold(layerDrawing)) {
    delete stack.dataset.exploded;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < .35) return;
      observer.disconnect();
      // The first separation is slower and staggered; afterwards a selection moves at interface speed.
      stack.dataset.exploding = '';
      stack.dataset.exploded = '';
      setTimeout(() => { delete stack.dataset.exploding; }, 1000);
    }, { threshold: .35 });
    observer.observe(layerDrawing);
    reduced.addEventListener('change', () => { if (reduced.matches) stack.dataset.exploded = ''; });
  }

  // The layer key. A button pins its layer (click, tap, Enter or Space; again, or Escape, or a tap elsewhere
  // unpins); a click on a sheet pins it too. A mouse over a button previews that layer and hands back to the
  // pinned one on leaving. Sheets get no hover preview: they move when focus changes, so a pointer resting near
  // an edge would leave and re-enter the sheet it just moved.
  // The focused sheet lifts; sheets above it rise and sheets below sink, both emptied to outlines.
  const layers = document.querySelector('[data-layers]');
  if (layers) {
    const buttons = [...layers.querySelectorAll('[data-layer-key]')];
    const sheets = [...layers.querySelectorAll('[data-layer]')];
    const details = [...layers.querySelectorAll('[data-layer-detail]')];
    const order = buttons.map((button) => button.dataset.layerKey);
    const missing = sheets.map((sheet) => sheet.dataset.layer).filter((name) => !order.includes(name));
    if (missing.length || sheets.length !== order.length) throw new Error(`Layer key and drawing disagree: ${missing.join(', ') || 'count'}`);
    let pinned = null;
    let preview = null;
    const render = () => {
      const name = preview ?? pinned;
      const at = order.indexOf(name);
      if (name) layers.dataset.focus = name; else delete layers.dataset.focus;
      sheets.forEach((sheet) => {
        const index = order.indexOf(sheet.dataset.layer);
        if (!name) delete sheet.dataset.pos;
        else sheet.dataset.pos = index === at ? 'focus' : index < at ? 'above' : 'below';
      });
      buttons.forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.layerKey === pinned));
        button.toggleAttribute('data-preview', button.dataset.layerKey === name);
      });
      details.forEach((detail) => { detail.hidden = detail.dataset.layerDetail !== (name ?? 'all'); });
    };
    const pin = (name) => {
      pinned = pinned === name ? null : name;
      preview = null;
      render();
    };
    const hover = (element, name) => {
      element.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') { preview = name; render(); } });
      element.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse' && preview === name) { preview = null; render(); } });
    };
    buttons.forEach((button) => {
      const name = button.dataset.layerKey;
      button.addEventListener('click', () => pin(name));
      hover(button, name);
    });
    sheets.forEach((sheet) => {
      const name = sheet.dataset.layer;
      sheet.addEventListener('click', () => pin(name));
    });
    // Escape clears a pin or preview from anywhere on the page, not only while focus is in the panel.
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && (pinned || preview)) { pinned = null; preview = null; render(); }
    });
    document.addEventListener('pointerdown', (event) => {
      if (pinned && !layers.contains(event.target)) { pinned = null; preview = null; render(); }
    });
    layers.dataset.layersReady = '';
    render();
  }

  // What leaves the phone: the five steps arrive left to right once, then the retake loop. Same pattern as the
  // server flow below: the markup is finished, and only a figure still below the screen is hidden to play.
  const flow = document.querySelector('[data-flow]');
  if (flow && !reduced.matches && belowFold(flow)) {
    delete flow.dataset.shown;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      flow.dataset.shown = '';
    }, { rootMargin: '0px 0px -20% 0px' });
    observer.observe(flow);
    reduced.addEventListener('change', () => { if (reduced.matches) flow.dataset.shown = ''; });
  }

  // The server path: its four stages arrive in upload order once, as the top of the flow passes the lower fifth
  // of the screen. A share-of-flow threshold would leave a blank gap on a phone, where the stacked flow is taller
  // than the screen.
  const server = document.querySelector('[data-server]');
  const serverFlow = server?.querySelector('.server-flow');
  if (server && serverFlow && !reduced.matches && belowFold(serverFlow)) {
    delete server.dataset.shown;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      server.dataset.shown = '';
    }, { rootMargin: '0px 0px -20% 0px' });
    observer.observe(serverFlow);
    reduced.addEventListener('change', () => { if (reduced.matches) server.dataset.shown = ''; });
  }

  // Unseen ground. The haze covers the wall left of the range's position. A check with any of its region still
  // hazed stays unsure (coverage.js); once all of it is seen, the briefing's rule decides: pass only when the
  // whole error bar clears the limit, fail only when it all falls short, otherwise unsure.
  const unseen = document.querySelector('[data-unseen]');
  if (unseen) {
    if (typeof globalThis.coverageCheck !== 'function') throw new Error('The unseen-ground study requires coverage.js before story.js.');
    const find = (selector) => {
      const element = unseen.querySelector(selector);
      if (!element) throw new Error(`Unseen-ground study requires ${selector}.`);
      return element;
    };
    const scene = find('[data-unseen-scene]');
    const range = find('input[type="range"]');
    const haze = find('[data-unseen-haze]');
    const divider = find('[data-unseen-divider]');
    const request = find('[data-unseen-reveal]');
    const verdict = find('[data-verdict]');
    // The scene's viewBox spans world x -300 to 100 cm. The walk saw 75 cm left of the meter.
    const LEFT = -300;
    const WIDTH = 400;
    const WALKED = -75;
    // Illustrative values on an unnumbered scale where 0.5 is the rule's limit. These are not real thresholds.
    const LIMIT = .5;
    const WIDE = .45;
    const NARROW = .08;
    const checks = [
      { name: 'wall', region: [-190, -114], value: .78 },
      { name: 'ground', region: [-190, -114], value: .72 },
      { name: 'room', region: [-226, -100], value: .2 },
    ].map((check) => ({ ...check, row: find(`[data-check="${check.name}"]`) }));
    checks.forEach((check) => { check.chip = check.row.querySelector('[data-chip]'); });
    const words = { none: 'Not seen', unsure: 'Unsure', pass: 'Pass', fail: 'Fail' };
    const verdicts = { none: 'Not seen yet', unsure: 'Unsure', pass: 'Possible', fail: 'Not here' };

    const update = () => {
      const value = Number(range.value);
      const edge = LEFT + WIDTH * value / 100;
      haze.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
      divider.style.transform = `translateX(${value}%)`;
      const states = checks.map(({ name, region, value: estimate, row, chip }) => {
        const { state, lo, hi } = globalThis.coverageCheck({ region, estimate, edge, limit: LIMIT, wide: WIDE, narrow: NARROW });
        if (state !== 'none') {
          row.style.setProperty('--lo', lo.toFixed(3));
          row.style.setProperty('--hi', hi.toFixed(3));
        }
        row.dataset.state = state;
        scene.dataset[name] = state;
        chip.textContent = words[state];
        return state;
      });
      // Any failed check rules the spot out; otherwise unseen ground outranks an unsure one.
      const overall = ['fail', 'none', 'unsure', 'pass'].find((state) => states.includes(state));
      if (verdict.dataset.state !== overall) {
        verdict.dataset.state = overall;
        verdict.textContent = verdicts[overall];
      }
      request.hidden = overall !== 'none';
      const feet = Math.max(0, -edge) / 30.48;
      range.setAttribute('aria-valuetext', feet < .1 ? 'Nothing left of the meter seen' : `Seen to ${feet.toFixed(1)} ft left of the meter. ${verdicts[overall]}.`);
    };
    const setValue = (value) => {
      range.value = String(Math.round(Math.min(Math.max(value, 0), 100)));
      update();
    };
    let sweep = 0;
    const stopSweep = () => { cancelAnimationFrame(sweep); sweep = 0; };
    range.value = String(Math.round((WALKED - LEFT) / WIDTH * 100));
    range.addEventListener('input', () => { stopSweep(); update(); });

    // Dragging anywhere on the scene moves the edge. iOS Safari drags a range only by its thumb, and this
    // range is invisible, so pointer input is read here; the range keeps keyboard and screen-reader control.
    const fromPointer = (event) => {
      const box = scene.getBoundingClientRect();
      setValue((event.clientX - box.left) / box.width * 100);
    };
    scene.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || event.target.closest('[data-unseen-reveal]')) return;
      stopSweep();
      scene.setPointerCapture(event.pointerId);
      fromPointer(event);
    });
    scene.addEventListener('pointermove', (event) => { if (scene.hasPointerCapture(event.pointerId)) fromPointer(event); });

    // The app's request, as a real control: it sweeps the view across the unseen ground, then hands focus to
    // the range so the keys keep working. A keyboard press or reduced motion reveals it at once.
    request.addEventListener('click', (event) => {
      stopSweep();
      const from = Number(range.value);
      const done = () => { sweep = 0; setValue(0); range.focus({ preventScroll: true }); };
      if (event.detail === 0 || reduced.matches) { done(); return; }
      const started = performance.now();
      const step = (now) => {
        const t = Math.min((now - started) / 900, 1);
        // easeInOutSine, the same curve as the walking camera.
        setValue(from * (1 - (1 - Math.cos(Math.PI * t)) / 2));
        if (t < 1) sweep = requestAnimationFrame(step); else done();
      };
      sweep = requestAnimationFrame(step);
    });
    reduced.addEventListener('change', () => {
      if (!reduced.matches || !sweep) return;
      stopSweep();
      setValue(0);
    });
    update();
  }
})();
