(() => {
  const root = document.querySelector('[data-demo]');
  if (!root) return;
  const required = (selector) => {
    const element = root.querySelector(selector);
    if (!element) throw new Error(`Phone demo requires ${selector}.`);
    return element;
  };
  const playButton = required('[data-demo-play]');
  const playLabel = required('[data-demo-play-label]');
  const status = required('[data-demo-status]');
  const progress = required('[data-demo-progress]');
  const title = required('[data-demo-title]');
  const guidance = required('[data-demo-guidance]');
  const detail = required('[data-demo-detail]');
  const counter = required('[data-demo-counter]');
  const count = required('[data-demo-count]');
  const indicator = required('[data-demo-indicator]');
  const icon = required('[data-demo-icon]');
  const phases = [
    { name: 'capture', duration: 4000, icon: 'phone', title: 'Walk slowly past the meter', guidance: 'Keep the wall and ground in view as you move.', detail: 'Collecting different angles', status: 'An illustrated capture, not a camera feed. No images are collected.' },
    { name: 'reconstruct', duration: 4800, icon: 'model', title: 'The space takes shape', guidance: 'Different angles come together in one shared view.', detail: 'Connecting the views', status: 'An illustration of a model forming from several views of the same wall.' },
    { name: 'measure', duration: 3600, icon: 'ruler', title: 'Give the model a scale', guidance: 'Check the scale against an independent measurement.', detail: 'Reference measurement', status: 'A known distance sets the scale. A separate measurement checks it.' },
    { name: 'fit', duration: 4000, icon: 'battery', title: 'Consider a place for the battery', guidance: 'A possible location, ready for an installer to review.', detail: 'Candidate for review', status: 'This candidate is illustrative. Its dimensions and clearances need verification.' },
  ];
  const steps = phases.map((phase) => required(`[data-demo-step="${phase.name}"]`));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ease = 'cubic-bezier(.23, 1, .32, 1)';
  let index = 0;
  let animations = [];
  let clock;
  let generation = 0;
  let playing = false;
  let finished = false;
  let visible = false;
  let autoplayUsed = false;
  let requestedPlay = false;
  let still = reduced.matches;

  function animate(element, frames, options = {}) {
    const animation = element.animate(frames, { duration: phases[index].duration, fill: 'both', ...options });
    animation.pause();
    animation.currentTime = 0;
    animations.push(animation);
    return animation;
  }

  function playback() {
    root.dataset.playing = String(playing);
    playLabel.textContent = playing ? 'Pause walkthrough' : finished ? 'Play again' : 'Play walkthrough';
  }

  function pause() {
    animations.forEach((animation) => animation.pause());
    playing = false;
    playback();
  }

  function render() {
    generation += 1;
    playing = false;
    animations.forEach((animation) => animation.cancel());
    animations = [];
    const phase = phases[index];
    root.dataset.phase = phase.name;
    indicator.style.transform = `translateX(${index * 100}%)`;
    title.textContent = phase.title;
    guidance.textContent = phase.guidance;
    detail.textContent = phase.detail;
    counter.textContent = `0${index + 1} / 04`;
    count.textContent = `${index + 1} of 4`;
    icon.setAttribute('href', `#icon-${phase.icon}`);
    status.textContent = phase.status;
    steps.forEach((step, position) => {
      if (position === index) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    // The progress animation is also the phase clock. Pause and replay affect both.
    clock = animate(progress, [{ transform: still ? 'scaleX(1)' : 'scaleX(0)' }, { transform: 'scaleX(1)' }]);
    if (!still) {
      const house = required('.house-shape');
      const camera = required('.scene-camera');
      if (index === 0) {
        animate(camera, [{ transform: 'translateX(-10px) scale(1.15)' }, { transform: 'translateX(10px) scale(1.15)' }]);
        animate(required('.scan-beam'), [{ opacity: 0, transform: 'translateY(0)' }, { opacity: .55, offset: .2 }, { opacity: .55, offset: .8 }, { opacity: 0, transform: 'translateY(210px)' }]);
      } else if (index === 1) {
        animate(camera, [{ transform: 'translateX(10px) scale(1.15)' }, { transform: 'none', offset: .6 }], { easing: ease });
        animate(house, [{ opacity: .22 }, { opacity: .22, offset: .25 }, { opacity: 1, offset: .9 }]);
        animate(required('.point-cloud'), [{ opacity: .8 }, { opacity: 1, offset: .35 }, { opacity: 0, offset: .95 }]);
        root.querySelectorAll('.point-band').forEach((band, position) => {
          animate(band, [{ transform: `translate(${(position % 2 ? 1 : -1) * 18}px, ${14 - position * 5}px)` }, { transform: 'none', offset: .45 + position * .07 }], { easing: ease });
        });
      } else if (index === 2) {
        animate(required('.measure-layer'), [{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0% 0 0)', offset: .3 }], { easing: ease });
      } else {
        animate(required('.battery'), [{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none', offset: .18 }], { easing: ease });
      }
    }
    const currentGeneration = generation;
    clock.finished.then(() => {
      if (currentGeneration !== generation || !playing) return;
      if (index === phases.length - 1) {
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
    if (Number(clock.currentTime) >= phases[index].duration) clock.currentTime = 0;
    if (!still && Number(clock.currentTime) === 0) {
      animate(required('.sheet-heading'), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 250, easing: ease });
    }
    playing = true;
    const startTime = document.timeline.currentTime - Number(clock.currentTime);
    animations.forEach((animation) => { animation.play(); animation.startTime = startTime; });
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

  playButton.addEventListener('click', (event) => {
    autoplayUsed = true;
    if (playing) { pause(); return; }
    const wantsStill = event.detail === 0 || reduced.matches;
    if (finished) select(0, wantsStill);
    else if (still !== wantsStill || Number(clock.currentTime) >= phases[index].duration) select(index, wantsStill);
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
  document.querySelector('[data-watch-demo]').addEventListener('click', (event) => {
    autoplayUsed = true;
    select(0, event.detail === 0 || reduced.matches);
    requestedPlay = !reduced.matches;
    if (visible && requestedPlay) { requestedPlay = false; start(); }
    root.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', () => {
    autoplayUsed = true;
    requestedPlay = false;
    if (!still || playing) select(index);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  reduced.addEventListener('change', () => { select(index); });
  render();
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio >= .5;
    if (!visible) { pause(); return; }
    if (requestedPlay && !document.hidden) { requestedPlay = false; start(); }
    if (!autoplayUsed && !reduced.matches && !document.hidden) {
      autoplayUsed = true;
      start();
    }
  }, { threshold: [0, .5] });
  // Observe the screen itself: the explanation underneath need not be on screen.
  observer.observe(required('.phone-shell'));
})();
