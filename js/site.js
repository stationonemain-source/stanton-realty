/* Stanton Realty Investments — spec rebuild. No dependencies. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Mobile menu ---------- */
  var menuBtn = $('.menu-btn');
  var mobileNav = $('#mobile-nav');
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', function () {
      var open = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', String(!open));
      mobileNav.hidden = open;
    });
    $$('a', mobileNav).forEach(function (a) {
      a.addEventListener('click', function () { menuBtn.setAttribute('aria-expanded', 'false'); mobileNav.hidden = true; });
    });
  }

  /* ---------- Photo data ---------- */
  var dataEl = $('#work-data');
  var DATA = dataEl ? JSON.parse(dataEl.textContent) : null;
  var bySlug = {};
  if (DATA) DATA.projects.forEach(function (p) { bySlug[p.slug] = p; });

  function srcset(ph) { return ph.s800 + ' ' + ph.w800 + 'w, ' + ph.s1600 + ' ' + ph.w1600 + 'w'; }

  /* ---------- Viewer ---------- */
  var viewer = $('#viewer');
  var state = { project: null, i: 0 };

  function renderViewer() {
    var p = state.project, ph = p.photos[state.i];
    $('.v-title-text', viewer).textContent = p.addr;
    $('.v-sub', viewer).textContent = 'Houston ' + p.zip + ' · Sold · ' + (state.i + 1) + ' of ' + p.photos.length;
    var img = $('.v-stage img', viewer);
    if (!img) { img = document.createElement('img'); $('.v-stage', viewer).insertBefore(img, $('.v-prev', viewer)); }
    img.src = ph.s1600;
    img.srcset = srcset(ph);
    img.sizes = '100vw';
    img.alt = ph.alt;
    img.width = ph.w1600; img.height = ph.h1600;
    $('.v-cap', viewer).textContent = ph.room;
    var har = $('.v-har', viewer);
    if (p.har) { har.href = p.har; har.hidden = false; } else { har.hidden = true; }
    $$('.v-strip button', viewer).forEach(function (b, k) { b.setAttribute('aria-current', String(k === state.i)); });
    var cur = $('.v-strip button[aria-current="true"]', viewer);
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function openViewer(slug, i) {
    var p = bySlug[slug];
    if (!p || !viewer || typeof viewer.showModal !== 'function') return false;
    state.project = p; state.i = i || 0;
    var strip = $('.v-strip', viewer);
    strip.innerHTML = '';
    p.photos.forEach(function (ph, k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Photo ' + (k + 1) + ': ' + ph.room);
      b.innerHTML = '<img src="' + ph.s800 + '" alt="" loading="lazy">';
      b.addEventListener('click', function () { state.i = k; renderViewer(); });
      strip.appendChild(b);
    });
    renderViewer();
    viewer.showModal();
    return true;
  }
  function step(d) {
    if (!state.project) return;
    var n = state.project.photos.length;
    state.i = (state.i + d + n) % n;
    renderViewer();
  }
  if (viewer) {
    $('.v-prev', viewer).addEventListener('click', function () { step(-1); });
    $('.v-next', viewer).addEventListener('click', function () { step(1); });
    $('.v-close', viewer).addEventListener('click', function () { viewer.close(); });
    viewer.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    });
    viewer.addEventListener('click', function (e) { if (e.target === viewer) viewer.close(); });
    var x0 = null;
    var stage = $('.v-stage', viewer);
    stage.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    stage.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    });
  }

  // Any element with data-open="slug" (and optional data-i) opens the viewer; its href stays as the no-JS fallback.
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    if (openViewer(t.getAttribute('data-open'), parseInt(t.getAttribute('data-i') || '0', 10))) e.preventDefault();
  });

  /* ---------- Room filter ---------- */
  var grid = $('#work-grid');
  var homesHTML = grid ? grid.innerHTML : '';
  function renderRoom(room) {
    if (room === 'all') { grid.innerHTML = homesHTML; grid.classList.add('homes'); return; }
    grid.classList.remove('homes');
    var html = '';
    DATA.projects.forEach(function (p) {
      p.photos.forEach(function (ph, k) {
        if (ph.key !== room) return;
        html += '<a class="tile room" href="work.html#' + p.slug + '" data-open="' + p.slug + '" data-i="' + k + '">' +
          '<span class="ph"><img src="' + ph.s800 + '" srcset="' + srcset(ph) + '" sizes="(min-width: 900px) 30vw, 50vw" width="' + ph.w800 + '" height="' + ph.h800 + '" alt="' + ph.alt + '" loading="lazy" decoding="async"></span>' +
          '<span class="tile-meta"><span><span class="tile-addr">' + p.addr + '</span><span class="tile-sub label">' + ph.room + ' · Houston ' + p.zip + '</span></span></span></a>';
      });
    });
    grid.innerHTML = html;
  }
  $$('.filter').forEach(function (btn) {
    btn.addEventListener('click', function () {
      $$('.filter').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      renderRoom(btn.getAttribute('data-room'));
      var live = $('#work-live');
      if (live) live.textContent = btn.getAttribute('data-announce');
    });
  });

  /* ---------- Sell-your-house form: composes an email, sends nothing itself ---------- */
  var form = $('#sell-form');
  if (form) {
    var TO = form.getAttribute('data-to');
    function setErr(input, msg) {
      var err = $('#' + input.id + '-err');
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg || '';
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name, addr = form.elements.address, phone = form.elements.phone, email = form.elements.email, about = form.elements.about;
      var ok = true;
      setErr(name, ''); setErr(addr, ''); setErr(phone, '');
      if (!name.value.trim()) { setErr(name, 'Add your name so Austin knows who is writing.'); ok = false; }
      if (!addr.value.trim()) { setErr(addr, 'Add the property address, or at least the street and neighborhood.'); ok = false; }
      if (!phone.value.trim() && !email.value.trim()) { setErr(phone, 'Add a phone number or an email so we can reach you.'); ok = false; }
      if (!ok) { var first = $('[aria-invalid="true"]', form); if (first) first.focus(); return; }
      var lines = [
        'Hi Austin,', '',
        'I would like to talk about selling my house.', '',
        'Property: ' + addr.value.trim(),
        'Name: ' + name.value.trim()
      ];
      if (phone.value.trim()) lines.push('Phone: ' + phone.value.trim());
      if (email.value.trim()) lines.push('Email: ' + email.value.trim());
      if (about.value.trim()) { lines.push('', 'About the house:', about.value.trim()); }
      var href = 'mailto:' + TO + '?subject=' + encodeURIComponent('Selling my house: ' + addr.value.trim()) + '&body=' + encodeURIComponent(lines.join('\n'));
      var status = $('#sell-status');
      status.hidden = false;
      status.textContent = 'Your email app should now be open with the message written. Press send there to reach Austin. If nothing opened, email ' + TO + ' or call 713-208-0291.';
      window.location.href = href;
    });
  }
})();
