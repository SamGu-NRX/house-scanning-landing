(() => {
  // Keys that move focus or operate a control switch the page to keyboard mode, where the controls change at
  // once (see styles.css) and the phone's step highlight jumps instead of travelling. Scrolling with Space or
  // the arrows on the page itself does not count.
  document.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const onControl = event.target instanceof Element && event.target.closest('a, button, input, select, textarea, summary');
    if (event.key !== 'Tab' && !(onControl && ['Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key))) return;
    document.documentElement.dataset.input = 'keyboard';
  });
  document.addEventListener('pointerdown', () => { document.documentElement.dataset.input = 'pointer'; });
})();
