if (scratchAddons.localState.allReady) getUsercripts();
else window.addEventListener("scratchaddonsready", getUsercripts);

const addonsWithUserscripts = [];
async function getUsercripts() {
  for (const addonId in scratchAddons.manifests) {
    const manifest = scratchAddons.manifests[addonId];
    if (manifest.userscripts) {
      addonsWithUserscripts.push({ addonId, scripts: manifest.userscripts });
    }
  }
}

chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  if (request.getUserscripts) {
    const addons = [];
    for (const addon of addonsWithUserscripts) {
      if (!scratchAddons.localState.addonsEnabled[addon.addonId]) continue;
      const scriptsToRun = [];
      for (const script of addon.scripts) {
        if (userscriptMatches(request.getUserscripts, script.matches))
          scriptsToRun.push(script.url);
      }
      if (scriptsToRun.length)
        addons.push({ addonId: addon.addonId, scripts: scriptsToRun });
    }
    sendResponse(addons);
  }
});

function userscriptMatches(data, matches) {
  const url = data.url;
  for (const match of matches) {
    if (urlMatchesPattern(match, url)) return true;
  }
  return false;
}

function urlMatchesPattern(pattern, url) {
  const patternURL = new URL(pattern);
  const urlURL = new URL(url);
  if (patternURL.origin !== urlURL.origin) return false;
  const patternPath = patternURL.pathname.split("/");
  const urlPath = urlURL.pathname.split("/");
  if (urlPath[urlPath.length - 1] !== "") urlPath.push("");
  while (patternPath.length) {
    const p = patternPath.shift();
    const q = urlPath.shift();
    if (p !== q && p !== "*") return false;
  }
  return true;
}
