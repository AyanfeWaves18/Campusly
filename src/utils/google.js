const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function loadScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// Returns { name, email, picture, email_verified } for the Google account the user picks
export async function googleSignIn() {
  if (!CLIENT_ID) throw new Error("no-client-id");
  await loadScript();

  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: "openid email profile",
      callback: async (resp) => {
        if (resp.error) return reject(new Error(resp.error));
        try {
          const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${resp.access_token}` },
          });
          resolve(await r.json());
        } catch (e) {
          reject(e);
        }
      },
      error_callback: reject,
    });
    client.requestAccessToken();
  });
}