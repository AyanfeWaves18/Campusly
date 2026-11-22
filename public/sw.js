// Campusly service worker: keeps only the app's own files, never private data. Also shows notifications.
const CACHE = "campusly-shell-v2";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Only our own files. Never Supabase, Google, photos, voice notes, or anything private.
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        const isShell = req.mode === "navigate" || /\.(js|css|png|svg|ico|woff2?|json)$/.test(url.pathname);
        if (res.ok && isShell) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("/")))
  );
});

// A notification arrives from the server
self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch (err) {
    data = { title: "Campusly", body: e.data ? e.data.text() : "" };
  }

  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      // If the app is open and on screen, it already shows the news itself
      if (!data.force && wins.some((w) => w.visibilityState === "visible")) return;
      return self.registration.showNotification(data.title || "Campusly", {
        body: data.body || "",
        tag: data.tag || undefined,
        icon: "/favicon-192.png",
        badge: "/favicon-192.png",
        data: { url: data.url || "/feed" },
      });
    })
  );
});

// Tapping a notification opens Campusly at the right page
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const raw = e.notification.data && e.notification.data.url;
  // Only pages inside Campusly, never another website
  const path = typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/feed";
  const target = new URL(path, self.location.origin).href;

  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (wins) => {
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin) {
          await w.focus();
          if ("navigate" in w) {
            try {
              await w.navigate(target);
            } catch (err) {
              // If it can't move, it stays where it is
            }
          }
          return;
        }
      }
      return self.clients.openWindow(target);
    })
  );
});