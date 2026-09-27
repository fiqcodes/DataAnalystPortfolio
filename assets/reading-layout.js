/* Tall tools scroll with the page; only viewport-sized stages stay pinned. */
(() => {
  const stages = [...document.querySelectorAll('.reading-stage')];
  const measure = stage => stage.classList.toggle('can-stick', stage.offsetHeight <= innerHeight - 48);
  const observer = new ResizeObserver(entries => entries.forEach(({target}) => measure(target)));
  stages.forEach(stage => {observer.observe(stage);measure(stage);});
  addEventListener('resize', () => stages.forEach(measure), {passive:true});
})();
