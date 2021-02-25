/*

Example use:

fetch("https://scratch.mit.edu/site-api/messages/messages-clear/?sareferer", {
  "headers": {
    "x-csrftoken": addon.auth.csrfToken,
    "x-requested-with": "XMLHttpRequest",
  },
  "method": "POST",
});

*/

chrome.declarativeNetRequest.updateDynamicRules({
  removeRuleIds: [1],
  addRules: [
    {
      id: 1,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          {
            header: "Referer",
            operation: "set",
            value: "https://scratch.mit.edu/",
          },
        ],
      },
      condition: {
        // Only includes requests from the background
        domains: [chrome.runtime.id],
        urlFilter: `*sareferer`,
        resourceTypes: ["xmlhttprequest"],
      },
    },
  ],
});

/*
const extraInfoSpec = ["blocking", "requestHeaders"];
const extraInfoSpec2 = ["blocking", "responseHeaders"];
if (Object.prototype.hasOwnProperty.call(chrome.webRequest.OnBeforeSendHeadersOptions, "EXTRA_HEADERS")) {
  extraInfoSpec.push("extraHeaders");
  extraInfoSpec2.push("extraHeaders");
}

const optionRequestIds = [];

chrome.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    if (details.originUrl) {
      // Firefox
      const origin = new URL(details.originUrl).origin;
      if (origin !== chrome.runtime.getURL("").slice(0, -1) && origin !== "https://scratch.mit.edu") return;
    } else if (
      // Chrome
      details.initiator !== chrome.runtime.getURL("").slice(0, -1) &&
      details.initiator !== "https://scratch.mit.edu"
    )
      return;

    let interceptRequest = optionRequestIds.includes(details.requestId);
    if (!interceptRequest && details.requestHeaders) {
      for (let i = 0; i < details.requestHeaders.length; i++) {
        const headerName = details.requestHeaders[i].name;
        if (headerName === "X-ScratchAddons-Uses-Fetch") {
          interceptRequest = true;
        }
      }
    }
    if (interceptRequest) {
      details.requestHeaders.push({
        name: "Referer",
        value: "https://scratch.mit.edu/",
      });
      details.requestHeaders.push({
        name: "X-csrftoken",
        value: scratchAddons.globalState.auth.csrfToken,
      });
      details.requestHeaders.push({
        name: "X-Token",
        value: scratchAddons.globalState.auth.xToken,
      });
      details.requestHeaders.push({
        name: "X-Requested-With",
        value: "XMLHttpRequest",
      });
      return {
        requestHeaders: details.requestHeaders,
      };
    }
  },
  {
    urls: ["https://scratch.mit.edu/*", "https://api.scratch.mit.edu/*", "https://clouddata.scratch.mit.edu/*"],
    types: ["xmlhttprequest"],
  },
  extraInfoSpec
);

chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
    if (details.method === "OPTIONS" && details.responseHeaders) {
      for (let i = 0; i < details.responseHeaders.length; i++) {
        const headerName = details.responseHeaders[i].name;
        if (headerName === "access-control-allow-headers") {
          details.responseHeaders[i].value += ", x-scratchaddons-uses-fetch";
          return {
            responseHeaders: details.responseHeaders,
          };
        }
      }
    }
  },
  {
    urls: ["https://scratch.mit.edu/*", "https://api.scratch.mit.edu/*", "https://clouddata.scratch.mit.edu/*"],
    types: ["xmlhttprequest"],
  },
  extraInfoSpec2
);
*/
