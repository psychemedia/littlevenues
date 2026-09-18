let independentStageLookup = null;

let currentIndependentStage = null; // { key, record }


function displayIndependentStage() {}

function refreshDirectoryData() {}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

function getIndependentStageURLParams() {
  const p = new URLSearchParams(window.location.search);
  return { independentStageId: p.get("independentStage"), cacheBuster: p.get("v") };
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
    alert("No independentStage selected");
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


function buildIndependentStageCard(item) {}

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
// Init
// ---------------------------------------------------------------------------

/**
 * Forces a genuinely fresh copy of grass_roots_normalized.json (bypassing the
 * normal auto-rolling cache window defined in shared_utils.js) and
 * re-renders the page with it. Wired up to the "Refresh data" button.
 */
function refreshEventsData() {
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


  const { independentStageId, cacheBuster } = getIndependentStageURLParams();
})();