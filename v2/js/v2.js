/* Stanton Realty Investments, v2. No dependencies. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var DATA = JSON.parse(document.getElementById('v2-data').textContent);
  var HOMES = {};
  DATA.homes.forEach(function (h) { HOMES[h.slug] = h; });
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /* ---------- header: solid after the hero, small-screen menu ---------- */
  var hdr = $('#hdr');
  var walk = $('.walk');
  var menuBtn = $('.menu-btn');
  var menu = $('#menu');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    menuBtn.textContent = open ? 'Close' : 'Menu';
    if (open) hdr.classList.add('solid'); else onScroll();
  }
  menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });

  /* ---------- 1. the walk-up: pinned hero, frames wipe upward on scroll ---------- */
  var frames = $$('.frame', walk);
  var capT = $('.walk-cap-t');
  var motionOn = false;
  var lastCap = -1;
  function setMotion() {
    motionOn = !reduce.matches && frames.length > 1;
    doc.classList.toggle('motion', motionOn);
    if (!motionOn) frames.forEach(function (f) { f.style.removeProperty('--t'); });
    onScroll();
  }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function updateWalk() {
    if (!motionOn) { showCap(0); return; }
    var r = walk.getBoundingClientRect();
    var travel = walk.offsetHeight - window.innerHeight;
    var p = travel > 0 ? clamp(-r.top / travel, 0, 1) : 0;
    var seg = p * (frames.length - 1);
    var current = 0;
    for (var i = 1; i < frames.length; i++) {
      // each frame holds still for a beat, then wipes up over the one below it
      var t = clamp((seg - (i - 1) - 0.12) / 0.76, 0, 1);
      frames[i].style.setProperty('--t', easeInOut(t).toFixed(4));
      if (t > 0.5) current = i;
    }
    showCap(current);
  }
  function showCap(i) {
    if (i === lastCap) return;
    lastCap = i;
    capT.textContent = frames[i].getAttribute('data-cap');
  }

  /* ---------- dock (small screens): after the hero, hidden over contact ---------- */
  var dock = $('#dock');
  var contact = $('#contact');
  var contactVisible = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { contactVisible = es[0].isIntersecting; onScroll(); }, { rootMargin: '0px 0px -10% 0px' }).observe(contact);
  }
  var formFocus = false;

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var pastHero = walk.getBoundingClientRect().bottom < window.innerHeight * 0.35;
      var pastTop = window.scrollY > 40;
      if (menu.hidden) hdr.classList.toggle('solid', pastHero || (!motionOn && pastTop));
      dock.classList.toggle('show', pastHero && !contactVisible && !formFocus);
      updateWalk();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  if (reduce.addEventListener) reduce.addEventListener('change', setMotion);
  setMotion();

  /* ---------- 3. lookbook rail: mark the home on screen ---------- */
  var railLinks = $$('.rail-list a');
  var railList = $('.rail-list');
  var spreads = $$('.spread');
  var active = null;
  function mark(n) {
    if (n === active) return;
    active = n;
    railLinks.forEach(function (a) {
      var on = a.getAttribute('data-rail') === String(n);
      if (on) {
        a.setAttribute('aria-current', 'true');
        var left = a.offsetLeft - (railList.clientWidth - a.offsetWidth) / 2;
        railList.scrollTo({ left: left, behavior: reduce.matches ? 'auto' : 'smooth' });
      } else a.removeAttribute('aria-current');
    });
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) mark(e.target.getAttribute('data-spread')); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    spreads.forEach(function (s) { io.observe(s); });
  }

  /* ---------- viewer ---------- */
  var viewer = $('#viewer');
  var vImg = document.createElement('img');   // created here so the page never ships an <img> without a src
  vImg.className = 'vw-img';
  vImg.alt = '';
  vImg.decoding = 'async';
  $('.vw-stage', viewer).insertBefore(vImg, $('.vw-stage', viewer).firstChild);
  var vAddr = $('.vw-addr', viewer);
  var vRoom = $('.vw-room', viewer);
  var vCount = $('.vw-count', viewer);
  var vHar = $('.vw-har', viewer);
  var set = [];
  var at = 0;
  var opener = null;
  function item(slug, i) {
    var h = HOMES[slug], ph = h.photos[i];
    return { src: ph.b, small: ph.s, alt: ph.alt, addr: h.addr, zip: h.zip, room: ph.label, har: h.har };
  }
  function render() {
    var it = set[at];
    vImg.src = it.src;
    vImg.alt = it.alt;
    vAddr.textContent = it.addr;
    vRoom.textContent = it.room + ', Houston ' + it.zip;
    vCount.textContent = (at + 1) + ' of ' + set.length;
    if (it.har) { vHar.href = it.har; vHar.hidden = false; } else vHar.hidden = true;
    var multi = set.length > 1;
    $('.vw-prev', viewer).hidden = !multi;
    $('.vw-next', viewer).hidden = !multi;
    if (multi) { var n = new Image(); n.src = set[(at + 1) % set.length].src; }
  }
  function go(d) { if (set.length < 2) return; at = (at + d + set.length) % set.length; render(); }
  function open(list, start, from) {
    set = list; at = start; opener = from || null;
    render();
    if (typeof viewer.showModal === 'function') viewer.showModal(); else viewer.setAttribute('open', '');
    doc.style.overflow = 'hidden';
    $('.vw-close', viewer).focus();
  }
  viewer.addEventListener('close', function () { doc.style.overflow = ''; if (opener) opener.focus(); });
  $('.vw-close', viewer).addEventListener('click', function () { viewer.close(); });
  $('.vw-prev', viewer).addEventListener('click', function () { go(-1); });
  $('.vw-next', viewer).addEventListener('click', function () { go(1); });
  viewer.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { go(1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); }
  });
  var sx = null, sy = null;
  var stage = $('.vw-stage', viewer);
  stage.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; });
  stage.addEventListener('pointerup', function (e) {
    if (sx === null) return;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  });
  stage.addEventListener('click', function (e) { if (e.target === stage) viewer.close(); });

  // Every photo link opens the viewer. Rooms open the chosen room across homes;
  // everything else opens the whole home.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-home]');
    if (!a || viewer.contains(a)) return;
    e.preventDefault();
    var slug = a.getAttribute('data-home');
    var i = parseInt(a.getAttribute('data-i') || '0', 10);
    if (a.getAttribute('data-set') === 'room') {
      var room = HOMES[slug].photos[i].room;
      var list = [], start = 0;
      $$('.rs-item:not([hidden]) .ph').forEach(function (el) {
        var s = el.getAttribute('data-home'), k = parseInt(el.getAttribute('data-i'), 10);
        if (HOMES[s].photos[k].room !== room) return;
        if (el === a) start = list.length;
        list.push(item(s, k));
      });
      open(list, start, a);
    } else {
      var h = HOMES[slug];
      open(h.photos.map(function (_, k) { return item(slug, k); }), i, a);
    }
  });

  /* ---------- 4. same room, twelve homes ---------- */
  var track = $('#rs-track');
  var tabs = $$('.tab');
  var status = $('#rs-status');
  var LABEL = { kitchen: 'kitchens', bath: 'baths', living: 'living rooms', outdoor: 'outdoor spaces', front: 'fronts' };
  function showRoom(room) {
    var n = 0;
    $$('.rs-item', track).forEach(function (li) {
      var on = li.getAttribute('data-room') === room;
      li.hidden = !on;
      if (on) n++;
    });
    tabs.forEach(function (t) { t.setAttribute('aria-pressed', String(t.getAttribute('data-room') === room)); });
    var homes = {};
    $$('.rs-item:not([hidden]) .ph', track).forEach(function (el) { homes[el.getAttribute('data-home')] = 1; });
    status.textContent = n + ' ' + LABEL[room] + ' across ' + Object.keys(homes).length + ' homes';
    track.scrollLeft = 0;
    updateRsNav();
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { showRoom(t.getAttribute('data-room')); }); });
  var rsPrev = $('[data-rs="-1"]'), rsNext = $('[data-rs="1"]');
  function updateRsNav() {
    rsPrev.disabled = track.scrollLeft < 4;
    rsNext.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  }
  function step(d) {
    var first = $('.rs-item:not([hidden])', track);
    var w = first ? first.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 16) : 300;
    track.scrollBy({ left: d * w, behavior: reduce.matches ? 'auto' : 'smooth' });
  }
  rsPrev.addEventListener('click', function () { step(-1); });
  rsNext.addEventListener('click', function () { step(1); });
  track.addEventListener('scroll', function () { requestAnimationFrame(updateRsNav); }, { passive: true });
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
  });
  showRoom('kitchen');

  /* ---------- 9. testimonials: swipe, buttons, gentle auto-advance ---------- */
  var qTrack = $('#q-track');
  var qs = $$('.q', qTrack);
  var dots = $$('.dot');
  var qc = $('.qc');
  var playBtn = $('.q-play');
  var qAt = 0, paused = false, hover = false, focusIn = false, inView = false, timer = null;
  function qGo(i, instant) {
    qAt = (i + qs.length) % qs.length;
    qTrack.scrollTo({ left: qAt * qTrack.clientWidth, behavior: (instant || reduce.matches) ? 'auto' : 'smooth' });
    dots.forEach(function (d, k) { if (k === qAt) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
  }
  $$('[data-qs]').forEach(function (b) { b.addEventListener('click', function () { qGo(qAt + parseInt(b.getAttribute('data-qs'), 10)); restart(); }); });
  dots.forEach(function (d, k) { d.addEventListener('click', function () { qGo(k); restart(); }); });
  var qScrollT = null;
  qTrack.addEventListener('scroll', function () {
    clearTimeout(qScrollT);
    qScrollT = setTimeout(function () {
      var i = Math.round(qTrack.scrollLeft / qTrack.clientWidth);
      if (i !== qAt) { qAt = i; dots.forEach(function (d, k) { if (k === qAt) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); }); }
    }, 120);
  }, { passive: true });
  function canRun() { return !reduce.matches && !paused && !hover && !focusIn && inView && !document.hidden; }
  function restart() {
    clearInterval(timer);
    timer = setInterval(function () { if (canRun()) qGo(qAt + 1); }, 8000);
  }
  function setAuto() {
    doc.classList.toggle('no-auto', reduce.matches);
    if (reduce.matches) clearInterval(timer); else restart();
  }
  qc.addEventListener('mouseenter', function () { hover = true; });
  qc.addEventListener('mouseleave', function () { hover = false; });
  qc.addEventListener('focusin', function () { focusIn = true; });
  qc.addEventListener('focusout', function (e) { if (!qc.contains(e.relatedTarget)) focusIn = false; });
  playBtn.addEventListener('click', function () {
    paused = !paused;
    playBtn.setAttribute('aria-pressed', String(paused));
    playBtn.setAttribute('aria-label', paused ? 'Play the quotes' : 'Pause the quotes');
    $('.q-play-t', playBtn).textContent = paused ? 'Play' : 'Pause';
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { inView = es[0].isIntersecting; }, { threshold: 0.4 }).observe(qc);
  }
  if (reduce.addEventListener) reduce.addEventListener('change', setAuto);
  setAuto();

  /* ---------- 6. sell form: writes a mailto, sends nothing itself ---------- */
  var form = $('#sell-form');
  var fstat = $('#sell-status');
  function setErr(input, msg) {
    var e = document.getElementById(input.id + '-err');
    if (e) e.textContent = msg || '';
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.elements.name, addr = form.elements.address, phone = form.elements.phone, email = form.elements.email, about = form.elements.about;
    var bad = [];
    setErr(name, name.value.trim() ? '' : 'Add your name so Austin knows who to reply to.');
    if (!name.value.trim()) bad.push(name);
    setErr(addr, addr.value.trim() ? '' : 'Add the property address.');
    if (!addr.value.trim()) bad.push(addr);
    var hasPhone = phone.value.replace(/\D/g, '').length >= 7;
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    setErr(email, email.value.trim() && !emailOk ? 'That email address looks incomplete.' : '');
    if (email.value.trim() && !emailOk) bad.push(email);
    if (!hasPhone && !emailOk) { setErr(phone, 'Add a phone number or an email address so Austin can reach you.'); bad.push(phone); }
    else setErr(phone, '');
    if (bad.length) { bad[0].focus(); fstat.hidden = true; return; }
    var body = 'Hello Austin,\n\nI would like to talk about selling a house.\n\n'
      + 'Name: ' + name.value.trim() + '\n'
      + 'Property address: ' + addr.value.trim() + '\n'
      + (hasPhone ? 'Phone: ' + phone.value.trim() + '\n' : '')
      + (emailOk ? 'Email: ' + email.value.trim() + '\n' : '')
      + (about.value.trim() ? '\nAbout the house:\n' + about.value.trim() + '\n' : '');
    var href = 'mailto:' + form.getAttribute('data-to') + '?subject=' + encodeURIComponent('Selling a house: ' + addr.value.trim()) + '&body=' + encodeURIComponent(body);
    fstat.hidden = false;
    fstat.textContent = 'Your email app should open now with the message written. It is not sent until you press send there. If nothing opened, call Austin at 713-208-0291.';
    window.location.href = href;
  });
  form.addEventListener('focusin', function (e) { if (e.target.matches('input, textarea')) { formFocus = true; onScroll(); } });
  form.addEventListener('focusout', function () { formFocus = false; onScroll(); });
})();
