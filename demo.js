(() => {
  const root = document.querySelector('[data-demo]');
  if (!root) return;
  const required = (selector) => {
    const element = root.querySelector(selector);
    if (!element) throw new Error(`Phone demo requires ${selector}.`);
    return element;
  };
  const SVG = 'http://www.w3.org/2000/svg';
  const playButton = required('[data-demo-play]');
  const playLabel = required('[data-demo-play-label]');
  const status = required('[data-demo-status]');
  const progress = required('[data-demo-progress]');
  const indicator = required('[data-demo-indicator]');
  const screen = required('.phone-screen');
  const app = required('[data-app]');

  // Each stage plays one window of a single scene timeline. The stage's own clock drives the
  // progress bar; pause, replay and stage changes move the clock and the scene together.
  const stages = [
    { name: 'meter', duration: 4200, status: 'Meter. The app asks you to find your electric meter, then takes a close-up photo of it by itself.' },
    { name: 'walk', duration: 7900, status: 'Walk. Haze lifts where the phone has seen the wall and the ground, and the strip at the bottom fills in. At the corner, you mark where the wall ends.' },
    { name: 'mark', duration: 7000, status: 'Mark. You pin the window\'s corners, then answer what a camera can\'t tell, like what covers the ground and whether the window opens.' },
    { name: 'placement', duration: 5000, status: 'Placement. The phone sends measurements, not photos. The example result shows a possible spot 10 ft from the meter for an installer to review.' },
  ];
  let total = 0;
  for (const stage of stages) { stage.start = total; total += stage.duration; }
  const TOTAL = total;
  const byName = Object.fromEntries(stages.map((stage) => [stage.name, stage]));
  const at = (name, ms) => byName[name].start + ms;
  const stageEnd = (position) => stages[position].start + stages[position].duration - 1;
  const steps = stages.map((stage) => required(`[data-demo-step="${stage.name}"]`));

  const EASE = {
    out: 'cubic-bezier(.23, 1, .32, 1)', // the page's --ease-out: entrances and settles
    pan: 'cubic-bezier(.37, 0, .63, 1)', // easeInOutSine: the camera moving on screen
    pin: 'cubic-bezier(.34, 1.56, .64, 1)', // easeOutBack, standing in for the app's pin spring (0.45 s, bounce 0.25)
  };
  const CHALK = '#f7f5ef';
  const INK = '#0b1220';

  // Camera path, in world centimeters: [scene time, zoom in points per cm, s along the wall, height, easing to the next key].
  const cameraKeys = [
    [at('meter', 0), 3.05, -10, 146, EASE.pan],
    [at('meter', 2000), 3.2, 0, 140],
    [at('walk', 0), 3.2, 0, 140, EASE.pan],
    [at('walk', 800), 2.0, 0, 78, EASE.pan],
    [at('walk', 5800), 2.0, 450, 84],
    [at('mark', 0), 2.0, 450, 84, EASE.pan],
    [at('mark', 1400), 2.4, 140, 105],
    [at('mark', 2100), 2.4, 140, 105, EASE.pan],
    [at('mark', 2900), 1.9, 190, 160],
  ];
  const PAN = { from: at('walk', 800), duration: 5000, length: 450 };
  const CENTER = [196.5, 425.5];
  const camera = (k, s, h) => `translate(${CENTER[0]}px, ${CENTER[1]}px) scale(${k}) translate(${-s}px, ${h}px)`;
  const project = ([k, s, h], [x, height]) => [CENTER[0] + k * (x - s), CENTER[1] + k * (h - height)];

  // Solves the pan's cubic-bezier so coverage changes land when the camera actually reaches each stretch.
  const axis = (a, b) => (t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
  const panX = axis(.37, .63);
  const panY = axis(0, 1);
  function panTime(s) {
    const fraction = Math.min(Math.max(s / PAN.length, 0), 1);
    let low = 0;
    let high = 1;
    for (let i = 0; i < 40; i += 1) {
      const middle = (low + high) / 2;
      if (panY(middle) < fraction) low = middle; else high = middle;
    }
    return PAN.from + PAN.duration * panX(high);
  }

  // Coverage for one stretch of wall: when the phone first saw it, and when it saw it well.
  // The walk only goes right, so the far left stays unseen, as the result's last notice says.
  function coverage(center) {
    const seen = Math.abs(center) <= 75 ? at('walk', 300) : center > 75 ? panTime(center - 75) : null;
    if (seen === null) return { seen, covered: null };
    const covered = Math.abs(center) <= 20 ? seen + 700 : center > 20 ? Math.max(panTime(center - 10), seen + 700) : null;
    return { seen, covered };
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const measuresInContainerUnits = CSS.supports('width', '1cqw');
  let scene = [];
  let builtWidth = 0;
  let pt = 1;
  let index = 0;
  let clock;
  let generation = 0;
  let playing = false;
  let finished = false;
  let visible = false;
  let autoplayUsed = false;
  let requestedPlay = false;
  let still = reduced.matches;

  // One animation across the whole scene timeline. points: [scene time, keyframe, easing to the next point].
  // Two points at the same time make an instant change, which is how the app swaps its text.
  function track(element, points) {
    const frames = [];
    if (points[0][0] > 0) frames.push({ ...points[0][1], offset: 0 });
    for (const [time, frame, easing = 'linear'] of points) frames.push({ ...frame, offset: time / TOTAL, easing });
    const last = points[points.length - 1];
    if (last[0] < TOTAL) frames.push({ ...last[1], offset: 1 });
    const animation = element.animate(frames, { duration: TOTAL, fill: 'both' });
    animation.pause();
    scene.push(animation);
  }

  // Visible during each [from, to, fadeIn, fadeOut] interval; `to` may be Infinity.
  function visibleDuring(element, intervals) {
    const points = [[0, { opacity: 0 }]];
    for (const [from, to, fadeIn = 0, fadeOut = 0] of intervals) {
      points.push([from, { opacity: 0 }, EASE.out], [from + fadeIn, { opacity: 1 }]);
      if (Number.isFinite(to)) points.push([to, { opacity: 1 }, EASE.out], [to + fadeOut, { opacity: 0 }]);
    }
    track(element, points);
  }

  function press(element, time) {
    const rest = { transform: 'scale(1)' };
    track(element, [[0, rest], [time, rest, EASE.out], [time + 120, { transform: 'scale(.97)' }, EASE.out], [time + 280, rest]]);
  }

  function ripple(element, time, [x, y]) {
    element.setAttribute('cx', x);
    element.setAttribute('cy', y);
    const hidden = { opacity: 0, transform: 'scale(.7)' };
    track(element, [[0, hidden], [time, hidden], [time, { opacity: 1, transform: 'scale(.7)' }, EASE.out], [time + 550, { opacity: 0, transform: 'scale(1.35)' }]]);
  }

  function land(element, time, from = 'scale(.5)', easing = EASE.out, duration = 400) {
    track(element, [[0, { opacity: 0, transform: from }], [time, { opacity: 0, transform: from }, easing], [time + duration, { opacity: 1, transform: 'scale(1)' }]]);
  }

  function choose(answer, time) {
    const idle = { backgroundColor: '#1f66f21a', color: '#1650c8' };
    track(answer, [[0, idle], [time, idle, EASE.out], [time + 150, { backgroundColor: '#1a58d6', color: '#ffffff' }]]);
    press(answer, time);
  }

  const shift = (points) => `translate(0px, ${points * pt}px)`;

  // Coverage cells, the tape's foot ticks and the walking path come from these spans, not from markup.
  const tapeX = (s) => (s + 85) * 333 / 590;
  function drawOnce() {
    const fog = required('[data-fog]');
    for (let s = -120; s < 450; s += 30) {
      for (const [y, height] of [[-262, 262], [0, 64]]) {
        const cell = document.createElementNS(SVG, 'rect');
        Object.entries({ x: s - 6, y, width: 42, height, fill: 'url(#fog-cell)', 'data-s': s, 'data-band': y < 0 ? 'wall' : 'ground' }).forEach(([name, value]) => cell.setAttribute(name, value));
        fog.append(cell);
      }
    }
    const cells = required('[data-tape-cells]');
    for (let s = -60; s < 450; s += 30) {
      for (const [y, height, band] of [[20, 14, 'wall'], [37, 9, 'ground']]) {
        const cell = document.createElementNS(SVG, 'rect');
        const x = tapeX(s) + .5;
        Object.entries({ x, y, width: tapeX(s + 30) - x - .5, height, fill: '#8a93a3', 'fill-opacity': .55, 'data-s': s, 'data-band': band }).forEach(([name, value]) => cell.setAttribute(name, value));
        cells.append(cell);
      }
    }
    let ticks = '';
    for (let foot = -2; foot <= 16; foot += 1) ticks += `M${tapeX(foot * 30.48).toFixed(2)} 49v${foot % 5 === 0 ? 7 : 3.5}`;
    required('[data-tape-ticks]').setAttribute('d', ticks);
    const path = required('[data-path]');
    for (let s = 30; s <= 450; s += 30) {
      path.insertAdjacentHTML('beforeend', `<ellipse cx="${s}" cy="22" rx="3" ry="1.9" fill="#fff" fill-opacity=".7"/><ellipse cx="${s}" cy="22" rx="2" ry="1.2" fill="#1f66f2"/>`);
    }
  }

  function buildScene() {
    scene.forEach((animation) => animation.cancel());
    scene = [];
    builtWidth = screen.clientWidth;
    pt = builtWidth / 393;
    if (!measuresInContainerUnits) app.style.setProperty('--pt', `${pt}px`);

    // Camera, parallax behind the corner, and a small walking bob.
    const cam = [];
    const far = [];
    for (const [time, k, s, h, easing] of cameraKeys) {
      cam.push([time, { transform: camera(k, s, h) }, easing]);
      far.push([time, { transform: `translate(${(.4 * (s - 450)).toFixed(2)}px, 0px)` }, easing]);
    }
    track(required('[data-cam]'), cam);
    track(required('[data-far]'), far);
    const bob = [[0, { transform: 'translate(0px, 0px)' }]];
    for (let time = PAN.from, step = 0; time < PAN.from + PAN.duration; time += 312.5, step += 1) {
      bob.push([time, { transform: `translate(0px, ${[0, -1.2, 0, 1.2][step % 4]}px)` }, EASE.pan]);
    }
    bob.push([PAN.from + PAN.duration, { transform: 'translate(0px, 0px)' }]);
    track(required('[data-bob]'), bob);

    // Meter: aim, press, pin, then the close-up photo.
    visibleDuring(required('[data-reticle-meter]'), [[0, at('walk', 0), 0, 200]]);
    press(required('[data-press="meter"]'), at('meter', 2300));
    ripple(required('[data-ripple="meter"]'), at('meter', 2300), CENTER);
    land(required('[data-pin-meter]'), at('meter', 2400));

    const cards = {
      find: [0, at('meter', 2500)],
      hold: [at('meter', 2500), at('walk', 0)],
      'walk-15': [at('walk', 0), panTime(69.1)],
      'walk-10': [panTime(69.1), panTime(221.4)],
      'walk-5': [panTime(221.4), panTime(330)],
      end: [panTime(330), at('walk', 6900)],
      'end-what': [at('walk', 6900), at('mark', 0)],
      'corner-a': [at('mark', 0), at('mark', 1800)],
      'corner-b': [at('mark', 1800), at('mark', 3800), 0, 250],
    };
    for (const [name, interval] of Object.entries(cards)) visibleDuring(required(`[data-card="${name}"]`), [interval]);

    // Photo counter: one tick for the close-up, then one per photo taken while walking.
    const ticks = [at('meter', 3000)];
    for (let photo = 2; photo <= 9; photo += 1) ticks.push(at('walk', 1100 + (photo - 2) * 600));
    visibleDuring(required('[data-counter]'), [[ticks[0], at('mark', 3800), 200, 250]]);
    [...required('[data-count]').children].forEach((digit, position) => {
      visibleDuring(digit, [[position === 0 ? 0 : ticks[position], ticks[position + 1] ?? Infinity]]);
    });
    const glyph = [[0, { color: CHALK, transform: 'scale(1)' }]];
    for (const time of ticks) glyph.push([time, { color: CHALK, transform: 'scale(1)' }, EASE.out], [time + 80, { color: '#2fc273', transform: 'scale(1.18)' }, EASE.out], [time + 430, { color: CHALK, transform: 'scale(1)' }]);
    track(required('[data-counter-glyph]'), glyph);

    // Walk: fog lifts as the camera passes, the tape fills, the path leads to the corner.
    visibleDuring(required('[data-fog]'), [[at('walk', 0), Infinity, 400]]);
    // The app frosts unseen cells at 0.75 and seen cells at 0.35 through a blur material. A flat white haze
    // needs less; .62 and .3 were picked by eye, with no device comparison. 700 ms is the app's fogLift.
    const unseen = { opacity: .62, transform: 'translate(0px, 0px)' };
    const half = { opacity: .3, transform: 'translate(0px, 0px)' };
    root.querySelectorAll('[data-fog] rect').forEach((cell) => {
      const lag = cell.dataset.band === 'ground' ? 300 : 0;
      const { seen, covered } = coverage(Number(cell.dataset.s) + 15);
      const points = [[0, unseen]];
      if (seen !== null) points.push([seen + lag, unseen, EASE.out], [seen + lag + 700, half]);
      if (covered !== null) points.push([covered + lag, half, EASE.out], [covered + lag + 700, { opacity: 0, transform: 'translate(0px, -6px)' }]);
      track(cell, points);
    });
    const tapeState = { unseen: { fill: '#8a93a3', fillOpacity: .55 }, seen: { fill: '#f5b53d', fillOpacity: 1 }, covered: { fill: '#2fc273', fillOpacity: 1 } };
    root.querySelectorAll('[data-tape-cells] rect').forEach((cell) => {
      const lag = cell.dataset.band === 'ground' ? 300 : 0;
      const { seen, covered } = coverage(Number(cell.dataset.s) + 15);
      if (seen === null) return;
      const points = [[0, tapeState.unseen], [seen + lag, tapeState.unseen], [seen + lag, tapeState.seen]];
      if (covered !== null) points.push([covered + lag, tapeState.seen], [covered + lag, tapeState.covered]);
      track(cell, points);
    });
    const tape = required('[data-tape]');
    visibleDuring(tape, [[at('walk', 0), at('mark', 3800), 250, 250]]);
    track(tape, [[0, { transform: shift(12) }], [at('walk', 0), { transform: shift(12) }, EASE.out], [at('walk', 250), { transform: shift(0) }]]);
    const pointer = required('[data-tape-pointer]');
    visibleDuring(pointer, [[at('walk', 0), Infinity]]);
    track(pointer, cameraKeys.map(([time, , s, , easing]) => [time, { transform: `translate(${tapeX(s).toFixed(2)}px, 0px)` }, easing]));
    visibleDuring(required('[data-path]'), [[at('walk', 0), at('mark', 0), 300, 200]]);

    visibleDuring(required('[data-controls="meter"]'), [[0, at('walk', 0), 0, 200]]);
    visibleDuring(required('[data-controls="walk"]'), [[at('walk', 0), at('walk', 6900), 250, 200]]);
    visibleDuring(required('[data-end-button]'), [[panTime(330), Infinity, 200]]);
    press(required('[data-press="end"]'), at('walk', 6600));
    ripple(required('[data-ripple="end"]'), at('walk', 6600), CENTER);
    visibleDuring(required('[data-end-line]'), [[at('walk', 6600), Infinity, 200]]);
    visibleDuring(required('[data-tape-cap]'), [[at('walk', 6600), Infinity, 200]]);
    visibleDuring(required('[data-controls="end-what"]'), [[at('walk', 6900), at('mark', 0), 200, 200]]);
    press(required('[data-press="corner"]'), at('walk', 7400));

    // Mark: the window's two corners, one with the Mark button and one tapped on screen.
    visibleDuring(required('[data-controls="mark"]'), [[at('mark', 0), at('mark', 3800), 200, 250]]);
    visibleDuring(required('[data-reticle-mark]'), [[at('mark', 0), at('mark', 3800), 200, 250]]);
    press(required('[data-press="mark"]'), at('mark', 1700));
    ripple(required('[data-ripple="corner-a"]'), at('mark', 1700), CENTER);
    land(required('[data-pin-corner-a]'), at('mark', 1700), 'scale(.6)', EASE.pin, 450);
    ripple(required('[data-ripple="corner-b"]'), at('mark', 3200), project(cameraKeys[cameraKeys.length - 1].slice(1, 4), [240, 215]));
    land(required('[data-pin-corner-b]'), at('mark', 3200), 'scale(.6)', EASE.pin, 450);
    visibleDuring(required('[data-window-mark]'), [[at('mark', 3300), Infinity, 250]]);
    land(required('[data-tape-window]'), at('mark', 3300), 'scale(.9)', EASE.out, 200);

    // Review: the questions a camera can't answer, then "Looks complete".
    const review = required('[data-review]');
    visibleDuring(review, [[at('mark', 3800), at('placement', 300), 250]]);
    const panel = review.querySelector('.panel');
    track(panel, [[0, { transform: shift(24) }], [at('mark', 3800), { transform: shift(24) }, EASE.out], [at('mark', 4100), { transform: shift(0) }]]);
    choose(required('[data-answer="gravel"]'), at('mark', 4600));
    const content = required('[data-panel-content]');
    const row = required('[data-window-row]');
    const room = panel.clientHeight - required('.panel-action').offsetHeight;
    const scroll = Math.max(0, row.offsetTop + row.offsetHeight + 12 * pt - room);
    track(content, [[0, { transform: 'translate(0px, 0px)' }], [at('mark', 5100), { transform: 'translate(0px, 0px)' }, EASE.pan], [at('mark', 5700), { transform: `translate(0px, ${-scroll}px)` }]]);
    choose(required('[data-answer="shut"]'), at('mark', 6100));
    press(required('[data-press="complete"]'), at('mark', 6600));
    track(required('[data-home]'), [[0, { color: CHALK }], [at('mark', 3800), { color: CHALK }, EASE.out], [at('mark', 4050), { color: INK }]]);

    // Placement: measurements go up, then the same wall comes back as a model with a possible spot.
    visibleDuring(required('[data-upload]'), [[at('placement', 0), at('placement', 2100), 250]]);
    visibleDuring(required('[data-upload-icon="send"]'), [[0, at('placement', 900), 0, 200]]);
    visibleDuring(required('[data-upload-copy="send"]'), [[0, at('placement', 900), 0, 200]]);
    visibleDuring(required('[data-upload-icon="check"]'), [[at('placement', 900), Infinity, 200]]);
    visibleDuring(required('[data-upload-copy="check"]'), [[at('placement', 900), Infinity, 200]]);
    track(required('[data-system]'), [[0, { color: CHALK }], [at('placement', 0), { color: CHALK }, EASE.out], [at('placement', 250), { color: INK }]]);

    const reveal = at('placement', 1800);
    visibleDuring(required('[data-result]'), [[reveal, Infinity, 300]]);
    const close = 'translate(190px, -160px) scale(1.6) translate(-190px, 160px)';
    const rest = 'translate(190px, -160px) scale(1) translate(-190px, 160px)';
    track(required('[data-model]'), [[0, { transform: close }], [reveal, { transform: close }, EASE.out], [reveal + 1100, { transform: rest }]]);
    track(required('[data-photo-wall]'), [[0, { opacity: 1 }], [reveal + 200, { opacity: 1 }, 'ease'], [reveal + 800, { opacity: 0 }]]);
    // The ground swings down from the wall's base: scaleY shortens its depth and skewX keeps it on the oblique axis.
    const folded = 'skewX(59.5deg) scaleY(.4)';
    const open = 'skewX(0deg) scaleY(1)';
    track(required('[data-model-ground]'), [[0, { transform: folded }], [reveal + 100, { transform: folded }, EASE.out], [reveal + 800, { transform: open }]]);
    root.querySelectorAll('[data-zone]').forEach((zone, position) => visibleDuring(zone, [[reveal + 1000 + position * 150, Infinity, 400]]));
    track(required('[data-cable]'), [[0, { strokeDashoffset: '1px' }], [reveal + 1300, { strokeDashoffset: '1px' }, EASE.pan], [reveal + 1900, { strokeDashoffset: '0px' }]]);
    const battery = required('[data-battery]');
    const lifted = { opacity: 0, transform: 'translate(0px, -14px)' };
    track(battery, [[0, lifted], [reveal + 1800, lifted, EASE.out], [reveal + 2200, { opacity: 1, transform: 'translate(0px, 0px)' }]]);
    // The app raises its answer into place at full strength rather than fading it in.
    track(required('[data-result-body]'), [[0, { transform: shift(12) }], [reveal, { transform: shift(12) }, EASE.out], [reveal + 400, { transform: shift(0) }]]);
  }

  function sceneTime() {
    return still ? stageEnd(index) : stages[index].start + Number(clock.currentTime);
  }

  function seekScene(time) {
    scene.forEach((animation) => { animation.pause(); animation.currentTime = time; });
  }

  function playback() {
    root.dataset.playing = String(playing);
    playLabel.textContent = playing ? 'Pause walkthrough' : finished ? 'Play again' : 'Play walkthrough';
  }

  function pause() {
    clock.pause();
    scene.forEach((animation) => animation.pause());
    playing = false;
    playback();
  }

  function render() {
    generation += 1;
    playing = false;
    if (clock) clock.cancel();
    const stage = stages[index];
    root.dataset.stage = stage.name;
    indicator.style.transform = `translateX(${index * 100}%)`;
    status.textContent = stage.status;
    steps.forEach((step, position) => {
      if (position === index) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    clock = progress.animate([{ transform: still ? 'scaleX(1)' : 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: stage.duration, fill: 'both' });
    clock.pause();
    clock.currentTime = 0;
    // A still stage shows its last frame; a playing stage starts where the previous one ended.
    seekScene(still ? stageEnd(index) : stage.start);
    const currentGeneration = generation;
    clock.finished.then(() => {
      if (currentGeneration !== generation || !playing) return;
      if (index === stages.length - 1) {
        finished = true;
        pause();
      } else {
        index += 1;
        render();
        start();
      }
    }).catch((error) => {
      if (error.name !== 'AbortError') throw error;
    });
    playback();
  }

  function start() {
    // The visibility state applies to explicit Play as well as autoplay.
    if (!visible || document.hidden || playing) return;
    if (Number(clock.currentTime) >= stages[index].duration) clock.currentTime = 0;
    playing = true;
    const startTime = document.timeline.currentTime - Number(clock.currentTime);
    clock.play();
    clock.startTime = startTime;
    if (!still) {
      const sceneStart = startTime - stages[index].start;
      scene.forEach((animation) => { animation.play(); animation.startTime = sceneStart; });
    }
    playback();
  }

  function select(position, staticView = true) {
    pause();
    requestedPlay = false;
    index = position;
    finished = false;
    still = staticView || reduced.matches;
    render();
  }

  function playInView() {
    requestedPlay = true;
    if (visible) { requestedPlay = false; start(); }
    else root.scrollIntoView({ block: 'start' });
  }

  // Sizes in the scene follow the phone's width, so a resized phone gets a rebuilt timeline at the same moment.
  function rebuild() {
    if (Math.abs(screen.clientWidth - builtWidth) < .5) return;
    const time = sceneTime();
    buildScene();
    seekScene(time);
    if (playing && !still) {
      const sceneStart = clock.startTime - stages[index].start;
      scene.forEach((animation) => { animation.play(); animation.startTime = sceneStart; });
    }
  }

  playButton.addEventListener('click', (event) => {
    autoplayUsed = true;
    if (playing) { pause(); return; }
    const wantsStill = event.detail === 0 || reduced.matches;
    if (finished) select(0, wantsStill);
    else if (still !== wantsStill || Number(clock.currentTime) >= stages[index].duration) select(index, wantsStill);
    playInView();
  });
  steps.forEach((step, position) => step.addEventListener('click', () => {
    autoplayUsed = true;
    select(position);
  }));
  required('[data-demo-reset]').addEventListener('click', (event) => {
    autoplayUsed = true;
    select(0, event.detail === 0 || reduced.matches);
    if (!reduced.matches) playInView();
  });
  document.querySelector('[data-watch-demo]')?.addEventListener('click', (event) => {
    autoplayUsed = true;
    select(0, event.detail === 0 || reduced.matches);
    requestedPlay = !reduced.matches;
    if (visible && requestedPlay) { requestedPlay = false; start(); }
    root.focus({ preventScroll: true });
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  reduced.addEventListener('change', () => { select(index); });

  drawOnce();
  buildScene();
  render();
  new ResizeObserver(() => requestAnimationFrame(rebuild)).observe(screen);
  const phone = required('.phone-shell');
  let observer;
  function observePhone() {
    observer?.disconnect();
    // A landscape or zoomed viewport may never fit half the phone. Require half of
    // whichever is shorter so Play can still start when the available view is filled.
    const threshold = Math.min(.5, innerHeight / (2 * phone.getBoundingClientRect().height));
    observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= threshold;
      if (!visible) { pause(); return; }
      if (requestedPlay && !document.hidden) { requestedPlay = false; start(); }
      if (!autoplayUsed && !reduced.matches && !document.hidden) {
        autoplayUsed = true;
        start();
      }
    }, { threshold: [0, threshold] });
    // The explanation underneath need not be on screen.
    observer.observe(phone);
  }
  observePhone();
  window.addEventListener('resize', observePhone);
})();
