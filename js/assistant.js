/*
  Ask about Dominic — on-site assistant.
  Answers come only from ASK_KB (curated from the resume + portfolio) and ASK_INDEX
  (auto-built from the case study pages). Nothing is sent anywhere.
  To plug in a real AI model later, replace `answer()` with a call to a private
  server endpoint that receives the same sources as context.
*/
(function () {
  'use strict';
  var script = document.currentScript;
  var ROOT = new URL('../', script.src).href;            // site root (js/ lives one level down)
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var KB = window.ASK_KB || [], INDEX = window.ASK_INDEX || [];
  var EMAIL = 'dominic.park.j@gmail.com';
  var STARTERS = ['What UX research has Dominic done?', 'Summarize Providence Promise', 'Which tools does Dominic use?',
                  'What did Dominic do at Cheil USA?', 'Which projects include usability testing?', 'How do I contact Dominic?'];

  // ---------- text helpers ----------
  var STOP = 'a an the and or of to in on for with at by from is are was were be been do does did has have had i me my you your it its this that what which who whom how why when where can could would should will about tell show give list please dominic dominics s his her their them they he she many much people any also just some there here get go going want know into went were used use using happen happened like'.split(' ');
  function norm(s) { return (' ' + s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9#.+' ]+/g, ' ').replace(/\s+/g, ' ') + ' ').replace(/\.+ /g, ' '); }
  function stem(w) { return w.replace(/'s$/, '').replace(/(ing|ed|es|s)$/, '').replace(/[.']/g, ''); }
  function tokens(s) { return norm(s).trim().split(' ').filter(function (w) { return w && STOP.indexOf(w) < 0; }).map(stem).filter(function (w) { return w && STOP.indexOf(w) < 0; }); }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function href(p) { return /^(https?:|mailto:)/.test(p) ? p : ROOT + p; }

  // ---------- engine ----------
  function scoreKB(q) {
    var nq = norm(q), qt = tokens(q), best = null;
    KB.forEach(function (e) {
      var sc = 0, used = [], w = e.ent ? 2 : 1;
      e.k.forEach(function (k) {
        var phrase = /^".*"$/.test(k), kk = k.replace(/"/g, '').toLowerCase();
        if (kk.indexOf(' ') > -1 || phrase) { if (nq.indexOf(' ' + kk + ' ') > -1) { sc += (phrase ? 2 : 1.6) * w; used = used.concat(tokens(kk)); } }
        else if (qt.indexOf(stem(kk)) > -1 && used.indexOf(stem(kk)) < 0) { sc += w; used.push(stem(kk)); }
      });
      if (e.min && qt.length > 2) sc = 0;                 // greetings only when the message is short
      if (!best || sc > best.sc) best = { e: e, sc: sc, used: used, qt: qt };
    });
    return best;
  }
  var DOCS = INDEX.map(function (d) {
    var text = [d.p, d.t, d.hd, (d.h.split('#')[1] || '').replace(/-/g, ' '), d.x, d.f, (d.l || []).join(' ')].join(' ');
    return { d: d, toks: tokens(text), head: tokens([d.p, d.t, d.hd, (d.h.split('#')[1] || '').replace(/-/g, ' ')].join(' ')) };
  });
  var DF = {}; DOCS.forEach(function (doc) { var seen = {}; doc.toks.forEach(function (t) { if (!seen[t]) { DF[t] = (DF[t] || 0) + 1; seen[t] = 1; } }); });
  function searchIndex(q, proj, only) {
    var qt = only || tokens(q); if (!qt.length) return [];
    var N = DOCS.length;
    return DOCS.filter(function (doc) { return !proj || doc.d.p === proj; }).map(function (doc) {
      var sc = 0;
      qt.forEach(function (t) {
        var tf = doc.toks.filter(function (x) { return x === t; }).length;
        if (tf) sc += (1 + Math.log(tf)) * Math.log(1 + N / (DF[t] || 1)) + (doc.head.indexOf(t) > -1 ? 1.5 : 0);
      });
      var cov = qt.filter(function (t) { return doc.toks.indexOf(t) > -1; }).length / qt.length;
      return { doc: doc.d, sc: sc, cov: cov };
    }).filter(function (r) { return r.sc > 0; }).sort(function (a, b) { return b.sc - a.sc; }).slice(0, 2);
  }
  function snippet(text, q) {
    var sentences = (text || '').match(/[^.!?]+[.!?]+["”’]?/g) || [text || ''], qt = tokens(q);
    sentences = sentences.map(function (s) { return s.trim(); });
    var ranked = sentences.map(function (s, i) { var st = tokens(s); return { s: s, i: i, sc: qt.filter(function (t) { return st.indexOf(t) > -1; }).length }; })
      .sort(function (a, b) { return b.sc - a.sc || a.i - b.i; }).slice(0, 2).sort(function (a, b) { return a.i - b.i; });
    return ranked.map(function (r) { return r.s; }).join(' ');
  }
  // Which case study is open? Lets "summarize this" or "what were the results?" mean this page.
  var PAGE = location.pathname.split('/').pop() || 'index.html';
  var HERE = KB.filter(function (e) { return e.proj && e.s[0][1].split('#')[0] === 'work/' + PAGE; })[0] || null;
  if (HERE) STARTERS = ['Summarize this project', 'What was the problem here?', 'What research went into this?',
                        'What were the results?', 'Which tools were used here?', 'How do I contact Dominic?'];

  var GENERIC = tokens('usa samsung summarize summary overview project projects tell explain describe work case study about more detail details info information do did doing make made');
  function fromIndex(found, q) {
    var paras = ['Here’s what the portfolio says:'], sources = [];
    found.forEach(function (r) {
      var d = r.doc, text = snippet([d.x, (d.f || '').split('; ').join('. ') + (d.f ? '.' : ''), (d.l || []).map(function (li) { return /[.!?]$/.test(li) ? li : li + '.'; }).join(' ')].join(' '), q);
      if (text) paras.push('• ' + d.p + (d.hd ? ', “' + d.hd + '”' : '') + ': ' + text);
      sources.push([d.p + (d.t && d.t !== 'Overview' ? ': ' + d.t : ''), d.h]);
    });
    return paras.length > 1 ? { paras: paras, sources: sources, follow: ['Show me the projects', 'How do I contact Dominic?'] } : null;
  }
  // ---------- across projects ----------
  // "Which projects use 3D?" is answered from every case study's Role and Tools facts, so a new
  // project page shows up here as soon as the index is rebuilt; nothing is hard-coded per project.
  var TOPICS = [
    { k: ['3d', 'three d', 'blender', 'cinema 4d', 'c4d', 'spline', 'modeling', 'modelling', 'render', 'rendering'], label: '3D', lead: 'use 3D', terms: ['3d', 'blender', 'cinema 4d', 'c4d', 'spline'] },
    { k: ['code', 'coding', 'coded', 'html', 'css', 'javascript', 'js', 'develop', 'built a website'], label: 'code', lead: 'involve code', terms: ['html', 'css', 'js', 'github'] },
    { k: ['ai', 'generative'], label: 'AI', lead: 'use AI', terms: ['generative ai', ' ai'] },
    { k: ['packaging', 'package', 'box'], label: 'packaging', lead: 'include packaging', terms: ['packaging'] },
    { k: ['research', 'user research'], label: 'research', lead: 'involve research', terms: ['research'] },
    { k: ['brand', 'branding', 'identity', 'rebrand'], label: 'branding', lead: 'involve branding or art direction', terms: ['identity', 'brand', 'art direction'] },
    { k: ['web', 'website', 'site', 'web design'], label: 'web', lead: 'include web design', terms: ['website', 'web ui', 'navigation', 'page design'] },
    { k: ['illustration', 'illustrate', 'drawing', 'drawn', 'procreate'], label: 'illustration', lead: 'include illustration', terms: ['illustration', 'procreate'] },
    { k: ['typography', 'type', 'typeface', 'font', 'lettering'], label: 'type design', lead: 'involve type design', terms: ['type designer', 'typeface'] },
    { k: ['photo', 'photography', 'camera', 'photoshoot'], label: 'photography', lead: 'include photography', terms: ['photography', 'camera'] },
    { k: ['team', 'teams', 'group', 'collaborat'], label: 'a team', lead: 'were team projects', whole: 'Team', terms: ['designers', 'interns', 'volunteer designers'] },
    { k: ['solo', 'alone', 'by himself', 'independent', 'self-initiated', 'personal'], label: 'solo', lead: 'were solo', whole: 'Team', terms: ['solo'] },
    { k: ['figma'], label: 'Figma', lead: 'use Figma', terms: ['figma'] }, { k: ['illustrator'], label: 'Illustrator', lead: 'use Illustrator', terms: ['illustrator'] },
    { k: ['photoshop'], label: 'Photoshop', lead: 'use Photoshop', terms: ['photoshop'] }, { k: ['figjam'], label: 'FigJam', lead: 'use FigJam', terms: ['figjam'] }
  ];
  var CROSS = /\s(which|what|any|other|all|how many)\s(of\s)?(his\s|dominic's\s|the\s|your\s)?(other\s)?(projects?|work|case studies|pieces)\s|\sprojects?\s(that|with|use|using|uses|used|include|including|involve|involving|have|has|where)\s|\sany\s.+\s(work|projects?)\s|\sdoes\s.*\s(do|use|know)\s.*\s(work|projects?)\s/;
  function topicFor(q) {
    var nq = norm(q), qt = tokens(q);
    return TOPICS.filter(function (t) { return t.k.some(function (k) { return k.indexOf(' ') > -1 ? nq.indexOf(' ' + k + ' ') > -1 : qt.indexOf(stem(k)) > -1; }); })[0] || null;
  }
  function crossProject(q, topic) {
    var hits = [];
    INDEX.filter(function (d) { return d.t === 'Overview'; }).forEach(function (d) {
      var items = [];
      (d.f || '').split('; ').forEach(function (part) {
        var m = part.match(/^(Role|Tools|Team):\s*(.*)$/); if (!m) return;
        if (topic.whole) { if (m[1] === topic.whole && topic.terms.some(function (t) { return m[2].toLowerCase().indexOf(t) > -1; })) items.push(m[2]); return; }
        m[2].split(/,\s*|:\s*/).forEach(function (item) {
          var low = ' ' + item.toLowerCase() + ' ';
          if (topic.terms.some(function (t) { return low.indexOf(t) > -1; }) && items.indexOf(item.trim()) < 0) items.push(item.trim());
        });
      });
      if (items.length) hits.push({ d: d, items: items });
    });
    if (!hits.length) return null;
    return {
      paras: [(hits.length === 1 ? 'One project ' + topic.lead.replace(/^use /, 'uses ').replace(/^involve /, 'involves ').replace(/^include /, 'includes ').replace(/^were team projects/, 'was a team project').replace(/^were /, 'was ') : hits.length + ' projects ' + topic.lead) + ':']
        .concat(hits.map(function (h) { return '• ' + h.d.p + ': ' + h.items.join(', '); })),
      sources: hits.map(function (h) { return [h.d.p, h.d.h]; }),
      follow: ['Summarize ' + hits[0].d.p].concat(hits[1] ? ['Summarize ' + hits[1].d.p] : []).concat(['Show me the projects'])
    };
  }

  function overviewOf(proj) { return INDEX.filter(function (d) { return d.t === 'Overview' && d.p === proj; })[0]; }
  function factOf(d, key) { var m = (d && d.f || '').split('; ').filter(function (p) { return p.indexOf(key + ':') === 0; })[0]; return m ? m.slice(key.length + 1).trim() : ''; }
  var TIME = /\s(how long|how much time|how many weeks|how quickly|how fast|duration|timeline|turnaround|weeks? (did|does|to)|time (did|does|to|it)|take to (finish|design|make|complete))\s/;
  function timeAnswer(proj) {
    if (proj) {
      var d = overviewOf(proj), dur = factOf(d, 'Duration');
      if (dur) return { paras: [/present/.test(dur) ? proj + ' is ongoing: ' + dur + '.' : proj + ' took ' + dur.replace(/^About/, 'about') + '.', 'Team: ' + factOf(d, 'Team') + '.'], sources: [[proj, d.h]], follow: ['How long do Dominic’s projects take?', 'How did ' + proj + ' come to life?'] };
    }
    var rows = INDEX.filter(function (d) { return d.t === 'Overview' && factOf(d, 'Duration'); });
    return {
      paras: ['It depends on the project. Dominic’s own projects usually take one to three weeks from research to finished design; team and client work runs longer, on the partner’s schedule.']
        .concat(rows.map(function (d) { return '• ' + d.p + ': ' + factOf(d, 'Duration') + ' (' + factOf(d, 'Team').split(/[,:]/)[0] + ')'; })),
      sources: [['All work', 'index.html#work']],
      follow: ['What is Dominic’s design process?', 'Which projects were team projects?']
    };
  }
  // "How did Mr. Zeno come to life?" → the case study's own chapters, in order.
  var STORY = /\s(come to life|came to life|process|workflow|story|journey|steps|made|built|develop|developed|start to finish|walk me through)\s/;
  function storyAnswer(proj) {
    var ch = INDEX.filter(function (d) { return d.p === proj && d.t && d.t !== 'Overview' && d.hd; });
    if (!ch.length) return null;
    return {
      paras: ['How ' + proj + ' came together, chapter by chapter:'].concat(ch.map(function (d) { return '• ' + d.t + ': ' + d.hd; })),
      sources: [[proj + ' case study', ch[0].h.split('#')[0]]],
      follow: ['What is Dominic’s design process?', 'How long did ' + proj + ' take?']
    };
  }

  function answer(q) {
    var nq0 = norm(q), named = scoreKB(q);
    var proj = named && named.sc >= 2 && named.e.proj ? named.e.proj
             : HERE && (/\s(this|here|it)\s/.test(nq0) || !(named && named.sc >= 1)) ? HERE.proj : null;
    if (TIME.test(nq0)) return timeAnswer(named && named.sc >= 2 && named.e.proj ? named.e.proj : HERE && /\s(this|here|it)\s/.test(nq0) ? HERE.proj : null);
    if (proj && STORY.test(nq0) && !/\s(dominic|dominic's|his|he)\s(design\s)?(process|workflow)\s/.test(nq0)) { var st = storyAnswer(proj); if (st) return st; }
    var topic = topicFor(q);
    if (topic && !/\s(this|that)\s(project|page|case study|one)\s/.test(norm(q)) && (CROSS.test(norm(q)) || topic.label === '3D' && !HERE)) { var cp = crossProject(q, topic); if (cp) return cp; }
    var hit = scoreKB(q), qt = tokens(q);
    var deictic = /\s(this|here|page|it|current)\s/.test(norm(q));
    var onlyGeneric = qt.length && qt.every(function (t) { return GENERIC.indexOf(t) > -1; }) && !(hit && hit.sc >= 1.6);
    if (!HERE && (deictic || onlyGeneric) && !(hit && hit.sc >= 1)) {   // "summarize this" on Home / About / More
      var pageEntry = KB.filter(function (e) { return e.id === (PAGE === 'more.html' ? 'projects' : 'about'); })[0];
      if (pageEntry) return { paras: pageEntry.a, sources: pageEntry.s, follow: pageEntry.f };
    }
    if (HERE && !(hit && hit.sc >= 2 && hit.e.proj)) {
      if (deictic || onlyGeneric) hit = { e: HERE, sc: 2, used: [], qt: qt };
      else if (!hit || hit.sc < 1 || (hit.sc < 2 && !/\s(dominic|dominic's|he|his|him)\s/.test(norm(q)))) {   // about him → resume; otherwise this page first
        var specific = qt.filter(function (t) { return GENERIC.indexOf(t) < 0; });
        var local = specific.length ? searchIndex(q, HERE.proj, specific).filter(function (r) { return r.cov >= 0.5; }) : [];
        var la = local.length && fromIndex(local, q);
        if (la) { la.follow = HERE.f; return la; }
      }
    }
    // A project is named, but the question asks about something specific in it: search that project's pages.
    if (hit && hit.sc >= 2 && hit.e.proj) {
      var extra = qt.filter(function (t) { return hit.used.indexOf(t) < 0 && GENERIC.indexOf(t) < 0 && tokens(hit.e.proj).indexOf(t) < 0; });
      if (extra.length) {
        var side = scoreKB(extra.join(' '));              // e.g. "the AI agent at Cheil" → the AI entry
        if (side && side.sc >= 2 && !side.e.proj) return { paras: side.e.a, sources: side.e.s, follow: side.e.f };
        var scoped = searchIndex(q, hit.e.proj, extra).filter(function (r) { return r.cov >= 0.34; }).slice(0, 2);
        var ans = scoped.length && fromIndex(scoped, extra.join(' '));
        if (ans) { ans.sources.push([hit.e.proj + ' case study', hit.e.s[0][1]]); ans.follow = hit.e.f; return ans; }
      }
    }
    if (hit && hit.sc >= 1) return { paras: hit.e.a, sources: hit.e.s, follow: hit.e.f };
    var found = searchIndex(q).filter(function (r) { return r.cov >= 0.5 && r.sc > 2.2; });
    var res = found.length && fromIndex(found.slice(0, 2), q);
    if (res) return res;
    return {
      paras: ['I can only answer from Dominic’s resume and portfolio, and I couldn’t find that there.',
              'For anything else, the quickest route is to email Dominic at ' + EMAIL + '.'],
      sources: [['Email Dominic', 'mailto:' + EMAIL], ['Resume (PDF)', 'Dominic-Park-Resume.pdf']],
      follow: ['Show me the projects', 'Who is Dominic?', 'Which tools does Dominic use?']
    };
  }

  // ---------- UI ----------
  function orb(cls) { return '<span class="ask-orb ' + (cls || '') + '" aria-hidden="true"><i></i><i></i><i></i></span>'; }
  function bar(id, placeholder, label) {
    return '<form class="ask-bar" data-ask-form>' +
      '<label class="sr-only" for="' + id + '">' + label + '</label>' + orb('ask-orb--mini') +
      '<input id="' + id + '" type="text" autocomplete="off" enterkeyhint="send" placeholder="' + placeholder + '">' +
      '<button class="ask-send" type="submit" aria-label="Ask"><span aria-hidden="true">↑</span></button></form>';
  }

  var overlay = document.createElement('div');
  overlay.className = 'ask-space'; overlay.hidden = true;
  overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-labelledby', 'ask-title');
  overlay.innerHTML =
    '<div class="ask-space__top">' +
      '<p class="ask-space__title" id="ask-title">Ask about Dominic</p>' +
      '<button class="ask-close" type="button" data-ask-close><span>Close</span> <span aria-hidden="true">✕</span> <kbd>Esc</kbd></button>' +
    '</div>' +
    '<div class="ask-space__body" data-ask-body>' +
      '<div class="ask-home" data-ask-home>' +
        orb('ask-orb--presence') +
        '<h2 class="ask-home__h">What would you like to know?</h2>' +
        '<p class="ask-home__sub">Answers come only from Dominic’s resume and portfolio.</p>' +
        (HERE ? '<p class="ask-here"><span class="ask-here__dot" aria-hidden="true"></span>Reading this page: ' + esc(HERE.proj) + '</p>' : '') +
        '<div class="ask-chips" role="list">' + STARTERS.map(function (s) { return '<button class="ask-chip" type="button" role="listitem" data-ask-q>' + esc(s) + '</button>'; }).join('') + '</div>' +
      '</div>' +
      '<div class="ask-answer" data-ask-answer hidden>' +
        '<button class="ask-back" type="button" data-ask-back><span aria-hidden="true">←</span> New question</button>' +
        '<div class="ask-answer__head">' + orb('ask-orb--small') + '<h2 class="ask-answer__q" data-ask-q-title tabindex="-1"></h2></div>' +
        '<div class="ask-answer__text" data-ask-text aria-live="polite"></div>' +
        '<div class="ask-answer__meta" data-ask-meta></div>' +
      '</div>' +
    '</div>' +
    '<div class="ask-space__bottom">' + bar('ask-input', HERE ? 'Ask about ' + HERE.proj + ', or anything else…' : 'Ask me anything about my work, skills, or resume…', 'Ask a question about Dominic') +
      '<p class="ask-space__note">AI can make mistakes. Every answer links to where it came from. <span class="ask-hide-sm">· Click outside or press Esc to close</span></p>' +
    '</div>';
  document.body.appendChild(overlay);

  // floating blob
  var fab = document.createElement('button');
  fab.type = 'button'; fab.className = 'ask-fab'; fab.setAttribute('aria-label', 'Ask about Dominic (press /)');
  fab.innerHTML = orb('ask-orb--fab') + '<span class="ask-fab__label" aria-hidden="true">Ask about Dominic <kbd>/</kbd></span>';
  document.body.appendChild(fab);

  // hero bar on the home page
  var heroMount = document.getElementById('ask-hero');
  if (heroMount) {
    heroMount.innerHTML = bar('ask-hero-input', 'Ask me anything about my work, skills, or resume…', 'Ask a question about Dominic') +
      '<p class="ask-hero__try">Try: <button type="button" data-ask-q>What UX research has Dominic done?</button> · <button type="button" data-ask-q>Which tools does Dominic use?</button></p>';
    document.documentElement.classList.add('has-ask-hero');
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { document.documentElement.classList.toggle('ask-hero-out', !e.isIntersecting); }); }, { threshold: 0 })
        .observe(heroMount.querySelector('.ask-bar'));
    } else { document.documentElement.classList.add('ask-hero-out'); }
  }

  var input = overlay.querySelector('#ask-input');
  var home = overlay.querySelector('[data-ask-home]'), ans = overlay.querySelector('[data-ask-answer]');
  var qTitle = overlay.querySelector('[data-ask-q-title]'), textEl = overlay.querySelector('[data-ask-text]'), meta = overlay.querySelector('[data-ask-meta]');
  var lastFocus = null, typingTimer = null;

  function open(prefill) {
    if (overlay.hidden) {
      lastFocus = document.activeElement;
      overlay.hidden = false; document.documentElement.classList.add('ask-open');
      requestAnimationFrame(function () { overlay.classList.add('is-in'); });
    }
    if (prefill) input.value = prefill;
    setTimeout(function () { input.focus(); }, reduce ? 0 : 60);
  }
  function close() {
    overlay.classList.remove('is-in'); document.documentElement.classList.remove('ask-open');
    setTimeout(function () { overlay.hidden = true; showHome(); }, reduce ? 0 : 280);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function showHome() { ans.hidden = true; home.hidden = false; input.value = ''; input.placeholder = HERE ? 'Ask about ' + HERE.proj + ', or anything else…' : 'Ask me anything about my work, skills, or resume…'; }

  function render(q) {
    var r = answer(q);
    home.hidden = true; ans.hidden = false;
    qTitle.textContent = q; qTitle.focus({ preventScroll: true });
    overlay.querySelector('[data-ask-body]').scrollTop = 0;
    textEl.innerHTML = ''; meta.innerHTML = ''; overlay.classList.add('is-thinking');
    clearTimeout(typingTimer);
    var html = [], inList = false;
    r.paras.forEach(function (p) {
      if (p.indexOf('• ') === 0) { if (!inList) { html.push('<ul>'); inList = true; } html.push('<li>' + esc(p.slice(2)) + '</li>'); }
      else { if (inList) { html.push('</ul>'); inList = false; } html.push('<p>' + esc(p) + '</p>'); }
    });
    if (inList) html.push('</ul>');
    var metaHtml = '';
    if (r.sources.length) metaHtml += '<p class="ask-label">Sources</p><div class="ask-sources">' + r.sources.map(function (s) {
      var ext = /^https?:/.test(s[1]) || /\.pdf$/.test(s[1]);
      return '<a class="ask-source" href="' + esc(href(s[1])) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(s[0]) + ' <span aria-hidden="true">↗</span></a>';
    }).join('') + '</div>';
    r.follow = (r.follow || []).filter(function (f) { return norm(f) !== norm(q); });
    if (r.follow.length) metaHtml += '<div class="ask-follow">' + r.follow.map(function (f) { return '<button class="ask-chip ask-chip--ghost" type="button" data-ask-q>' + esc(f) + '</button>'; }).join('') + '</div>';
    typingTimer = setTimeout(function () {
      overlay.classList.remove('is-thinking');
      textEl.innerHTML = html.join(''); meta.innerHTML = metaHtml;
      if (!reduce) { textEl.classList.remove('is-reveal'); void textEl.offsetWidth; textEl.classList.add('is-reveal'); }
    }, reduce ? 0 : 450);
    input.value = ''; input.placeholder = 'Ask a follow-up…';
  }

  // events
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('[data-ask-form]'); if (!f) return;
    e.preventDefault();
    var v = f.querySelector('input').value.trim();
    if (f.closest('.ask-space')) { if (v) render(v); }
    else { open(); if (v) { render(v); f.querySelector('input').value = ''; } }
  });
  document.addEventListener('click', function (e) {
    var q = e.target.closest('[data-ask-q]');
    if (q) { e.preventDefault(); open(); render(q.textContent.trim()); return; }
    if (e.target.closest('[data-ask-close]')) { close(); return; }
    if (e.target.closest('[data-ask-back]')) { showHome(); input.focus(); return; }
    if (e.target.closest('.ask-fab')) { open(); return; }
    if (!overlay.hidden && e.target === overlay) close();      // click on the dimmed area
    if (!overlay.hidden && (e.target.classList.contains('ask-space__body') || e.target.classList.contains('ask-space__bottom') || e.target.classList.contains('ask-space__top'))) close();
  });
  // hero bar: focusing it opens the space
  document.addEventListener('focusin', function (e) {
    if (e.target.id === 'ask-hero-input' && overlay.hidden) { var v = e.target.value; e.target.blur(); open(v); }
  });
  document.addEventListener('keydown', function (e) {
    if (!overlay.hidden) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') {                                   // keep focus inside the space
        var f = Array.prototype.filter.call(overlay.querySelectorAll('button, a[href], input'), function (el) { return el.offsetParent !== null; });
        if (!f.length) return; var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      return;
    }
    var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); open(); }
  });
})();
