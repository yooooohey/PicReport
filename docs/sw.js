/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "402b66900e731ca748771b6fc5e7a068"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "609de941242493efe8dd7e032612f4c2"
  }, {
    "url": "pwa-512x512.png",
    "revision": "d0e82739ebed3ff45201ee1b8b7c2155"
  }, {
    "url": "pwa-192x192.png",
    "revision": "7e93b82173449b233af1d38a3d970d9d"
  }, {
    "url": "index.html",
    "revision": "af5d6592797e2b5af6eb1ff1e8a40ee1"
  }, {
    "url": "icon.svg",
    "revision": "563ed34cb2819a6bd95d674531dc1725"
  }, {
    "url": "favicon.ico",
    "revision": "f1ce348e602e0fb625186b1527af6693"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "aa000887cd9f6516a6b75b35c6b75b5e"
  }, {
    "url": "assets/index-DJ-JpiuL.css",
    "revision": null
  }, {
    "url": "assets/index-BllzGZux.js",
    "revision": null
  }, {
    "url": "assets/aistudio/ai__4__1d0f324a.html",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "aa000887cd9f6516a6b75b35c6b75b5e"
  }, {
    "url": "favicon.ico",
    "revision": "f1ce348e602e0fb625186b1527af6693"
  }, {
    "url": "icon.svg",
    "revision": "563ed34cb2819a6bd95d674531dc1725"
  }, {
    "url": "pwa-192x192.png",
    "revision": "7e93b82173449b233af1d38a3d970d9d"
  }, {
    "url": "pwa-512x512.png",
    "revision": "d0e82739ebed3ff45201ee1b8b7c2155"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "609de941242493efe8dd7e032612f4c2"
  }, {
    "url": "manifest.webmanifest",
    "revision": "e9b27babbbc9d3fcc6923e795e455070"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
