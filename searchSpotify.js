import fetch from "node-fetch";

const clientId = "ab2b23ccbecd4ac381ee124c83030203";
const clientSecret = "94ec031fb9e74dd881f35cc8c4c1630c";

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  const now = Date.now();

  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  const data = await response.json();

  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in - 60) * 1000;

  return cachedToken;
}

export default async function handler(req, res) {
  const { q } = req.query;

  if (!q) {
    res.status(400).json({ error: "Missing query param 'q'" });
    return;
  }

  const token = await getAccessToken();

  const searchParams = new URLSearchParams({
    q,
    type: "track",
    limit: "5"
  });

  const response = await fetch(`https://api.spotify.com/v1/search?${searchParams}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (data.error) {
    res.status(500).json({ error: data.error.message });
    return;
  }

  const results = data.tracks.items.map(track => ({
    id: track.id,
    name: track.name,
    artist: track.artists.map(a => a.name).join(", "),
    album: track.album.name,
    preview_url: track.preview_url
  }));

  res.status(200).json({ results });
}
