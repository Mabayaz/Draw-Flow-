// Global topic/level progression engine shared across Form, Perspective, Shadow, Depth exercises.
(function (global) {
  const KEY = 'drawflow_progression';
  const TOPIC_ORDER = ['form', 'perspective', 'shadow', 'depth'];
  const TOPIC_PAGES = {
    form: '/pages/drawing-exercise/form/',
    perspective: '/pages/drawing-exercise/perspective/',
    shadow: '/pages/drawing-exercise/shadow/',
    depth: '/pages/drawing-exercise/depth/'
  };
  const TOPIC_LABELS = { form: 'Form', perspective: 'Perspective', shadow: 'Shadow', depth: 'Depth' };

  function defaultProgression() {
    return {
      form: { unlocked: true, level1: true, level2: false, level3: false, completed: false },
      perspective: { unlocked: false, level1: false, level2: false, level3: false, completed: false },
      shadow: { unlocked: false, level1: false, level2: false, level3: false, completed: false },
      depth: { unlocked: false, level1: false, level2: false, level3: false, completed: false }
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const merged = defaultProgression();
      TOPIC_ORDER.forEach((t) => { merged[t] = Object.assign({}, merged[t], parsed[t] || {}); });
      return merged;
    } catch (e) {
      return defaultProgression();
    }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function unlockLevel(topic, levelNum) {
    const state = load();
    if (!state[topic] || levelNum < 1 || levelNum > 3) return state;
    state[topic]['level' + levelNum] = true;
    save(state);
    return state;
  }

  function completeTopic(topic) {
    const state = load();
    if (!state[topic]) return state;
    state[topic].completed = true;
    const idx = TOPIC_ORDER.indexOf(topic);
    const next = TOPIC_ORDER[idx + 1];
    if (next) {
      state[next].unlocked = true;
      state[next].level1 = true;
    }
    save(state);
    return state;
  }

  function highestUnlockedPage(state) {
    const unlocked = TOPIC_ORDER.filter((t) => state[t].unlocked);
    const last = unlocked[unlocked.length - 1] || 'form';
    return TOPIC_PAGES[last];
  }

  // Redirects away from a locked topic page back to the highest unlocked one.
  function guardPage(topic) {
    const state = load();
    if (state[topic] && state[topic].unlocked) return true;
    alert('Complete the previous topic to unlock ' + (TOPIC_LABELS[topic] || topic) + '.');
    window.location.href = highestUnlockedPage(state) || '/pages/drawing-exercise/exercises/';
    return false;
  }

  function showCompletionModal(topic, onReplay) {
    const idx = TOPIC_ORDER.indexOf(topic);
    const next = TOPIC_ORDER[idx + 1];

    const overlay = document.createElement('div');
    overlay.setAttribute('style', 'position:fixed;inset:0;background:rgba(29,41,38,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;font-family:"DM Sans",sans-serif;');

    const card = document.createElement('div');
    card.setAttribute('style', 'background:#fffdf8;border-radius:1.25rem;padding:2rem;max-width:26rem;width:100%;text-align:center;box-shadow:0 20px 45px rgba(0,0,0,.25);');

    const label = TOPIC_LABELS[topic] || topic;
    card.innerHTML =
      '<p style="font-family:\'DM Mono\',monospace;font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:#e86f45;margin:0;">Topic complete</p>' +
      '<h2 style="margin:.5rem 0 0;font-family:\'Space Grotesk\',sans-serif;font-size:1.75rem;color:#173e36;">' + label + ' finished!</h2>' +
      '<p style="margin:.5rem 0 0;color:#68716c;font-size:.85rem;">Great work completing every level. Choose what to do next.</p>' +
      '<div style="margin-top:1.5rem;display:flex;flex-direction:column;gap:.6rem;">' +
      (next ? '<button type="button" id="progression-continue" style="border:none;border-radius:999px;background:#173e36;color:#f8f4eb;font-weight:700;padding:.75rem 1rem;cursor:pointer;">Continue to Next Topic ➔</button>' : '') +
      '<button type="button" id="progression-replay" style="border:1px solid #d9d5c9;border-radius:999px;background:#fff;padding:.75rem 1rem;cursor:pointer;font-weight:700;color:#3d3935;">Replay Level 🔄</button>' +
      '<button type="button" id="progression-quit" style="border:1px solid #d9d5c9;border-radius:999px;background:#fff;padding:.75rem 1rem;cursor:pointer;font-weight:700;color:#3d3935;">Quit Exercises</button>' +
      '</div>';

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    if (next) {
      card.querySelector('#progression-continue').addEventListener('click', () => {
        window.location.href = TOPIC_PAGES[next];
      });
    }
    card.querySelector('#progression-quit').addEventListener('click', () => {
      window.location.href = '/pages/drawing-exercise/exercises/';
    });
    card.querySelector('#progression-replay').addEventListener('click', () => {
      overlay.remove();
      if (typeof onReplay === 'function') onReplay();
    });

    return overlay;
  }

  global.DrawFlowProgression = {
    TOPIC_ORDER, TOPIC_PAGES, TOPIC_LABELS,
    load, save, unlockLevel, completeTopic, guardPage, showCompletionModal
  };
})(window);
