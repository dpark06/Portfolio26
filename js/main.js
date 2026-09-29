// Dominic Park — portfolio interactions
// Everything here is progressive: the site reads fine with JS off.
(function () {
  document.documentElement.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Reveal on scroll ----------
  var revealables = document.querySelectorAll('.reveal, .bars');
  // Anything already on screen at load shows right away.
  revealables.forEach(function (el) {
    var r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
  });
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  }

  // ---------- Lightbox (keyboard + screen reader friendly) ----------
  var zoomables = document.querySelectorAll('img[data-zoom]');
  if (zoomables.length) {
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Enlarged image');
    box.innerHTML =
      '<button class="btn lightbox__close" type="button">Close <span aria-hidden="true">×</span></button>' +
      '<div><img alt=""><p class="lightbox__cap"></p></div>';
    document.body.appendChild(box);
    var bImg = box.querySelector('img');
    var bCap = box.querySelector('.lightbox__cap');
    var bClose = box.querySelector('.lightbox__close');
    var lastFocus = null;

    function open(img) {
      lastFocus = img;
      bImg.src = img.currentSrc || img.src;
      bImg.alt = img.alt;
      var fig = img.closest('figure');
      var cap = fig && fig.querySelector('figcaption');
      bCap.textContent = cap ? cap.textContent : '';
      box.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      setTimeout(function () { bClose.focus(); }, 60);
    }
    function close() {
      box.classList.remove('is-open');
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    }
    zoomables.forEach(function (img) {
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'Enlarge image: ' + img.alt);
      img.addEventListener('click', function () { open(img); });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
      });
    });
    bClose.addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') { e.preventDefault(); bClose.focus(); } // single focusable: trap
    });
  }

  // ---------- Videos: autoplay only when motion is OK, always pausable ----------
  document.querySelectorAll('.video-wrap').forEach(function (wrap) {
    var v = wrap.querySelector('video');
    var b = wrap.querySelector('.video-toggle');
    if (!v || !b) return;
    function sync() {
      var playing = !v.paused;
      b.textContent = playing ? 'Pause' : 'Play';
      b.setAttribute('aria-label', (playing ? 'Pause' : 'Play') + ' prototype video');
    }
    if (!reduce) { v.play().catch(function () {}); }
    b.addEventListener('click', function () { v.paused ? v.play() : v.pause(); });
    v.addEventListener('play', sync);
    v.addEventListener('pause', sync);
    sync();
  });

  // ---------- Table of contents: highlight the section in view ----------
  var tocLinks = document.querySelectorAll('.toc a[href^="#"]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        tocLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
        var a = map[e.target.id];
        if (a) {
          a.setAttribute('aria-current', 'true');
          // keep the active chip visible on narrow screens
          var bar = a.parentElement;
          if (bar.scrollWidth > bar.clientWidth) {
            bar.scrollTo({ left: a.offsetLeft - 24, behavior: reduce ? 'auto' : 'smooth' });
          }
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
  }

  // ---------- Tabs (website viewer) ----------
  document.querySelectorAll('[role="tablist"]').forEach(function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t, false); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') n = tabs[0];
        if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
  });

  // ---------- Current year ----------
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();

/* ---------- Collections switch: UX Design (dark) / Branding (light) ---------- */
(function () {
  var root = document.documentElement;
  var groups = Array.prototype.slice.call(document.querySelectorAll('.view-switch'));
  if (!groups.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var list = document.querySelector('.work-grid');

  function sync() {
    var v = root.getAttribute('data-view');
    groups.forEach(function (g) {
      g.querySelectorAll('[data-view]').forEach(function (b) {
        var on = b.getAttribute('data-view') === v;
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
    });
  }

  function setView(v, focusGroup) {
    if (v === root.getAttribute('data-view')) return;
    root.classList.add('view-anim');
    root.setAttribute('data-view', v);
    root.setAttribute('data-theme', v === 'ux' ? 'dark' : 'light');
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = v === 'ux' ? '#0d0d10' : '#ffffff';
    try { localStorage.setItem('dp-view', v); } catch (e) {}
    try {
      var url = new URL(location.href);
      if (v === 'branding') url.searchParams.set('view', 'branding'); else url.searchParams.delete('view');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch (e) {}
    sync();
    if (focusGroup) focusGroup.querySelector('[data-view="' + v + '"]').focus();
    if (list && !reduce) {
      list.classList.remove('is-swapping'); void list.offsetWidth; list.classList.add('is-swapping');
      // newly shown cards should be visible even if the scroll-reveal already ran
      list.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-in'); });
    }
    setTimeout(function () { root.classList.remove('view-anim'); }, 500);
  }

  groups.forEach(function (g) {
    g.addEventListener('click', function (e) {
      var b = e.target.closest('[data-view]');
      if (b) setView(b.getAttribute('data-view'));
    });
    g.addEventListener('keydown', function (e) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].indexOf(e.key) < 0) return;
      e.preventDefault();
      var v = root.getAttribute('data-view');
      var next = e.key === 'Home' ? 'ux' : e.key === 'End' ? 'branding' : (v === 'ux' ? 'branding' : 'ux');
      setView(next, g);
    });
  });
  sync();
})();
