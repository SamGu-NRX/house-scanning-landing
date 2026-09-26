(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Set();
  document.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (!['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Enter', ' ', 'Home', 'End'].includes(event.key)) return;
    document.documentElement.dataset.input = 'keyboard';
    running.forEach((animation) => animation.finish());
  });
  document.addEventListener('pointerdown', () => { document.documentElement.dataset.input = 'pointer'; });
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, position) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      if (reduced.matches || document.documentElement.dataset.input === 'keyboard') return;
      const animation = entry.target.animate([
        { opacity: 0, transform: 'translateY(18px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 600, delay: Math.min(position, 3) * 60, easing: 'cubic-bezier(.23, 1, .32, 1)' });
      running.add(animation);
      animation.finished.then(() => running.delete(animation));
    });
  }, { threshold: .12 });
  // Short, once-only entrances introduce sections without moving text as it is read.
  document.querySelectorAll('.hero-copy, .phone-demo, .purpose > *, .section-heading > *, .steps > li, .capture-art, .evidence-copy, .inside-columns > *, .model-art, .technical-row > *, .live-plan, .questions-intro, .questions, .closing-content > *').forEach((element) => observer.observe(element));
  // A native range keeps the coverage reveal usable by touch and keyboard.
  const coverage = document.querySelector('[data-coverage]');
  if (coverage) {
    const range = coverage.querySelector('input[type="range"]');
    const picture = coverage.querySelector('[data-coverage-image]');
    const divider = coverage.querySelector('[data-coverage-divider]');
    if (!range || !picture || !divider) throw new Error('Coverage study requires a range, image, and divider.');
    const reveal = () => {
      const value = Number(range.value);
      picture.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
      divider.style.transform = `translateX(${value}%)`;
      coverage.querySelector('.coverage-label').style.opacity = value < 15 ? '0' : '1';
      range.setAttribute('aria-valuetext', `${value}% of the illustration revealed`);
    };
    range.addEventListener('input', reveal);
    reveal();
  }
  reduced.addEventListener('change', () => {
    if (reduced.matches) running.forEach((animation) => animation.finish());
  });
})();
