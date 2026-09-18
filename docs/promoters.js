let promotersLookup = null;

let currentPromoter = null; // { key, record }


function displayPromoter() {}

function refreshDirectoryData() {}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

function getPromoterURLParams() {
  const p = new URLSearchParams(window.location.search);
  return { promoterId: p.get("promoter"), cacheBuster: p.get("v") };
}

function updateURL(promoterId) {
  const p = new URLSearchParams({ promoter: promoterId });
  window.history.pushState(
    { promoterId },
    "",
    `${window.location.pathname}?${p}`,
  );
}

function sharePromoterLink() {
  if (!currentPromoter?.key) {
    alert("No promoter selected");
    return;
  }
  const url = `${location.origin}${location.pathname}?promoter=${encodeURIComponent(currentPromoter.key)}`;
  navigator.clipboard
    .writeText(url)
    .then(() => {
      const btn = document.querySelector(
        "button[onclick='sharePromoterLink()']",
      );
      showCopyFeedback(btn);
    })
    .catch(console.error);
}


function buildPromoterCard(item) {}

function handlePromoterSelectChange() {
  const id = document.getElementById("promoterSelect").value;
  if (id) {
    displayPromoter(id);
    updateURL(id);
  }
}

function loadSelectedPromoter() {
  const id = document.getElementById("promoterSelect").value;
  if (!id) {
    alert("Please select a promoter");
    return;
  }
  displayPromoter(id);
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
setCanonical("promoter");


(async () => {
  const forcedRefresh = sessionStorage.getItem("forceFreshEventsData");
  if (forcedRefresh) sessionStorage.removeItem("forceFreshEventsData");


  const { promoterId, cacheBuster } = getPromoterURLParams();
})();