
/* Preview-only, explicit targets. No wheel capture; original carousel transforms remain owned by the page. */
(() => {
  'use strict';
  if (document.querySelector('.module-motion-lab')) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const rm = matchMedia('(prefers-reduced-motion: reduce)');
  const key = 'chathand.section-motion.v1';
  const storage = { get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} } };
  const defaults = {
    reveal: true, repeat: true, order: 'title', titleDistance: 26, contentDistance: 42,
    titleDuration: 650, contentDuration: 800, gap: 180, stagger: 80, delay: 0,
    opacity: .08, curve: 'easeOut', trigger: 86,
    parallax: true, amount: 36, strength: .8, smooth: 180, direction: 'up', pictureScope: 'all'
  };
  const limits = {
    titleDistance: [0, 180], contentDistance: [0, 240], titleDuration: [0, 2400], contentDuration: [0, 2400],
    gap: [0, 1200], stagger: [0, 600], delay: [0, 1200], opacity: [0, 1], trigger: [45, 100],
    amount: [0, 160], strength: [0, 3], smooth: [0, 1000]
  };
  const choices = {
    order: [['title', '标题先进入'], ['content', '内容先进入'], ['together', '同时进入']],
    curve: [['easeOut', '先快后慢'], ['easeInOut', '缓入缓出'], ['smoothstep', '柔和'], ['linear', '线性']],
    direction: [['up', '随下滚向上移动'], ['down', '随下滚向下移动']],
    pictureScope: [['all', '全部配图'], ['features', '特点模块配图'], ['cases', '案例演示配图'], ['safety', '安全模块配图']]
  };
  let saved = {};
  try { saved = JSON.parse(storage.get(key) || '{}') || {}; } catch (_) {}
  const config = { ...defaults };
  for (const name of Object.keys(defaults)) {
    if (limits[name] && typeof saved[name] === 'number' && Number.isFinite(saved[name])) config[name] = clamp(saved[name], ...limits[name]);
    else if (typeof defaults[name] === 'boolean' && typeof saved[name] === 'boolean') config[name] = saved[name];
    else if (choices[name] && choices[name].some(([value]) => value === saved[name])) config[name] = saved[name];
  }
  const ease = (p) => config.curve === 'linear' ? p : config.curve === 'smoothstep' ? p * p * (3 - 2 * p) : config.curve === 'easeInOut' ? (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2) : 1 - Math.pow(1 - p, 3);
  const definitions = [
    { id: 'features', name: '特点', root: '#features', title: '#features > .wrap > .sec-h', body: '#features .af-c' },
    { id: 'cases', name: '能力 / 案例', root: '#cases', title: '#cases > .wrap > .sec-h', body: '#cases .car' },
    { id: 'safety', name: '安全', root: '#safety', title: '#safety > .wrap > .sec-h', body: '#safety .as-list, #safety .as-pic' },
    { id: 'download', name: '下载', root: '#get .ag-main', title: '#get .ag-main > .sec-h', body: '#get .ag-main > .ag-plan, #get .ag-main > .prompt, #get .ag-main > .btn' },
    { id: 'manual', name: '手动安装', root: '#get .ag-self', title: '#get .ag-self h3', body: '#get .ag-self p, #get .ag-self > .btn' },
    { id: 'faq', name: '常见问题', root: '#get .faq', title: '#get .faq > .sec-h', body: '#get .faq > .qa' },
    { id: 'support', name: '支持 / 打赏', root: '#support', title: '#support .tp-head', body: '#support .tp-nav, #support .tp-pages' }
  ];
  $$('#cases .rows > .row').forEach((row, i) => {
    row.dataset.moduleRow = String(i);
    const selector = `#cases [data-module-row="${i}"]`;
    definitions.push({ id: `case-row-${i}`, name: `案例 ${i + 1}`, root: selector, title: selector + ' .row-text', body: selector + ' .row-media', mobileRow: true });
  });
  const recordByElement = new WeakMap();
  const groups = definitions.map(def => {
    const root = $(def.root), titles = $$(def.title), bodies = $$(def.body);
    if (!root || !titles.length) return null;
    const records = [...titles.map((el, i) => ({ el, kind: 'title', i })), ...bodies.map((el, i) => ({ el, kind: 'content', i }))];
    records.forEach(r => {
      r.y = 0; r.opacity = 1;
      r.el.classList.add('section-motion-reveal');
      r.el.dataset.motionTarget = `module.${def.id}.${r.kind}.${r.i}`;
      recordByElement.set(r.el, r);
    });
    return { ...def, root, anchor: titles[0], records, state: 'armed', started: 0 };
  }).filter(Boolean);
  const pictureDefinitions = [
    ['features', '#features .af-art > .qa-fit', '#features .af-q'],
    ['cases', '#cases .car-view', '#cases .car-pin'],
    ['safety', '#safety .as-pic > .sfa-fit', '#safety .as-pic']
  ];
  $$('#cases .rows > .row').forEach((row, i) => pictureDefinitions.push(['cases', `#cases [data-module-row="${i}"] .row-media > .vslot`, `#cases [data-module-row="${i}"]`]));
  const pictures = pictureDefinitions.map(([scope, selector, anchorSelector], i) => {
    const el = $(selector), anchor = $(anchorSelector);
    if (!el || !anchor) return null;
    el.classList.add('section-motion-parallax');
    el.dataset.parallaxTarget = `picture.${scope}.${i}`;
    return { el, anchor, scope, y: 0 };
  }).filter(Boolean);
  const visible = el => el.getClientRects().length > 0 && el.getBoundingClientRect().height > 0;
  function neutralTop(el) {
    let top = el.getBoundingClientRect().top;
    for (let at = el; at && at !== document.body; at = at.parentElement) top -= recordByElement.get(at)?.y || 0;
    return top;
  }
  function renderRecord(r, p) {
    const q = ease(p), distance = r.kind === 'title' ? config.titleDistance : config.contentDistance;
    const y = distance * (1 - q), opacity = config.opacity + (1 - config.opacity) * q;
    if (Math.abs(y - r.y) > .005) { r.el.style.setProperty('--section-y', y.toFixed(3) + 'px'); r.y = y; }
    if (Math.abs(opacity - r.opacity) > .00001) { r.el.style.setProperty('--section-opacity', opacity.toFixed(5)); r.opacity = opacity; }
  }
  function finish(g) {
    g.state = 'done';
    g.records.forEach(r => { renderRecord(r, 1); r.el.classList.remove('section-motion-running'); });
  }
  function play(g, now = performance.now()) {
    g.state = 'running'; g.started = now;
    g.records.forEach(r => { renderRecord(r, 0); r.el.classList.add('section-motion-running'); });
    schedule();
  }
  function delayFor(r) {
    const first = config.order === 'together' || config.order === r.kind;
    return config.delay + (first ? 0 : config.gap) + r.i * config.stagger;
  }
  let frame = 0, lastTime = performance.now();
  function schedule() { if (!frame) frame = requestAnimationFrame(tick); }
  function tick(now) {
    frame = 0;
    const dt = Math.min(.1, Math.max(.001, (now - lastTime) / 1000)); lastTime = now;
    let active = false;
    for (const g of groups) {
      if (!config.reveal || rm.matches) { finish(g); continue; }
      if (!visible(g.root)) continue;
      const rect = g.root.getBoundingClientRect(), top = neutralTop(g.anchor);
      if (g.state === 'done' && config.repeat && (rect.bottom < -80 || rect.top > innerHeight + 80)) g.state = 'armed';
      if (g.state === 'armed') {
        if (rect.bottom <= 0) {
          g.records.forEach(r => renderRecord(r, 1));
          if (!config.repeat) g.state = 'done';
        } else if (top <= innerHeight * config.trigger / 100 && rect.top < innerHeight) play(g, now);
        else g.records.forEach(r => renderRecord(r, 0));
      }
      if (g.state !== 'running') continue;
      let complete = true;
      g.records.forEach(r => {
        const elapsed = now - g.started - delayFor(r);
        const duration = r.kind === 'title' ? config.titleDuration : config.contentDuration;
        const p = elapsed < 0 ? 0 : duration === 0 ? 1 : clamp(elapsed / duration);
        renderRecord(r, p); if (p < 1) complete = false;
      });
      if (complete) finish(g); else active = true;
    }
    for (const pic of pictures) {
      const enabled = config.parallax && !rm.matches && (config.pictureScope === 'all' || config.pictureScope === pic.scope) && visible(pic.el);
      let goal = 0;
      if (enabled) {
        const rect = pic.anchor.getBoundingClientRect(), top = neutralTop(pic.anchor);
        const phase = clamp((innerHeight / 2 - top - rect.height / 2) / (innerHeight / 2 + rect.height / 2) * config.strength, -1, 1);
        goal = config.amount * phase * (config.direction === 'up' ? -1 : 1);
      }
      const next = !enabled || config.smooth === 0 ? goal : pic.y + (goal - pic.y) * (1 - Math.exp(-3000 * dt / config.smooth));
      pic.y = Math.abs(goal - next) < .03 ? goal : next;
      pic.el.style.setProperty('--parallax-y', pic.y.toFixed(3) + 'px');
      if (Math.abs(goal - pic.y) >= .03) active = true;
    }
    if (active) schedule();
  }
  function targetGroup() {
    const id = $('[data-mm-preview]', panel).value;
    return groups.find(g => g.id === id) || groups[0];
  }
  function replaySelected(scroll = false) {
    if (!config.reveal || rm.matches) { status(rm.matches ? '系统正在减少动态效果，页面保持静态。' : '开启「错峰淡入」后可重播。'); return; }
    const g = targetGroup();
    document.dispatchEvent(new Event('module-motion:preview'));
    if (scroll) {
      const y = g.id === 'cases' && window.__v3 ? window.__v3.entryStartY : scrollY + neutralTop(g.anchor) - innerHeight * .32;
      scrollTo({ top: Math.max(0, y), behavior: 'instant' });
    }
    play(g);
    status(`正在重播「${g.name}」；参数会在刷新后保留。`);
  }
  const panel = document.createElement('aside');
  panel.className = 'module-motion-lab'; panel.setAttribute('aria-label', '模块入场与配图视差控制器');
  const slider = (name, label, step = 1) => {
    const [min, max] = limits[name];
    return `<div class="mm-row"><label class="mm-label" for="mm-${name}">${label}</label><div class="mm-controls"><input type="range" id="mm-${name}" data-mm-key="${name}" min="${min}" max="${max}" step="${step}" value="${config[name]}"><input type="number" aria-label="${label}数值" data-mm-key="${name}" min="${min}" max="${max}" step="${step}" value="${config[name]}"></div></div>`;
  };
  const select = (name, label) => `<div class="mm-row"><label class="mm-label" for="mm-${name}">${label}</label><select id="mm-${name}" data-mm-key="${name}">${choices[name].map(([value, text]) => `<option value="${value}">${text}</option>`).join('')}</select></div>`;
  const toggle = (name, label) => `<label class="mm-switch"><span>${label}</span><input type="checkbox" data-mm-key="${name}" ${config[name] ? 'checked' : ''}></label>`;
  panel.innerHTML = `<header><strong>模块入场 · 视差</strong><button type="button" data-mm-action="toggle" aria-expanded="true" aria-controls="mm-body">收起</button></header><div class="mm-body" id="mm-body">
    <p>滚动触发的错峰入场：标题与内容分开淡入。这里的参数作用于下方各模块。</p>
    <label class="mm-label" for="mm-preview">预览模块</label><select id="mm-preview" data-mm-preview>${groups.filter(g => !g.mobileRow).map(g => `<option value="${g.id}">${g.name}</option>`).join('')}</select>
    <div class="mm-actions"><button type="button" data-mm-action="replay">定位并重播</button><button type="button" data-mm-action="rearm">重新体验整页</button></div>
    ${toggle('reveal', '错峰淡入 · 开关')}<fieldset data-mm-reveal>
    ${select('order', '进入顺序')}${slider('gap', '标题与内容的间隔 · ms', 10)}
    ${slider('titleDistance', '标题上移幅度 · px', 1)}${slider('contentDistance', '内容上移幅度 · px', 1)}
    ${slider('titleDuration', '标题入场时长 · ms', 10)}${slider('contentDuration', '内容入场时长 · ms', 10)}
    ${slider('opacity', '起始透明度（1 为完全显示）', .01)}${select('curve', '入场缓动曲线')}
    <details><summary>节奏与触发位置</summary>${slider('stagger', '内容之间的间隔 · ms', 10)}${slider('delay', '整体延迟 · ms', 10)}${slider('trigger', '触发线 · 屏幕高度 %', 1)}${toggle('repeat', '再次进入时重播')}</details></fieldset>
    ${toggle('parallax', '配图视差 · 开关')}<fieldset data-mm-parallax>
    ${select('pictureScope', '配图范围')}${slider('amount', '最大上下位移 · ±px', 1)}${slider('strength', '视差强度（0 为静止）', .05)}${slider('smooth', '跟随缓冲时长 · ms', 10)}${select('direction', '移动方向')}
    <p>幅度限制最多移动多远；强度控制相同滚动距离带来的位移。</p></fieldset>
    <div class="mm-actions"><button type="button" data-mm-action="copy">复制参数</button><button type="button" data-mm-action="reset">恢复默认</button></div>
    <p class="mm-status" role="status">错峰淡入与配图视差已开启；修改自动保存。</p><textarea hidden readonly aria-label="模块动效参数"></textarea></div>`;
  document.body.append(panel);
  const status = message => { $('.mm-status', panel).textContent = message; };
  function refresh() {
    $$('[data-mm-key]', panel).forEach(el => { const name = el.dataset.mmKey; if (el.type === 'checkbox') el.checked = config[name]; else el.value = config[name]; });
    $('[data-mm-reveal]', panel).disabled = !config.reveal;
    $('[data-mm-parallax]', panel).disabled = !config.parallax;
  }
  let previewTimer = 0;
  panel.addEventListener('input', e => {
    const name = e.target.dataset.mmKey;
    if (!name) return;
    if (e.target.type === 'checkbox') config[name] = e.target.checked;
    else if (limits[name]) {
      if (!Number.isFinite(e.target.valueAsNumber)) return;
      config[name] = clamp(e.target.valueAsNumber, ...limits[name]);
    } else config[name] = e.target.value;
    $$(`[data-mm-key="${name}"]`, panel).forEach(el => { if (el !== e.target) { if (el.type === 'checkbox') el.checked = config[name]; else el.value = config[name]; } });
    storage.set(key, JSON.stringify(config));
    $('[data-mm-reveal]', panel).disabled = !config.reveal;
    $('[data-mm-parallax]', panel).disabled = !config.parallax;
    const parallaxSetting = ['parallax','amount','strength','smooth','direction','pictureScope'].includes(name);
    if (!parallaxSetting) {
      for (const g of groups) {
        if (config.reveal && g.state !== 'running') g.state = 'armed';
      }
      clearTimeout(previewTimer);
      if (config.reveal) previewTimer = setTimeout(() => {
        const g = targetGroup();
        if (visible(g.root)) { const r = g.root.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) replaySelected(false); }
      }, 260);
    }
    status('已应用并保存。滚动页面感受变化。'); schedule();
  });
  panel.addEventListener('change', refresh);
  panel.addEventListener('click', async e => {
    const button = e.target.closest('button'); if (!button) return;
    const action = button.dataset.mmAction;
    if (action === 'toggle') {
      const collapsed = panel.classList.toggle('mm-min'); $('.mm-body', panel).hidden = collapsed;
      button.textContent = collapsed ? '展开' : '收起'; button.setAttribute('aria-expanded', String(!collapsed));
      storage.set(key + '.collapsed', collapsed ? '1' : '0');
    }
    if (action === 'replay') { clearTimeout(previewTimer); replaySelected(true); }
    if (action === 'rearm') {
      document.dispatchEvent(new Event('module-motion:preview'));
      groups.forEach(g => { g.state = 'armed'; g.records.forEach(r => renderRecord(r, 0)); });
      const first = groups[0];
      scrollTo({ top: Math.max(0, scrollY + neutralTop(first.anchor) - innerHeight - 40), behavior: 'instant' });
      status('已回到模块前；向下滚动即可重新体验。'); schedule();
    }
    if (action === 'reset') { Object.assign(config, defaults); storage.set(key, JSON.stringify(config)); refresh(); groups.forEach(g => { g.state = 'armed'; }); schedule(); status('已恢复默认。'); }
    if (action === 'copy') {
      const text = JSON.stringify(config, null, 2);
      try { await navigator.clipboard.writeText(text); status('参数已复制，可以直接发给我。'); }
      catch (_) { const field = $('textarea', panel); field.hidden = false; field.value = text; field.focus(); field.select(); status('参数已选中，按 ⌘C 复制。'); }
    }
  });
  refresh();
  if (storage.get(key + '.collapsed') === '1' || innerWidth < 760) $('[data-mm-action="toggle"]', panel).click();
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('load', schedule, { once: true });
  rm.addEventListener('change', () => { groups.forEach(g => { g.state = 'armed'; }); schedule(); });
  document.addEventListener('visibilitychange', schedule);
  document.addEventListener('focusin', e => { const g = groups.find(g => g.records.some(r => r.el.contains(e.target))); if (g) finish(g); });
  window.__sectionMotion = { get config() { return { ...config }; }, replay(id) { const g = groups.find(g => g.id === id); if (g) { $('[data-mm-preview]', panel).value = id; replaySelected(true); } } };
  schedule();
})();
