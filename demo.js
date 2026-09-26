(() => {
  const root = document.querySelector('[data-demo]');
  if (!root) return;

  const required = (selector) => {
    const element = root.querySelector(selector);
    if (!element) throw new Error(`Phone demo requires ${selector}.`);
    return element;
  };
  const playButton = required('[data-demo-play]');
  const nextButton = required('[data-demo-next]');
  const resetButton = required('[data-demo-reset]');
  const status = required('[data-demo-status]');
  const phases = [
    { name: 'capture', duration: 3200, text: 'Sample house capture. This concept demo does not use your camera.' },
    { name: 'reconstruct', duration: 4200, text: 'Illustration of a 3D model forming from the sample house.' },
    { name: 'measure', duration: 2400, text: 'Illustration of a scale check against a known reference distance.' },
    { name: 'fit', duration: 3200, text: 'Possible battery fit shown for illustration. An installer would need to verify the site.' },
  ];
  const steps = phases.map((phase) => required(`[data-demo-step="${phase.name}"]`));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0;
  let remaining = phases[0].duration;
  let startedAt = 0;
  let timer = null;
  let playing = false;
  let finished = false;
  let autoplayUsed = false;

  function renderPhase() {
    root.dataset.phase = phases[index].name;
    root.style.setProperty('--phase-duration', `${phases[index].duration}ms`);
    status.textContent = phases[index].text;
    steps.forEach((step, stepIndex) => {
      if (stepIndex === index) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
  }

  function renderPlayback() {
    root.dataset.playing = String(playing);
    playButton.textContent = playing ? 'Pause demo' : finished ? 'Play again' : 'Play demo';
  }

  function pause() {
    if (playing) remaining = Math.max(0, remaining - (performance.now() - startedAt));
    window.clearTimeout(timer);
    timer = null;
    playing = false;
    renderPlayback();
  }

  function schedule() {
    startedAt = performance.now();
    timer = window.setTimeout(() => {
      timer = null;
      if (index === phases.length - 1) {
        remaining = 0;
        playing = false;
        finished = true;
        renderPlayback();
        return;
      }
      index += 1;
      remaining = phases[index].duration;
      renderPhase();
      schedule();
    }, remaining);
  }

  function start(manual) {
    if (document.hidden) return;
    root.dataset.manual = String(manual || reducedMotion.matches);
    playing = true;
    renderPlayback();
    schedule();
  }

  function reset() {
    pause();
    index = 0;
    remaining = phases[0].duration;
    finished = false;
    renderPhase();
    renderPlayback();
  }

  playButton.addEventListener('click', (event) => {
    autoplayUsed = true;
    if (event.detail === 0) root.dataset.manual = 'true';
    if (playing) {
      pause();
      return;
    }
    if (finished) reset();
    start(event.detail === 0);
  });

  nextButton.addEventListener('click', () => {
    autoplayUsed = true;
    pause();
    index = (index + 1) % phases.length;
    remaining = phases[index].duration;
    finished = false;
    root.dataset.manual = 'true';
    renderPhase();
    renderPlayback();
  });

  resetButton.addEventListener('click', (event) => {
    autoplayUsed = true;
    reset();
    root.dataset.manual = 'true';
    if (!reducedMotion.matches) start(event.detail === 0);
    // Replaying capture keeps the same animation names, so reset their clocks too.
    root.getAnimations({ subtree: true }).forEach((animation) => { animation.currentTime = 0; });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
  reducedMotion.addEventListener('change', (event) => {
    if (event.matches) {
      pause();
      root.dataset.manual = 'true';
    }
  });

  root.dataset.manual = 'true';
  renderPhase();
  renderPlayback();

  const observer = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    const visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
    if (!visible) {
      pause();
      return;
    }
    if (!autoplayUsed && !reducedMotion.matches && !document.hidden) {
      autoplayUsed = true;
      start(false);
    }
  }, { threshold: [0, 0.5] });
  observer.observe(root);
})();
