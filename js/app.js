(function () {
  "use strict";

  const STORAGE_KEY = "race-dashboard-v1";
  const $ = (id) => document.getElementById(id);

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function escAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
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

  function collectRows() {
    const rows = [];
    oddsBody.querySelectorAll("tr").forEach(function (tr) {
      rows.push({
        num: tr.querySelector(".inp-num").value,
        name: tr.querySelector(".inp-name").value,
        odds: tr.querySelector(".inp-odds").value,
        pop: tr.querySelector(".inp-pop").value,
      });
    });
    return rows;
  }

  function saveState() {
    const data = {
      version: 1,
      rows: collectRows(),
      calc: {
        odds: $("calc-odds").value,
        stake: $("calc-stake").value,
      },
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

  let cdTotalSec = 0;
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
      cdTotalSec = cdReadInputs();
      cdLeftSec = cdTotalSec;
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

  $("cd-min").addEventListener("input", function () {
    scheduleSave();
  });
  $("cd-sec").addEventListener("input", function () {
    scheduleSave();
  });

  cdLeftSec = cdReadInputs();
  cdUpdateDisplay();

  const oddsBody = $("odds-body");
  let rowId = 0;

  function payoutFor100(odds) {
    const o = Number(odds);
    if (!Number.isFinite(o) || o < 1) return "—";
    return Math.round(o * 100).toLocaleString("ja-JP");
  }

  function attachRowHandlers(tr) {
    const oddsInput = tr.querySelector(".inp-odds");
    const payoutCell = tr.querySelector(".payout-cell");

    function updatePayout() {
      payoutCell.textContent = payoutFor100(oddsInput.value);
    }

    oddsInput.addEventListener("input", updatePayout);
    updatePayout();

    tr.querySelectorAll("input").forEach(function (inp) {
      inp.addEventListener("input", scheduleSave);
    });

    tr.querySelector(".btn-del").addEventListener("click", function () {
      tr.remove();
      saveState();
      showSaveStatus();
    });
  }

  function addRow(data) {
    rowId += 1;
    const tr = document.createElement("tr");
    tr.dataset.rowId = String(rowId);
    const num = data && data.num != null ? data.num : "";
    const name = data && data.name != null ? data.name : "";
    const odds = data && data.odds != null ? data.odds : "";
    const pop = data && data.pop != null ? data.pop : "";
    tr.innerHTML = `
      <td><input type="text" class="inp-num num" inputmode="numeric" placeholder="1" value="${escAttr(num)}" /></td>
      <td><input type="text" class="inp-name" placeholder="馬名" value="${escAttr(name)}" /></td>
      <td><input type="number" class="inp-odds" step="0.1" min="1" placeholder="例: 3.2" value="${escAttr(odds)}" /></td>
      <td><input type="number" class="inp-pop num" min="1" step="1" placeholder="人気" value="${escAttr(pop)}" /></td>
      <td class="payout-cell">—</td>
      <td><button type="button" class="btn-icon btn-del">削除</button></td>
    `;
    oddsBody.appendChild(tr);
    attachRowHandlers(tr);
  }

  function applyData(data) {
    if (!data || !Array.isArray(data.rows)) return false;
    oddsBody.innerHTML = "";
    if (data.rows.length === 0) {
      addRow({ num: "1", name: "", odds: "", pop: "1" });
      addRow({ num: "2", name: "", odds: "", pop: "2" });
    } else {
      data.rows.forEach(function (r) {
        addRow({
          num: r.num != null ? r.num : "",
          name: r.name != null ? r.name : "",
          odds: r.odds != null ? r.odds : "",
          pop: r.pop != null ? r.pop : "",
        });
      });
    }
    if (data.calc) {
      if (data.calc.odds != null) $("calc-odds").value = data.calc.odds;
      if (data.calc.stake != null) $("calc-stake").value = data.calc.stake;
    }
    if (data.cd) {
      if (data.cd.min != null) $("cd-min").value = data.cd.min;
      if (data.cd.sec != null) $("cd-sec").value = data.cd.sec;
    }
    cdLeftSec = cdReadInputs();
    cdUpdateDisplay();
    updateCalcPayout();
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

  $("add-row").addEventListener("click", function () {
    addRow({});
    saveState();
    showSaveStatus();
  });

  $("sort-pop").addEventListener("click", function () {
    const rows = Array.from(oddsBody.querySelectorAll("tr"));
    rows.sort(function (a, b) {
      const pa = parseInt(a.querySelector(".inp-pop").value, 10);
      const pb = parseInt(b.querySelector(".inp-pop").value, 10);
      const na = Number.isFinite(pa) ? pa : 9999;
      const nb = Number.isFinite(pb) ? pb : 9999;
      return na - nb;
    });
    rows.forEach(function (r) {
      oddsBody.appendChild(r);
    });
    saveState();
    showSaveStatus();
  });

  $("clear-rows").addEventListener("click", function () {
    if (!window.confirm("表のすべての行を削除しますか？")) return;
    oddsBody.innerHTML = "";
    addRow({ num: "1", name: "", odds: "", pop: "1" });
    addRow({ num: "2", name: "", odds: "", pop: "2" });
    saveState();
    showSaveStatus();
  });

  $("export-json").addEventListener("click", function () {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      rows: collectRows(),
      calc: {
        odds: $("calc-odds").value,
        stake: $("calc-stake").value,
      },
      cd: {
        min: $("cd-min").value,
        sec: $("cd-sec").value,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "race-dashboard-backup.json";
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
          window.alert("JSONの形式が正しくありません（rows が必要です）。");
        }
      } catch (err) {
        window.alert("ファイルを読み込めませんでした。");
      }
    };
    reader.readAsText(file, "UTF-8");
  });

  if (!loadState()) {
    addRow({ num: "1", name: "", odds: "", pop: "1" });
    addRow({ num: "2", name: "", odds: "", pop: "2" });
  }

  function updateCalcPayout() {
    const odds = parseFloat($("calc-odds").value);
    const stake = parseFloat($("calc-stake").value);
    if (!Number.isFinite(odds) || odds < 1 || !Number.isFinite(stake) || stake <= 0) {
      $("calc-payout").textContent = "—";
      return;
    }
    const p = Math.round(stake * odds);
    $("calc-payout").textContent = p.toLocaleString("ja-JP");
  }

  $("calc-odds").addEventListener("input", function () {
    updateCalcPayout();
    scheduleSave();
  });
  $("calc-stake").addEventListener("input", function () {
    updateCalcPayout();
    scheduleSave();
  });
  updateCalcPayout();

  $("btn-implied").addEventListener("click", function () {
    const rows = oddsBody.querySelectorAll("tr");
    const items = [];
    rows.forEach(function (tr) {
      const name = tr.querySelector(".inp-name").value.trim() || "(無名)";
      const odds = parseFloat(tr.querySelector(".inp-odds").value);
      if (Number.isFinite(odds) && odds >= 1) {
        items.push({ name: name, odds: odds, implied: 1 / odds });
      }
    });
    const sum = items.reduce(function (a, b) {
      return a + b.implied;
    }, 0);
    const ul = $("implied-list");
    ul.innerHTML = "";
    if (items.length === 0 || sum <= 0) {
      const li = document.createElement("li");
      li.textContent = "有効なオッズ行がありません。";
      ul.appendChild(li);
      return;
    }
    items.forEach(function (it) {
      const pct = ((it.implied / sum) * 100).toFixed(1);
      const li = document.createElement("li");
      const span1 = document.createElement("span");
      span1.textContent = it.name;
      const span2 = document.createElement("span");
      span2.textContent = pct + "%";
      li.appendChild(span1);
      li.appendChild(span2);
      ul.appendChild(li);
    });
  });

  window.addEventListener("beforeunload", function () {
    saveState();
  });
})();
