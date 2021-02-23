import { createBackgroundEndpoint, isMessagePort } from "../libraries/comlink-extension.mjs";
import * as Comlink from "../libraries/comlink.mjs";

chrome.runtime.onConnect.addListener((port) => {
    if (isMessagePort(port)) return;
   
    Comlink.expose(
      {
        test() {
          console.log("called");
        },
      },
      createBackgroundEndpoint(port)
    );
  });