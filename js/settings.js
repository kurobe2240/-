(function () {
  "use strict";

  const STORAGE_KEY = "race-dashboard-v3";
  const DEFAULT_UNIT_PRICE = 100000;

  const $ = (id) => document.getElementById(id);

  function clampInt(n, min, max) {
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, Math.floor(n)));
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function syncUi(state) {
    const settings = (state && state.settings) || { unitPrice: DEFAULT_UNIT_PRICE, houseEdgePct: 0, locked: false };
    $("unit-price").value = String(clampInt(parseInt(settings.unitPrice, 10), 1, 1000000000));
    const he = Number(settings.houseEdgePct);
    $("house-edge").value = String(Number.isFinite(he) ? Math.max(0, Math.min(50, he)) : 0);

    const locked = !!settings.locked;
    const box = document.querySelector(".settings");
    const note = $("settings-note");
    box.classList.toggle("is-locked", locked);
    note.textContent = locked ? "ロック中（編集不可）" : "※表示・計算の設定（シミュレーション）";
  }

  function apply(locked) {
    if (locked) return;
    const state = load() || { version: 3 };
    state.version = 3;
    state.settings = state.settings || {};
    state.settings.unitPrice = clampInt(parseInt($("unit-price").value, 10), 1, 1000000000);
    const he = Number($("house-edge").value);
    state.settings.houseEdgePct = Number.isFinite(he) ? Math.max(0, Math.min(50, he)) : 0;
    save(state);
    syncUi(state);
  }

  function reset(locked) {
    if (locked) return;
    const state = load() || { version: 3 };
    state.version = 3;
    state.settings = state.settings || {};
    state.settings.unitPrice = DEFAULT_UNIT_PRICE;
    state.settings.houseEdgePct = 0;
    save(state);
    syncUi(state);
  }

  function toggleLock() {
    const state = load() || { version: 3 };
    state.version = 3;
    state.settings = state.settings || {};
    state.settings.locked = !state.settings.locked;
    save(state);
    syncUi(state);
  }

  const init = load() || { version: 3, settings: { unitPrice: DEFAULT_UNIT_PRICE, houseEdgePct: 0, locked: false } };
  if (!init.settings) init.settings = { unitPrice: DEFAULT_UNIT_PRICE, houseEdgePct: 0, locked: false };
  syncUi(init);

  $("settings-apply").addEventListener("click", function () {
    const st = load();
    apply(st && st.settings && st.settings.locked);
  });

  $("settings-reset").addEventListener("click", function () {
    const st = load();
    reset(st && st.settings && st.settings.locked);
  });

  $("settings-lock").addEventListener("click", function () {
    toggleLock();
  });
})();

