/* Leonida Ledger — tracker boot, rendering, saved progress, filters, spoiler mode.
 * V2 "Paper Atlas": compact list rows with a detail pane beside them. */
const DATA_URL = "data/trophies.json";
const PROGRESS_KEY = "leonida-ledger-progress-v1";
const SPOILER_KEY = "leonida-ledger-spoiler-v1";

const ROADMAP = [
  { stage: 1, title: "Story first — Chapters 1 to 4 and the finale", text: "Play the story straight through. Every chapter trophy and named-mission trophy pops automatically, and you meet the stranger and character strands on the way. Save at the start of every chapter (no mission replay) and do the Chapter 1 meditation before Chapter 1 ends." },
  { stage: 2, title: "Strangers & character quests", text: "Finish the five character quest lines (Andy, Kenton, Billy, Randy, Tyrone), the 8 stranger strands, Bret's unique-animal hunt and Cal's fishing challenge. These are free-roam missions, so work them between story missions rather than leaving them all for after the credits." },
  { stage: 3, title: "Collectibles & exploration", text: "Cards (3 sets), WAiNK scans (100 locations), vehicle discovery (100), the full Leonida map (52 areas), all 8 garages, 10 Scooter Bros registrations, the 18 meditation spots and the $250,000 laundering total. Scan everything new with WAiNK as you travel so the counts grow on their own." },
  { stage: 4, title: "Activities, challenges & robberies", text: "250 stunts, 42 shooting-range golds, 20 different race wins, 14 drone-race locations, arcade and bowling, the robbery set (5 bank vaults, 1 operation per gang, armored truck, jewelry store) and the partner heat trophies. This is the long grind stage — spread it across sessions." },
  { stage: 5, title: "Cleanup & 100% completion", text: "Finish the 100% checklist (gold: A Long Road), the 50 challenges, the 9 activity types, and the platinum pops with the last of the other 54. Check the in-game 100% page (Progress, then Stats) to see exactly what is left." },
];

let trophies = [];
let earned = new Set();
let selectedId = null;
let kindFilter = "all";
let gradeFilter = "all";
let searchText = "";
let spoilerOn = false;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function kindLabel(kind) {
  return kind === "story" ? "Story" : kind === "collectible" ? "Collectible" : "Activity";
}

async function loadTrophies() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error("Could not load " + DATA_URL);
  const data = await response.json();
  trophies = Array.isArray(data) ? data : data.trophies;
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) earned = new Set(JSON.parse(raw).earned || []);
  } catch (err) { earned = new Set(); }
  try {
    spoilerOn = localStorage.getItem(SPOILER_KEY) === "1";
  } catch (err) { spoilerOn = false; }
}

function saveProgress() {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ earned: Array.from(earned).sort() }));
  } catch (err) { /* storage unavailable: progress stays for this session only */ }
}

function saveSpoiler() {
  try {
    localStorage.setItem(SPOILER_KEY, spoilerOn ? "1" : "0");
  } catch (err) { /* ignore */ }
}

function countEarned() {
  return trophies.filter((t) => earned.has(t.id)).length;
}

function renderCounts() {
  const done = countEarned();
  const total = trophies.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  $("#progress-text").textContent = done + " / " + total + " earned";
  $("#progress-pct").textContent = pct + "%";
  $("#progress-fill").style.width = pct + "%";
  $("#progress-bar").setAttribute("aria-valuenow", String(done));
  $("#progress-note").textContent =
    done === total && total > 0
      ? "Platinum earned — congratulations, Leonida Legend!"
      : (total - done) + " to go. The platinum unlocks with the last of the other 54.";
}

function trophyIsMasked(trophy) {
  return spoilerOn && trophy.hidden && !earned.has(trophy.id);
}

function trophyRow(trophy) {
  const isEarned = earned.has(trophy.id);
  const masked = trophyIsMasked(trophy);
  const name = masked ? "Hidden trophy" : trophy.name;
  const desc = masked
    ? "Hidden on PlayStation until earned."
    : trophy.description;
  const tags = [];
  tags.push('<span class="tag">' + gradeLabel(trophy.grade) + '</span>');
  tags.push('<span class="tag">' + kindLabel(trophy.kind) + '</span>');
  if (trophy.hidden) tags.push('<span class="tag tag-hidden">Hidden</span>');
  if (trophy.missable) tags.push('<span class="tag tag-missable">Missable</span>');
  if (trophy.targetLabel) tags.push('<span class="tag tag-target">' + escapeHtml(trophy.targetLabel) + '</span>');
  return (
    '<li class="trophy grade-' + trophy.grade + (isEarned ? " is-earned" : "") + (selectedId === trophy.id ? " is-selected" : "") + '" data-id="' + trophy.id + '" tabindex="0" role="button" aria-pressed="' + (selectedId === trophy.id) + '">' +
    '<div class="trophy-head">' +
    '<input class="trophy-check" type="checkbox" data-check="' + trophy.id + '"' + (isEarned ? " checked" : "") + ' aria-label="Mark ' + escapeHtml(name) + ' as earned">' +
    '<div class="trophy-main">' +
    '<h3 class="trophy-name"><span class="grade-dot" aria-hidden="true"></span>' + escapeHtml(name) + '</h3>' +
    '<p class="trophy-desc">' + escapeHtml(desc) + '</p>' +
    '<div class="trophy-tags">' + tags.join("") + '</div>' +
    '</div></div></li>'
  );
}

function applyFilters(list) {
  const q = searchText.trim().toLowerCase();
  return list.filter((t) => {
    if (kindFilter === "missable" && !t.missable) return false;
    if (kindFilter !== "all" && kindFilter !== "missable" && t.kind !== kindFilter) return false;
    if (gradeFilter !== "all" && t.grade !== gradeFilter) return false;
    if (q) {
      const hay = (t.name + " " + t.description + " " + t.guide).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderTracker() {
  const filtered = applyFilters(trophies);
  $("#trophy-list").innerHTML = filtered.map(trophyRow).join("");
  $("#empty-state").hidden = filtered.length > 0;
  const done = countEarned();
  const shown = filtered.filter((t) => earned.has(t.id)).length;
  $("#list-meta").textContent =
    "Showing " + filtered.length + " of " + trophies.length + " trophies" +
    (filtered.length !== trophies.length ? " (" + shown + " earned in this view)" : " — " + done + " earned") + ". Click a row to read its guide.";
}

function renderDetail() {
  const pane = $("#detail");
  const trophy = trophies.find((t) => t.id === selectedId);
  if (!trophy) {
    pane.innerHTML = '<p class="detail-empty">Select a trophy on the left to read its guide and sources here.</p>';
    return;
  }
  const isEarned = earned.has(trophy.id);
  const masked = trophyIsMasked(trophy);
  const name = masked ? "Hidden trophy" : trophy.name;
  const desc = masked ? "Hidden on PlayStation until earned." : trophy.description;
  const guide = masked
    ? "Guide hidden until earned — it names the mission."
    : trophy.guide;
  const sources = (trophy.sources || [])
    .map((s) => '<li><a href="' + escapeHtml(s.url) + '" target="_blank" rel="noopener">' + escapeHtml(s.name) + '</a></li>')
    .join("");
  const tags = [];
  tags.push('<span class="tag">' + gradeLabel(trophy.grade) + '</span>');
  tags.push('<span class="tag">' + kindLabel(trophy.kind) + '</span>');
  if (trophy.hidden) tags.push('<span class="tag tag-hidden">Hidden</span>');
  if (trophy.missable) tags.push('<span class="tag tag-missable">Missable</span>');
  if (trophy.targetLabel) tags.push('<span class="tag tag-target">' + escapeHtml(trophy.targetLabel) + '</span>');
  pane.innerHTML =
    '<h3><span class="grade-dot" aria-hidden="true"></span>' + escapeHtml(name) + '</h3>' +
    '<p class="detail-desc">' + escapeHtml(desc) + '</p>' +
    '<div class="trophy-tags">' + tags.join("") + '</div>' +
    '<p class="detail-status">' + (isEarned ? "✓ Earned" : "Not earned yet") + ' · Roadmap stage ' + trophy.stage + ' of 5</p>' +
    '<p class="detail-guide">' + escapeHtml(guide) + '</p>' +
    '<ul class="guide-sources"><li><strong>Sources:</strong></li>' + sources + '</ul>';
}

function renderRoadmap() {
  $("#roadmap").innerHTML = ROADMAP.map((stage) => {
    const items = trophies.filter((t) => t.stage === stage.stage);
    const done = items.filter((t) => earned.has(t.id)).length;
    const pct = items.length ? Math.round((done / items.length) * 100) : 0;
    const names = items.map((t) => escapeHtml(t.name)).join(", ");
    return (
      '<li class="stage"><h3><span class="stage-num">Stage ' + stage.stage + '</span>' + escapeHtml(stage.title) + '</h3>' +
      '<p>' + escapeHtml(stage.text) + '</p>' +
      '<div class="stage-bar" role="progressbar" aria-valuenow="' + done + '" aria-valuemax="' + items.length + '"><div class="stage-fill" style="width:' + pct + '%"></div></div>' +
      '<p><span class="stage-count">' + done + ' / ' + items.length + ' earned in this stage.</span></p>' +
      '<ul><li>' + names + '</li></ul></li>'
    );
  }).join("");
}

function renderMissables() {
  const box = $("#missable-list");
  const missable = trophies.filter((t) => t.missable);
  box.innerHTML = missable.map((t) => {
    const isEarned = earned.has(t.id);
    const sources = (t.sources || [])
      .map((s) => '<li><a href="' + escapeHtml(s.url) + '" target="_blank" rel="noopener">' + escapeHtml(s.name) + '</a></li>')
      .join("");
    return (
      '<article class="missable-card"><h3>⚠ ' + escapeHtml(t.name) + ' — ' + gradeLabel(t.grade) + '</h3>' +
      '<p><em>' + escapeHtml(t.description) + '</em></p>' +
      '<p>' + escapeHtml(t.guide) + '</p>' +
      '<ul class="guide-sources"><li><strong>Sources:</strong></li>' + sources + '</ul>' +
      '<p><strong>Status:</strong> ' + (isEarned ? "Earned — the danger is past." : "Not earned yet — do the Chapter 1 meditation before Chapter 1 ends.") + '</p></article>'
    );
  }).join("");
}

function renderSources() {
  const seen = new Map();
  for (const t of trophies) {
    for (const s of t.sources || []) {
      if (!seen.has(s.url)) seen.set(s.url, s.name);
    }
  }
  $("#source-list").innerHTML = Array.from(seen.entries())
    .map(([url, name]) => '<li><a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + escapeHtml(name) + '</a></li>')
    .join("");
}

function renderAll() {
  renderCounts();
  renderTracker();
  renderDetail();
  renderRoadmap();
  renderMissables();
  renderSources();
}

function setTab(name) {
  $$(".tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === name));
  $$(".tab-panel").forEach((p) => p.classList.toggle("is-active", p.id === "tab-" + name));
}

function toggleEarned(id, on) {
  if (on) earned.add(id);
  else earned.delete(id);
  saveProgress();
  renderAll();
}

function selectTrophy(id) {
  selectedId = id;
  renderTracker();
  renderDetail();
}

function exportProgress() {
  const payload = { app: "leonida-ledger", version: 1, exportedAt: new Date().toISOString(), earned: Array.from(earned).sort() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gta6-trophy-progress.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const ids = Array.isArray(data) ? data : data.earned;
      if (!Array.isArray(ids)) throw new Error("No earned list in file");
      const valid = new Set(trophies.map((t) => t.id));
      earned = new Set(ids.filter((id) => valid.has(id)));
      saveProgress();
      renderAll();
      $("#list-meta").textContent = "Imported " + earned.size + " earned trophies.";
    } catch (err) {
      $("#list-meta").textContent = "Import failed: that file is not a Leonida Ledger export.";
    }
  };
  reader.readAsText(file);
}

function resetProgress() {
  if (!window.confirm("Clear all earned trophies? This cannot be undone.")) return;
  earned = new Set();
  saveProgress();
  renderAll();
}

function bindEvents() {
  $$(".tab").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
  $$("#kind-chips .chip").forEach((c) => c.addEventListener("click", () => {
    kindFilter = c.dataset.kind;
    $$("#kind-chips .chip").forEach((x) => x.classList.toggle("is-active", x === c));
    renderTracker();
  }));
  $("#grade-filter").addEventListener("change", (e) => { gradeFilter = e.target.value; renderTracker(); });
  $("#search").addEventListener("input", (e) => { searchText = e.target.value; renderTracker(); });
  $("#spoiler").addEventListener("change", (e) => { spoilerOn = e.target.checked; saveSpoiler(); renderAll(); });
  $("#export-btn").addEventListener("click", exportProgress);
  $("#import-btn").addEventListener("click", () => $("#import-file").click());
  $("#import-file").addEventListener("change", (e) => { if (e.target.files[0]) importProgress(e.target.files[0]); e.target.value = ""; });
  $("#reset-btn").addEventListener("click", resetProgress);
  $("#trophy-list").addEventListener("change", (e) => {
    const id = e.target.dataset.check;
    if (id) { e.stopPropagation(); toggleEarned(id, e.target.checked); }
  });
  $("#trophy-list").addEventListener("click", (e) => {
    if (e.target.closest("[data-check]")) return;
    const row = e.target.closest(".trophy");
    if (row) selectTrophy(row.dataset.id);
  });
  $("#trophy-list").addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("trophy")) {
      e.preventDefault();
      selectTrophy(e.target.dataset.id);
    }
  });
}

async function bootLeonidaLedger() {
  try {
    await loadTrophies();
  } catch (err) {
    $("#trophy-list").innerHTML = '<li class="trophy"><p>Could not load the trophy list. Serve the app/ folder with a static server and reload.</p></li>';
    return;
  }
  loadProgress();
  $("#spoiler").checked = spoilerOn;
  selectedId = "positive-mental-attitude";
  bindEvents();
  renderAll();
}

bootLeonidaLedger();
