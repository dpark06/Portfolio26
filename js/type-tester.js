/* Moving [Type] Face tester: type with the keyboard, each A–Z / 0–9 key becomes its drawn glyph.
   Keys without a glyph leave a blank space the width of a letter. */
(function () {
  var input = document.getElementById('tt-input'), out = document.getElementById('tt-out');
  if (!input || !out) return;
  var size = document.getElementById('tt-size'), clear = document.getElementById('tt-clear');
  var BASE = '../assets/type/';
  function src(ch) {
    var c = ch.toLowerCase();
    if (/[a-z]/.test(c)) return BASE + 'letter-' + c + '.webp';
    if (/[0-9]/.test(c)) return BASE + 'numeral-' + c + '.webp';
    return null;
  }
  // Warm the cache so glyphs appear the instant a key is pressed.
  'abcdefghijklmnopqrstuvwxyz0123456789'.split('').forEach(function (c) { var i = new Image(); i.src = src(c); });

  function render() {
    var text = input.value;
    out.textContent = '';
    text.split(' ').forEach(function (word, wi) {
      if (wi) { var sp = document.createElement('span'); sp.className = 'tester__space'; out.appendChild(sp); }
      var w = document.createElement('span'); w.className = 'tester__word';
      word.split('').forEach(function (ch) {
        var s = src(ch), g;
        if (s) { g = document.createElement('img'); g.src = s; g.alt = ''; g.className = 'tester__glyph'; }
        else { g = document.createElement('span'); g.className = 'tester__glyph tester__glyph--blank'; }
        w.appendChild(g);
      });
      out.appendChild(w);
    });
    var caret = document.createElement('span'); caret.className = 'tester__caret'; caret.setAttribute('aria-hidden', 'true');
    (out.lastChild || out).appendChild(caret);
    out.setAttribute('aria-label', text.trim() ? text : 'Empty');
  }
  function setSize() { out.style.setProperty('--glyph', size.value + 'px'); }

  input.addEventListener('input', render);
  size.addEventListener('input', setSize);
  clear.addEventListener('click', function () { input.value = ''; render(); input.focus(); });
  out.addEventListener('click', function () { input.focus(); });
  input.addEventListener('focus', function () { out.classList.add('is-focus'); });
  input.addEventListener('blur', function () { out.classList.remove('is-focus'); });
  setSize(); render();
})();
