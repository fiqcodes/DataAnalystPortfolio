(() => {
  'use strict';
  document.documentElement.classList.add('js-enabled');
  const $ = id => document.getElementById(id);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = $('motion-toggle');
  let paused = reduceMotion.matches;
  let manuallyPaused = false;
  let roleIndex = 0;
  const identities = ['Data Analyst', 'Business Intelligence', 'Data Warehouse', 'AI Experimenter', 'Problem Solver'];
  const roleTitle = $('rotating-title');
  let roleTimer;
  let deleting = true;
  let letterCount = identities[0].length;

  function typeRole() {
    if (paused) return;
    if (document.hidden) { roleTimer = setTimeout(typeRole, 200); return; }
    const title = identities[roleIndex];
    letterCount += deleting ? -1 : 1;
    roleTitle.textContent = title.slice(0, letterCount);
    let delay = deleting ? 45 : 85;
    if (letterCount === 0) {
      roleIndex = (roleIndex + 1) % identities.length;
      deleting = false;
      delay = 300;
    } else if (letterCount === title.length && !deleting) {
      deleting = true;
      delay = 1900;
    }
    roleTimer = setTimeout(typeRole, delay);
  }

  const toolkitButton = $('toolkit-toggle');
  toolkitButton.addEventListener('click', () => {
    const expanded = toolkitButton.getAttribute('aria-expanded') !== 'true';
    toolkitButton.setAttribute('aria-expanded', String(expanded));
    $('toolkit-content').hidden = !expanded;
    toolkitButton.setAttribute('aria-label', expanded ? 'Minimize toolkit' : 'Restore toolkit');
    toolkitButton.title = expanded ? 'Minimize toolkit' : 'Restore toolkit';
    toolkitButton.querySelector('i').className = expanded ? 'fas fa-window-minimize' : 'fas fa-window-maximize';
  });

  function updateMotion() {
    clearTimeout(roleTimer);
    roleTitle.textContent = identities[roleIndex];
    letterCount = identities[roleIndex].length;
    deleting = true;
    if (!paused) roleTimer = setTimeout(typeRole, 1900);
    document.body.classList.toggle('motion-paused', paused);
    document.body.classList.toggle('motion-enabled', !paused);
    motionButton.setAttribute('aria-pressed', String(paused));
    const label = paused ? 'Resume animations' : 'Pause animations';
    motionButton.setAttribute('aria-label', label);
    motionButton.title = label;
    motionButton.querySelector('i').className = paused ? 'fas fa-play' : 'fas fa-pause';
  }
  motionButton.addEventListener('click', () => { paused = !paused; manuallyPaused = true; updateMotion(); });
  reduceMotion.addEventListener('change', () => { if (!manuallyPaused) paused = reduceMotion.matches; updateMotion(); });
  updateMotion();

  const filters = [...document.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('.project-card')];
  filters.forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    cards.forEach(card => { card.hidden = filter !== 'all' && card.dataset.category !== filter; });
    const count = cards.filter(card => !card.hidden).length;
    $('project-count').textContent = `${count} project${count === 1 ? '' : 's'}`;
  }));

  const navLinks = [...document.querySelectorAll('#main-nav a')];
  const sections = navLinks.map(link => document.querySelector(link.getAttribute('href')));
  let scrollFrame;
  function updateNavigation() {
    let current = null;
    sections.forEach(section => { if (section.getBoundingClientRect().top < 180) current = section.id; });
    navLinks.forEach(link => {
      if (link.hash === `#${current}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    scrollFrame = null;
  }
  addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateNavigation); }, {passive:true});
  updateNavigation();
  $('year').textContent = new Date().getFullYear();

  let copyTimer;
  $('copy-email').addEventListener('click', async () => {
    clearTimeout(copyTimer);
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText('rafiqnaufal97@gmail.com');
      $('copy-status').textContent = 'Email copied.';
    } catch {
      $('copy-status').textContent = 'Copy unavailable. Use the email link.';
    }
    copyTimer = setTimeout(() => { $('copy-status').textContent = ''; }, 4500);
  });

  // Public profile content can be supplied without modifying the page layout.
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function safeLink(url) {
    try { const parsed = new URL(url, location.href); return ['https:', 'http:', 'file:'].includes(parsed.protocol) ? parsed.href : null; }
    catch { return null; }
  }
  const profile = window.PERSONAL_PROFILE || {};
  if (Array.isArray(profile.experience) && profile.experience.length) {
    const content = $('experience-content');
    const marquee = element('div', 'logo-marquee');
    const track = element('div', 'logo-track');
    const group = element('div', 'logo-group');
    const list = element('div', 'experience-list');
    profile.experience.forEach(item => {
      if (item.logo && safeLink(item.logo)) {
        const img = element('img'); img.src = safeLink(item.logo); img.alt = item.company; img.loading = 'lazy'; group.append(img);
      } else group.append(element('span', 'company-placeholder', item.company));
      const details = element('details', 'experience-entry');
      const summary = element('summary');
      const row = element('span', 'experience-row');
      row.append(element('span', 'mono', item.dates), element('strong', '', item.role), element('span', '', item.company), element('span', '', '+'));
      summary.append(row); details.append(summary, element('p', '', item.description));
      if (item.url && safeLink(item.url)) {
        const p = element('p'); const link = element('a', 'text-link', item.company); link.href = safeLink(item.url); p.append(link); details.append(p);
      }
      list.append(details);
    });
    const clone = group.cloneNode(true); clone.setAttribute('aria-hidden', 'true');
    track.append(group, clone); marquee.append(track); content.replaceChildren(marquee, list);
  }
  if (Array.isArray(profile.certificates) && profile.certificates.length) {
    const grid = element('div', 'certificate-grid');
    profile.certificates.forEach(item => {
      const card = element('article', 'certificate-card');
      const destination = item.url && safeLink(item.url);
      const container = destination ? element('a') : element('div');
      if (destination) container.href = destination;
      if (item.image && safeLink(item.image)) {
        const image = element('img'); image.src = safeLink(item.image); image.alt = `${item.title} certificate`; image.loading = 'lazy'; container.append(image);
      }
      const info = element('div', 'certificate-info');
      info.append(element('span', 'mono', item.issuer), element('h3', '', item.title), element('p', '', item.year));
      container.append(info); card.append(container); grid.append(card);
    });
    $('certificate-content').replaceChildren(grid);
  }

  const certificateRow = $('certificate-content');
  const certificateGroup = certificateRow.querySelector('.certificate-grid');
  const certificateTrack = element('div', 'certificate-track');
  const certificateCopy = certificateGroup.cloneNode(true);
  certificateCopy.classList.add('certificate-copy');
  certificateCopy.setAttribute('aria-hidden', 'true');
  certificateCopy.querySelectorAll('a, button, [tabindex]').forEach(node => node.tabIndex = -1);
  certificateTrack.append(certificateGroup, certificateCopy);
  certificateRow.replaceChildren(certificateTrack);
  let certificateWidth = 0;
  const certificateResize = new ResizeObserver(() => {
    certificateWidth = certificateGroup.getBoundingClientRect().width;
    certificateCopy.hidden = certificateWidth <= certificateRow.clientWidth;
  });
  certificateResize.observe(certificateRow);
  certificateResize.observe(certificateGroup);
  let certificateHovered = false;
  let certificateHoldUntil = 0;
  let certificatePosition = 0;
  let certificateLastFrame = 0;
  certificateRow.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') certificateHovered = true; });
  certificateRow.addEventListener('pointerleave', () => { certificateHovered = false; });
  ['pointerdown', 'touchmove', 'wheel', 'keydown'].forEach(type => certificateRow.addEventListener(type, () => {
    certificateHoldUntil = performance.now() + 3000;
  }, {passive:true}));
  function scrollCertificates(now) {
    const elapsed = Math.min(now - certificateLastFrame, 50);
    certificateLastFrame = now;
    const width = certificateWidth;
    const moving = !paused && !document.hidden && !certificateHovered
      && !certificateRow.contains(document.activeElement) && now > certificateHoldUntil
      && width > certificateRow.clientWidth;
    // Accumulate subpixel movement; integer scroll rounding would stall slow speeds.
    if (moving) {
      certificatePosition = (certificatePosition + elapsed * 0.028) % width;
      certificateRow.scrollLeft = certificatePosition;
    } else certificatePosition = certificateRow.scrollLeft;
    requestAnimationFrame(scrollCertificates);
  }
  requestAnimationFrame(scrollCertificates);

  // Keep established incoming homepage anchors useful after the redesign.
  const aliases = {banner:'home', two:'projects', three:'projects', five:'projects', six:'projects', seven:'projects', eight:'projects', nine:'projects', end:'contact'};
  const target = aliases[location.hash.slice(1)];
  if (target) requestAnimationFrame(() => $(target).scrollIntoView());
})();
