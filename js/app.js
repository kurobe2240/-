(function () {
  "use strict";

  const STORAGE_KEY = "race-dashboard-v2";
  const UNIT_PRICE = 100000;
  const $ = (id) => document.getElementById(id);

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  let saveTimer = null;
  let saveStatusTimer = null;

  function showSaveStatus() {
    const el = $("save-status");
    if (!el) return;
    el.textContent = "ブラウザに保存しました";
    el.classList.add("is-ok");
    clearTimeout(saveStatusTimer);
    saveStatusTimer = setTimeout(function () {
      el.textContent = "";
      el.classList.remove("is-ok");
    }, 2000);
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveState();
      showSaveStatus();
    }, 250);
  }

  function readUnits(inp) {
    const n = parseInt(inp.value, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function formatYen(n) {
    return Math.round(n).toLocaleString("ja-JP");
  }

  function formatOdds(n) {
    if (!Number.isFinite(n) || n <= 0) return "—";
    return n.toFixed(2);
  }

  function clampUnits(n) {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
  }

  function setUnits(side, value) {
    const id = side === "red" ? "red-units" : "blue-units";
    const inp = $(id);
    inp.value = String(clampUnits(value));
  }

  function adjustUnits(side, delta) {
    const id = side === "red" ? "red-units" : "blue-units";
    const cur = readUnits($(id));
    setUnits(side, cur + delta);
    updatePopularity();
    scheduleSave();
  }

  function updatePopularity() {
    const r = readUnits($("red-units"));
    const b = readUnits($("blue-units"));
    const total = r + b;
    const pool = total * UNIT_PRICE;

    $("red-yen").textContent = (r * UNIT_PRICE).toLocaleString("ja-JP");
    $("blue-yen").textContent = (b * UNIT_PRICE).toLocaleString("ja-JP");
    $("total-units").textContent = total.toLocaleString("ja-JP");
    $("total-yen").textContent = pool.toLocaleString("ja-JP");

    const barR = $("bar-red");
    const barB = $("bar-blue");
    const badgeR = $("red-badge");
    const badgeB = $("blue-badge");

    $("red-payout-est").textContent = "—";
    $("blue-payout-est").textContent = "—";
    if ($("red-odds")) $("red-odds").textContent = "—";
    if ($("blue-odds")) $("blue-odds").textContent = "—";

    if (total === 0) {
      badgeR.textContent = "—";
      badgeB.textContent = "—";
      badgeR.className = "pop-badge";
      badgeB.className = "pop-badge";
      $("red-pct").textContent = "—";
      $("blue-pct-text").textContent = "—";
      barR.style.width = "50%";
      barB.style.width = "50%";
      barR.classList.add("is-empty");
      barB.classList.add("is-empty");
      $("legend-red-pct").textContent = "0";
      $("legend-blue-pct").textContent = "0";
      return;
    }

    if (r > 0) {
      $("red-payout-est").textContent = formatYen(pool / r);
      if ($("red-odds")) $("red-odds").textContent = formatOdds(total / r);
    }
    if (b > 0) {
      $("blue-payout-est").textContent = formatYen(pool / b);
      if ($("blue-odds")) $("blue-odds").textContent = formatOdds(total / b);
    }

    barR.classList.remove("is-empty");
    barB.classList.remove("is-empty");

    const rp = (r / total) * 100;
    const bp = (b / total) * 100;
    const rpStr = rp.toFixed(1);
    const bpStr = bp.toFixed(1);

    $("red-pct").textContent = rpStr + "%  (" + r.toLocaleString("ja-JP") + "/" + total.toLocaleString("ja-JP") + ")";
    $("blue-pct-text").textContent = bpStr + "%  (" + b.toLocaleString("ja-JP") + "/" + total.toLocaleString("ja-JP") + ")";

    barR.style.width = rp + "%";
    barB.style.width = bp + "%";

    $("legend-red-pct").textContent = rpStr;
    $("legend-blue-pct").textContent = bpStr;

    if (r > b) {
      badgeR.textContent = "人気 1位";
      badgeB.textContent = "人気 2位";
      badgeR.className = "pop-badge is-first";
      badgeB.className = "pop-badge is-second";
    } else if (b > r) {
      badgeB.textContent = "人気 1位";
      badgeR.textContent = "人気 2位";
      badgeB.className = "pop-badge is-first";
      badgeR.className = "pop-badge is-second";
    } else {
      badgeR.textContent = "同率 1位";
      badgeB.textContent = "同率 1位";
      badgeR.className = "pop-badge is-tie";
      badgeB.className = "pop-badge is-tie";
    }
  }

  function saveState() {
    const data = {
      version: 2,
      redName: $("red-name") ? $("red-name").value : "",
      blueName: $("blue-name") ? $("blue-name").value : "",
      redUnits: $("red-units").value,
      blueUnits: $("blue-units").value,
      cd: {
        min: $("cd-min").value,
        sec: $("cd-sec").value,
      },
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      const el = $("save-status");
      if (el) {
        el.textContent = "保存できませんでした（容量制限など）";
        el.classList.remove("is-ok");
      }
    }
  }

  function applyData(data) {
    if (!data || data.version !== 2) return false;
    if ($("red-name") && data.redName != null) $("red-name").value = data.redName;
    if ($("blue-name") && data.blueName != null) $("blue-name").value = data.blueName;
    if (data.redUnits != null) $("red-units").value = data.redUnits;
    if (data.blueUnits != null) $("blue-units").value = data.blueUnits;
    if (data.cd) {
      if (data.cd.min != null) $("cd-min").value = data.cd.min;
      if (data.cd.sec != null) $("cd-sec").value = data.cd.sec;
    }
    cdLeftSec = cdReadInputs();
    cdUpdateDisplay();
    updatePopularity();
    saveState();
    return true;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      return applyData(data);
    } catch (e) {
      return false;
    }
  }

  function tickClock() {
    const now = new Date();
    const t = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
    $("clock").textContent = t;
    const w = ["日", "月", "火", "水", "木", "金", "土"][now.getDay()];
    $("clock-date").textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日（${w}）`;
  }

  tickClock();
  setInterval(tickClock, 1000);

  let swRunning = false;
  let swStart = 0;
  let swElapsed = 0;
  let swRaf = null;
  let lapCount = 0;

  function swDisplayMs(ms) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${pad2(m)}:${pad2(s)}.${pad2(cs)}`;
  }

  function swLoop() {
    if (!swRunning) return;
    const now = performance.now();
    const ms = swElapsed + (now - swStart);
    $("sw-display").textContent = swDisplayMs(ms);
    swRaf = requestAnimationFrame(swLoop);
  }

  $("sw-start").addEventListener("click", function () {
    if (swRunning) {
      swRunning = false;
      cancelAnimationFrame(swRaf);
      swElapsed += performance.now() - swStart;
      this.textContent = "再開";
    } else {
      swRunning = true;
      swStart = performance.now();
      this.textContent = "停止";
      swLoop();
    }
  });

  $("sw-lap").addEventListener("click", function () {
    if (!swElapsed && !swRunning) return;
    const now = performance.now();
    const ms = swRunning ? swElapsed + (now - swStart) : swElapsed;
    lapCount += 1;
    const li = document.createElement("li");
    li.textContent = `ラップ ${lapCount}: ${swDisplayMs(ms)}`;
    $("sw-laps").prepend(li);
  });

  $("sw-reset").addEventListener("click", function () {
    swRunning = false;
    cancelAnimationFrame(swRaf);
    swElapsed = 0;
    lapCount = 0;
    $("sw-display").textContent = "00:00.00";
    $("sw-laps").innerHTML = "";
    $("sw-start").textContent = "開始";
  });

  let cdLeftSec = 0;
  let cdTimer = null;
  let cdRunning = false;

  function cdFormat(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${pad2(m)}:${pad2(s)}`;
  }

  function cdReadInputs() {
    const mi = Math.max(0, parseInt($("cd-min").value, 10) || 0);
    const se = Math.min(59, Math.max(0, parseInt($("cd-sec").value, 10) || 0));
    return mi * 60 + se;
  }

  function cdUpdateDisplay() {
    $("cd-display").textContent = cdFormat(cdLeftSec);
  }

  $("cd-start").addEventListener("click", function () {
    if (cdRunning) return;
    if (cdLeftSec <= 0) {
      cdLeftSec = cdReadInputs();
    }
    if (cdLeftSec <= 0) return;
    cdRunning = true;
    $("cd-pause").disabled = false;
    cdTimer = setInterval(function () {
      cdLeftSec -= 1;
      cdUpdateDisplay();
      if (cdLeftSec <= 0) {
        clearInterval(cdTimer);
        cdTimer = null;
        cdRunning = false;
        $("cd-pause").disabled = true;
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.value = 880;
          g.gain.setValueAtTime(0.08, ctx.currentTime);
          o.start(ctx.currentTime);
          o.stop(ctx.currentTime + 0.15);
        } catch (e) {
          /* 音が鳴らない環境は無視 */
        }
      }
    }, 1000);
  });

  $("cd-pause").addEventListener("click", function () {
    if (!cdRunning) return;
    clearInterval(cdTimer);
    cdTimer = null;
    cdRunning = false;
    this.disabled = true;
  });

  $("cd-reset").addEventListener("click", function () {
    clearInterval(cdTimer);
    cdTimer = null;
    cdRunning = false;
    cdLeftSec = cdReadInputs();
    cdUpdateDisplay();
    $("cd-pause").disabled = true;
    saveState();
  });

  $("cd-min").addEventListener("input", scheduleSave);
  $("cd-sec").addEventListener("input", scheduleSave);

  cdLeftSec = cdReadInputs();
  cdUpdateDisplay();

  $("red-units").addEventListener("input", function () {
    updatePopularity();
    scheduleSave();
  });
  $("blue-units").addEventListener("input", function () {
    updatePopularity();
    scheduleSave();
  });

  if ($("red-name")) {
    $("red-name").addEventListener("input", function () {
      scheduleSave();
    });
  }
  if ($("blue-name")) {
    $("blue-name").addEventListener("input", function () {
      scheduleSave();
    });
  }

  document.querySelectorAll(".step-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const side = this.dataset.side;
      const d = parseInt(this.dataset.delta, 10);
      if ((side !== "red" && side !== "blue") || !Number.isFinite(d)) return;
      adjustUnits(side, d);
    });
  });

  $("reset-corners").addEventListener("click", function () {
    if (!window.confirm("赤・青の購入口数を 0 にリセットしますか？")) return;
    $("red-units").value = "0";
    $("blue-units").value = "0";
    updatePopularity();
    saveState();
    showSaveStatus();
  });

  $("export-json").addEventListener("click", function () {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      unitPriceYen: UNIT_PRICE,
      redName: $("red-name") ? $("red-name").value : "",
      blueName: $("blue-name") ? $("blue-name").value : "",
      redUnits: $("red-units").value,
      blueUnits: $("blue-units").value,
      cd: {
        min: $("cd-min").value,
        sec: $("cd-sec").value,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "corner-vote-backup.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("import-json").addEventListener("change", function (ev) {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const data = JSON.parse(reader.result);
        if (applyData(data)) {
          showSaveStatus();
        } else {
          window.alert("JSONの形式が正しくありません（version: 2 が必要です）。");
        }
      } catch (err) {
        window.alert("ファイルを読み込めませんでした。");
      }
    };
    reader.readAsText(file, "UTF-8");
  });

  if (!loadState()) {
    updatePopularity();
  }

  window.addEventListener("beforeunload", function () {
    saveState();
  });
})();
