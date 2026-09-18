// independent_stages.js
// Drives independent_stages.html
// Depends on shared_utils.js (and recurrence-engine.js, which shared_utils.js
// itself depends on) being loaded first.

let eventsData = null;
let independentStagesLookup = {};
let festivalsLookup = {};
let promotersLookup = {};

let currentIndependentStage = null; // { key, record }

// ---------------------------------------------------------------------------
// Display-name / type / flag helpers
// ---------------------------------------------------------------------------

/**
 * Turn a slug like "tea-tent" or "knockerdown_inn" into "Tea Tent" /
 * "Knockerdown Inn". Shared by the display-name fallback and by the type
 * badge labels.
 */
function humanizeSlug(slug) {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * A number of independent stage records (e.g. "knockerdown-inn",
 * "tiny-tea-tent") don't have a name field yet. Fall back to a
 * human-readable version of the id rather than showing the raw slug.
 */
function getStageDisplayName(id, stage) {
  if (stage?.name) return stage.name;
  return humanizeSlug(id);
}

/**
 * A stage's `type` can be a single string or an array of strings (per
 * grass_roots_schema.json). Normalise to an array either way.
 */
function getStageTypes(stage) {
  if (!stage?.type) return [];
  return Array.isArray(stage.type) ? stage.type : [stage.type];
}

// Minimal, self-contained date resolution for festivals a stage appears at —
// mirrors getFestivalDates()/pickFestivalRunning() in small_festivals_display.js
// and promoters.js. Duplicated (rather than shared) since this page doesn't
// load either of those scripts; kept intentionally small.
//
// Pull raw start/end date strings out of a festival or running record.
// The source data isn't consistent about shape, so this checks, in order:
//   - a nested dates{} object, using either start/end or start_date/end_date
//   - flat start_date (+ optional end_date)
//   - a bare single date (single-day event, e.g. ragged-bear-2026,
//     or a single-day running like wigan-diggers-2026)
function extractDates(obj) {
  if (!obj) return { start: null, end: null };
  const nested = obj.dates;
  if (nested) {
    const start = nested.start || nested.start_date || null;
    if (start) {
      return { start, end: nested.end || nested.end_date || start };
    }
  }
  if (obj.start_date) {
    return { start: obj.start_date, end: obj.end_date || obj.start_date };
  }
  if (obj.date) {
    return { start: obj.date, end: obj.date };
  }
  return { start: null, end: null };
}

function pickFestivalRunning(fest) {
  const runnings = fest?.runnings;
  if (!runnings || typeof runnings !== "object") return null;
  const today = getTodayMidnight();
  const candidates = Object.entries(runnings)
    .map(([key, r]) => {
      const { start: startStr, end: endStr } = extractDates(r);
      return {
        key,
        r,
        start: parseDateString(startStr),
        end: parseDateString(endStr) || parseDateString(startStr),
      };
    })
    .filter((c) => c.start);
  if (!candidates.length) return null;
  const current = candidates.find((c) => c.start <= today && c.end >= today);
  if (current) return current;
  const future = candidates
    .filter((c) => c.start > today)
    .sort((a, b) => a.start - b.start);
  if (future.length) return future[0];
  return candidates.sort((a, b) => b.start - a.start)[0];
}

function getFestivalDates(fest) {
  const direct = extractDates(fest);
  if (direct.start) return direct;
  const running = pickFestivalRunning(fest);
  if (running) {
    return extractDates(running.r);
  }
  return { start: null, end: null };
}

function formatDateRange(dates) {
  const start = parseDateString(dates.start);
  const end = parseDateString(dates.end);
  if (!start) return "";
  const fmt = { day: "numeric", month: "short", year: "numeric" };
  if (!end || start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString("en-GB", fmt);
  }
  return `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", fmt)}`;
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

function getIndependentStageURLParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    independentStageId: p.get("independentStage"),
    cacheBuster: p.get("v"),
  };
}

function updateURL(independentStageId) {
  const p = new URLSearchParams({ independentStage: independentStageId });
  window.history.pushState(
    { independentStageId },
    "",
    `${window.location.pathname}?${p}`,
  );
}

function shareIndependentStageLink() {
  if (!currentIndependentStage?.key) {
    alert("No independent stage / tea tent selected");
    return;
  }
  const url = `${location.origin}${location.pathname}?independentStage=${encodeURIComponent(currentIndependentStage.key)}`;
  navigator.clipboard
    .writeText(url)
    .then(() => {
      const btn = document.querySelector(
        "button[onclick='shareIndependentStageLink()']",
      );
      showCopyFeedback(btn);
    })
    .catch(console.error);
}

function handleIndependentStageSelectChange() {
  const id = document.getElementById("independentStageSelect").value;
  if (id) {
    displayIndependentStage(id);
    updateURL(id);
  }
}

function loadSelectedIndependentStage() {
  const id = document.getElementById("independentStageSelect").value;
  if (!id) {
    alert("Please select an independent stage / tea tent");
    return;
  }
  displayIndependentStage(id);
  updateURL(id);
}

// ---------------------------------------------------------------------------
// Overview cards
// ---------------------------------------------------------------------------

function buildIndependentStageCard(id, stage) {
  const card = document.createElement("div");
  card.className = "stage-overview-card";
  card.id = `stage-card-${id}`;
  card.style.cursor = "pointer";

  const name = document.createElement("div");
  name.className = "stage-card-name";
  name.textContent = getStageDisplayName(id, stage);
  card.appendChild(name);

  const types = getStageTypes(stage);
  if (types.length) {
    //const typeRow = document.createElement("div");
    //typeRow.className = "stage-card-types";
    //types.forEach((t) =>
    //  typeRow.appendChild(makeBadge("badge-stage-type", humanizeSlug(t))),
    //);
    addIndependentStageBadges(stage, card);
    //card.appendChild(typeRow);
    
  }

  if (stage.description) {
    const desc = document.createElement("div");
    desc.className = "stage-card-desc";
    const MAX = 120;
    desc.textContent =
      stage.description.length > MAX
        ? stage.description.slice(0, MAX).trim() + "…"
        : stage.description;
    card.appendChild(desc);
  }

  const festivalCount = (stage.festivals || []).length;

  if (festivalCount) {
    const counts = document.createElement("div");
    counts.className = "stage-card-counts";
    const badge = document.createElement("span");
    badge.className = "stage-card-badge";
    badge.textContent = `${festivalCount} festival${festivalCount !== 1 ? "s" : ""}`;
    counts.appendChild(badge);
    card.appendChild(counts);
  }

  card.addEventListener("click", () => {
    document.getElementById("independentStageSelect").value = id;
    displayIndependentStage(id);
    updateURL(id);
    document
      .getElementById("independentStageContent")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  });

  return card;
}

function renderIndependentStagesOverview() {
  const body = document.getElementById("allStagesBody");
  const entries = Object.entries(independentStagesLookup);
  body.innerHTML = "";

  if (!entries.length) {
    body.innerHTML =
      '<p class="stage-panel-placeholder">No independent stages or tea tents listed yet.</p>';
    return;
  }

  entries.sort(([idA, a], [idB, b]) =>
    getStageDisplayName(idA, a).localeCompare(getStageDisplayName(idB, b)),
  );

  const grid = document.createElement("div");
  grid.className = "stage-cards-grid";
  entries.forEach(([id, stage]) =>
    grid.appendChild(buildIndependentStageCard(id, stage)),
  );
  body.appendChild(grid);
}

function populateIndependentStageDropdown() {
  const sel = document.getElementById("independentStageSelect");
  Object.entries(independentStagesLookup)
    .map(([id, s]) => ({ id, name: getStageDisplayName(id, s) }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(({ id, name }) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = name;
      sel.appendChild(opt);
    });
}

// ---------------------------------------------------------------------------
// Detail: badges / links / linked festivals
// ---------------------------------------------------------------------------

function buildEmptyNote(text) {
  const p = document.createElement("p");
  p.className = "stage-empty-note";
  p.textContent = text;
  return p;
}

/**
 * Type + booking-style flag badges for the detail view: the stage's
 * type(s), whether it's a pop-up, how performers get a slot (pre-booked vs.
 * walk-up), and whether it runs open-mic slots or is more of a jam/session
 * space. Only flags explicitly present in the record are shown — an absent
 * boolean means "not recorded", not "no".
 */
function addIndependentStageBadges(stage, container) {
  getStageTypes(stage).forEach((t) =>
    container.appendChild(makeBadge("badge-stage-type", humanizeSlug(t))),
  );

  if (stage.popUp === true) {
    container.appendChild(makeBadge("badge-stage-popup", "Pop-up"));
  }
  if (stage.prebooked === true) {
    container.appendChild(makeBadge("badge-stage-prebooked", "Pre-booked"));
  }

  if (stage.open_mic === true) {
    container.appendChild(makeBadge("badge-stage-openmic", "Open mic"));
  }
  if (stage.session === true) {
    container.appendChild(makeBadge("badge-stage-session", "Session"));
  }
}

function renderIndependentStageBadges(stage, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  addIndependentStageBadges(stage, container);

  container.style.display = container.hasChildNodes() ? "flex" : "none";
}

function renderIndependentStageMeta(stage) {
  const el = document.getElementById("independentStageMeta");
  el.innerHTML = "";
  if (stage.booking_period) {
    const p = document.createElement("p");
    p.className = "stage-booking-period";
    p.textContent = `📅 Booking period: ${stage.booking_period}`;
    el.appendChild(p);
  }
  el.style.display = el.hasChildNodes() ? "block" : "none";
}

function renderIndependentStageLinks(stage) {
  const linksEl = document.getElementById("independentStageLinks");
  linksEl.innerHTML = "";
  [
    { url: stage.url, label: "🌐 Website" },
    { url: stage.facebook, label: "📘 Facebook" },
  ].forEach(({ url, label }) => {
    const link = createExternalLink(url, label, {
      className: "stage-ext-link",
    });
    if (link) linksEl.appendChild(link);
  });
  linksEl.style.display = linksEl.hasChildNodes() ? "flex" : "none";
}

function renderIndependentStagePromoter(stage) {
  const el = document.getElementById("independentStagePromoter");
  el.innerHTML = "";
  if (!stage.promoter_id) {
    el.style.display = "none";
    return;
  }
  const promoter = promotersLookup[stage.promoter_id];
  const a = document.createElement("a");
  a.className = "stage-promoter-link";
  a.href = `promoters.html?promoter=${encodeURIComponent(stage.promoter_id)}`;
  a.textContent = promoter
    ? `Run by: ${getStageDisplayName(stage.promoter_id, promoter)}`
    : `Run by: ${stage.promoter_id}`;
  el.appendChild(a);
  el.style.display = "block";
}

function renderIndependentStageFestivals(stage) {
  const container = document.getElementById("independentStageFestivalsList");
  container.innerHTML = "";
  const ids = stage.festivals || [];

  if (!ids.length) {
    container.appendChild(
      buildEmptyNote("No festivals linked to this stage yet."),
    );
    return;
  }

  ids.forEach((festId) => {
    const fest = festivalsLookup[festId];
    const row = document.createElement("a");
    row.className = "stage-list-item";
    row.href = `small_festivals.html?festival=${encodeURIComponent(festId)}`;

    const name = document.createElement("div");
    name.className = "stage-list-item-name";
    name.textContent = fest ? fest.name : festId;
    row.appendChild(name);

    if (fest) {
      const dateRange = formatDateRange(getFestivalDates(fest));
      if (dateRange) {
        const meta = document.createElement("div");
        meta.className = "stage-list-item-meta";
        meta.textContent = dateRange;
        row.appendChild(meta);
      }
    } else {
      row.classList.add("stage-list-item-unresolved");
    }

    container.appendChild(row);
  });
}

// ---------------------------------------------------------------------------
// Independent stage detail
// ---------------------------------------------------------------------------

function displayIndependentStage(independentStageId) {
  const stage = independentStagesLookup[independentStageId];
  if (!stage) {
    document.getElementById("independentStageContent").style.display = "none";
    document.getElementById("independentStageNotFound").style.display = "block";
    return;
  }

  currentIndependentStage = { key: independentStageId, record: stage };
  document.getElementById("independentStageNotFound").style.display = "none";
  document.getElementById("independentStageContent").style.display = "block";

  const displayName = getStageDisplayName(independentStageId, stage);
  document.title = `${displayName} — Grass Roots Scene`;
  updateMeta("description", displayName, " — ");
  updateMeta("keywords", displayName, ", ");

  document.getElementById("independentStageTitle").textContent = displayName;

  // Subtitle only shown when the record has no proper name, as a hint
  // that the display name is a fallback derived from its id.
  const subtitleEl = document.getElementById("independentStageSubtitle");
  if (!stage.name) {
    subtitleEl.textContent = `(id: ${independentStageId})`;
    subtitleEl.style.display = "block";
  } else {
    subtitleEl.style.display = "none";
  }

  renderIndependentStageBadges(stage, "independentStageBadges");
  renderIndependentStageMeta(stage);
  renderIndependentStageLinks(stage);
  renderIndependentStagePromoter(stage);

  // Description
  const descEl = document.getElementById("independentStageDescription");
  descEl.innerHTML = "";
  if (stage.description) {
    appendParagraphs(descEl, stage.description);
    descEl.style.display = "block";
  } else {
    descEl.style.display = "none";
  }

  renderIndependentStageFestivals(stage);
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

/**
 * Forces a genuinely fresh copy of grass_roots_normalized.json (bypassing the
 * normal auto-rolling cache window defined in shared_utils.js) and
 * re-renders the page with it. Wired up to the "Refresh data" button.
 */
function refreshDirectoryData() {
  const btn = document.getElementById("refreshDataBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Refreshing…";
  }
  sessionStorage.setItem("forceFreshEventsData", "1");
  window.location.reload();
}

// Initialize.
// Runs as soon as this script executes rather than waiting for the "load"
// event (which would also wait on the Leaflet CDN CSS/JS and anything else
// on the page), so the JSON fetch starts as early as possible.
setCanonical("independentStage");

(async () => {
  const forcedRefresh = sessionStorage.getItem("forceFreshEventsData");
  if (forcedRefresh) sessionStorage.removeItem("forceFreshEventsData");

  document.getElementById("allStagesBody").innerHTML =
    '<p class="stage-panel-placeholder">Loading independent stages / tea tents…</p>';

  const { independentStageId, cacheBuster } = getIndependentStageURLParams();

  const result = await loadEventsData(
    cacheBuster || (forcedRefresh ? Date.now() : null),
  );
  if (!result) {
    console.error("Failed to load events data");
    document.getElementById("allStagesBody").innerHTML =
      '<p class="not-found">Could not load directory data. Please try refreshing the page.</p>';
    return;
  }

  eventsData = result.eventsData;
  independentStagesLookup = eventsData.independent_stages || {};
  festivalsLookup = eventsData.festivals || {};
  promotersLookup = eventsData.promoters || {};

  displayDataLastUpdated(result.lastUpdateTime);
  initNavFeedback();

  setTimeout(() => {
    populateIndependentStageDropdown();
    renderIndependentStagesOverview();

    if (independentStageId) {
      document.getElementById("independentStageSelect").value =
        independentStageId;
      displayIndependentStage(independentStageId);
      setTimeout(() => {
        document
          .getElementById("independentStageContent")
          .scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, 0);
})();
