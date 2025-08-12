// api/searchSpotify.js  (CommonJS + fetch global en Node 18 de Vercel)

const clientId = "ab2b23ccbecd4ac381ee124c83030203";
const clientSecret = "94ec031fb9e74dd881f35cc8c4c1630c";

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error_description || "Token error");

  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in - 60) * 1000; // renovar 1 min antes
  return cachedToken;
}

module.exports = async (req, res) => {
  try {
    const q = req.query?.q || req.query?.get?.("q"); // compat
    if (!q) {
      res.status(400).json({ error: "Missing query param 'q'" });
      return;
    }

    const token = await getAccessToken();

    const params = new URLSearchParams({ q, type: "track", limit: "5" });
    const sResp = await fetch(`https://api.spotify.com/v1/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const sData = await sResp.json();

    if (!sResp.ok) {
      res.status(500).json({ error: sData.error?.message || "Spotify search error" });
      return;
    }

    const results = (sData.tracks?.items || []).map((track) => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
      album: track.album.name,
      preview_url: track.preview_url,
    }));

    res.status(200).json({ results });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
};
