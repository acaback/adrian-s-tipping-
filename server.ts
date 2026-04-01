import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  try {
    const app = express();
    const PORT = 3000; // Hardcoded to 3000 as per environment requirements

    // Simple in-memory cache
    const cache = new Map<string, { data: any; timestamp: number }>();
    const CACHE_TTL = 1000 * 60 * 60; // 1 hour

    const fetchWithTimeout = async (url: string, options: any = {}, timeout = 15000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(id);
        return response;
      } catch (error) {
        clearTimeout(id);
        throw error;
      }
    };

    // Hardcoded fallbacks for total API failure
    const FALLBACK_GAMES = {
      games: [
        { id: 1, round: 1, year: 2026, hteam: "Richmond", ateam: "Carlton", date: "2026-03-12 19:20:00", unixtime: 1773343200, venue: "MCG", complete: 0, hscore: 0, ascore: 0, winner: null, timestr: "7:20 PM" },
        { id: 2, round: 1, year: 2026, hteam: "Collingwood", ateam: "Sydney", date: "2026-03-13 19:40:00", unixtime: 1773430800, venue: "MCG", complete: 0, hscore: 0, ascore: 0, winner: null, timestr: "7:40 PM" },
        { id: 3, round: 1, year: 2026, hteam: "Essendon", ateam: "Hawthorn", date: "2026-03-14 13:45:00", unixtime: 1773495900, venue: "MCG", complete: 0, hscore: 0, ascore: 0, winner: null, timestr: "1:45 PM" },
        { id: 4, round: 1, year: 2026, hteam: "GWS", ateam: "North Melbourne", date: "2026-03-14 16:35:00", unixtime: 1773506100, venue: "Engie Stadium", complete: 0, hscore: 0, ascore: 0, winner: null, timestr: "4:35 PM" },
        { id: 5, round: 1, year: 2026, hteam: "Geelong", ateam: "St Kilda", date: "2026-03-14 19:30:00", unixtime: 1773516600, venue: "GMHBA Stadium", complete: 0, hscore: 0, ascore: 0, winner: null, timestr: "7:30 PM" },
        { id: 6, round: 1, year: 2026, hteam: "Gold Coast", ateam: "Adelaide", date: "2026-03-15 13:10:00", unixtime: 1773580200, venue: "People First Stadium", complete: 0, hscore: 0, ascore: 0, winner: null, timestr: "1:10 PM" },
        { id: 7, round: 1, year: 2026, hteam: "Melbourne", ateam: "Western Bulldogs", date: "2026-03-15 15:20:00", unixtime: 1773588000, venue: "MCG", complete: 0, hscore: 0, ascore: 0, winner: null, timestr: "3:20 PM" },
        { id: 8, round: 1, year: 2026, hteam: "Port Adelaide", ateam: "West Coast", date: "2026-03-15 16:10:00", unixtime: 1773591000, venue: "Adelaide Oval", complete: 0, hscore: 0, ascore: 0, winner: null, timestr: "4:10 PM" },
        { id: 9, round: 1, year: 2026, hteam: "Fremantle", ateam: "Brisbane", date: "2026-03-15 18:50:00", unixtime: 1773600600, venue: "Optus Stadium", complete: 0, hscore: 0, ascore: 0, winner: null, timestr: "6:50 PM" }
      ]
    };

    const FALLBACK_STANDINGS = {
      standings: [
        { rank: 1, name: "Brisbane", played: 0, wins: 0, losses: 0, draws: 0, pts: 0, percentage: 100 },
        { rank: 2, name: "Sydney", played: 0, wins: 0, losses: 0, draws: 0, pts: 0, percentage: 100 },
        { rank: 3, name: "Geelong", played: 0, wins: 0, losses: 0, draws: 0, pts: 0, percentage: 100 },
        { rank: 4, name: "Port Adelaide", played: 0, wins: 0, losses: 0, draws: 0, pts: 0, percentage: 100 },
        { rank: 5, name: "GWS", played: 0, wins: 0, losses: 0, draws: 0, pts: 0, percentage: 100 },
        { rank: 6, name: "Carlton", played: 0, wins: 0, losses: 0, draws: 0, pts: 0, percentage: 100 },
        { rank: 7, name: "Hawthorn", played: 0, wins: 0, losses: 0, draws: 0, pts: 0, percentage: 100 },
        { rank: 8, name: "Western Bulldogs", played: 0, wins: 0, losses: 0, draws: 0, pts: 0, percentage: 100 }
      ]
    };

    const FALLBACK_TEAMS = {
      teams: [
        { id: 1, name: "Adelaide", abbreviation: "ADL" },
        { id: 2, name: "Brisbane", abbreviation: "BRI" },
        { id: 3, name: "Carlton", abbreviation: "CAR" },
        { id: 4, name: "Collingwood", abbreviation: "COL" },
        { id: 5, name: "Essendon", abbreviation: "ESS" },
        { id: 6, name: "Fremantle", abbreviation: "FRE" },
        { id: 7, name: "Geelong", abbreviation: "GEE" },
        { id: 8, name: "Gold Coast", abbreviation: "GCS" },
        { id: 9, name: "GWS", abbreviation: "GWS" },
        { id: 10, name: "Hawthorn", abbreviation: "HAW" },
        { id: 11, name: "Melbourne", abbreviation: "MEL" },
        { id: 12, name: "North Melbourne", abbreviation: "NM" },
        { id: 13, name: "Port Adelaide", abbreviation: "POR" },
        { id: 14, name: "Richmond", abbreviation: "RIC" },
        { id: 15, name: "St Kilda", abbreviation: "STK" },
        { id: 16, name: "Sydney", abbreviation: "SYD" },
        { id: 17, name: "West Coast", abbreviation: "WCE" },
        { id: 18, name: "Western Bulldogs", abbreviation: "WBD" }
      ]
    };

    app.get("/api/games", async (req, res) => {
      const year = req.query.year || "2026";
      const cacheKey = `games-${year}`;
      const cached = cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`Returning cached games for ${year}`);
        return res.json(cached.data);
      }

      try {
        const headers = { "User-Agent": "AFLTippingApp/1.0" };
        console.log(`Fetching games for year: ${year}...`);
        
        let response = await fetchWithTimeout(`https://api.squiggle.com.au/?q=games&year=${year}`, { headers });
        
        if (!response.ok) {
          throw new Error(`Squiggle API responded with status: ${response.status}`);
        }
        let data = await response.json();
        
        // If no games for 2026, fallback to 2025 for demo purposes
        if (year === "2026" && (!data.games || data.games.length === 0)) {
          console.log("No 2026 games found, falling back to 2025");
          try {
            response = await fetchWithTimeout("https://api.squiggle.com.au/?q=games&year=2025", { headers });
            data = await response.json();
          } catch (e) {
            console.warn("2025 fallback failed, using hardcoded fallback");
            data = FALLBACK_GAMES;
          }
        }
        
        console.log(`Successfully fetched ${data.games?.length || 0} games.`);
        cache.set(cacheKey, { data, timestamp: Date.now() });
        res.json(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Squiggle API (games) issue: ${errorMessage}. Attempting fallback...`);
        if (cached) {
          console.log("Returning stale cache due to API error");
          return res.json(cached.data);
        }
        console.log("Returning hardcoded fallback games");
        res.json(FALLBACK_GAMES);
      }
    });

    app.get("/api/standings", async (req, res) => {
      const year = req.query.year || "2026";
      const cacheKey = `standings-${year}`;
      const cached = cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`Returning cached standings for ${year}`);
        return res.json(cached.data);
      }

      try {
        const headers = { "User-Agent": "AFLTippingApp/1.0" };
        console.log(`Fetching standings for year: ${year}...`);
        
        let response = await fetchWithTimeout(`https://api.squiggle.com.au/?q=standings&year=${year}`, { headers });
        
        if (!response.ok) {
          throw new Error(`Squiggle API responded with status: ${response.status}`);
        }
        let data = await response.json();

        // Fallback to 2025 if 2026 is empty
        if (year === "2026" && (!data.standings || data.standings.length === 0)) {
          console.log("No 2026 standings found, falling back to 2025");
          try {
            response = await fetchWithTimeout("https://api.squiggle.com.au/?q=standings&year=2025", { headers });
            data = await response.json();
          } catch (e) {
            console.warn("2025 fallback failed, using hardcoded fallback");
            data = FALLBACK_STANDINGS;
          }
        }

        console.log(`Successfully fetched ${data.standings?.length || 0} standings.`);
        cache.set(cacheKey, { data, timestamp: Date.now() });
        res.json(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Squiggle API (standings) issue: ${errorMessage}. Attempting fallback...`);
        if (cached) {
          console.log("Returning stale cache due to API error");
          return res.json(cached.data);
        }
        console.log("Returning hardcoded fallback standings");
        res.json(FALLBACK_STANDINGS);
      }
    });

    app.get("/api/teams", async (req, res) => {
      const cacheKey = "teams";
      const cached = cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log("Returning cached teams");
        return res.json(cached.data);
      }

      try {
        const headers = { "User-Agent": "AFLTippingApp/1.0" };
        console.log("Fetching teams...");
        const response = await fetchWithTimeout("https://api.squiggle.com.au/?q=teams", { headers });
        if (!response.ok) {
          throw new Error(`Squiggle API responded with status: ${response.status}`);
        }
        const data = await response.json();
        console.log(`Successfully fetched ${data.teams?.length || 0} teams.`);
        cache.set(cacheKey, { data, timestamp: Date.now() });
        res.json(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Squiggle API (teams) issue: ${errorMessage}. Attempting fallback...`);
        if (cached) {
          console.log("Returning stale cache due to API error");
          return res.json(cached.data);
        }
        console.log("Returning hardcoded fallback teams");
        res.json(FALLBACK_TEAMS);
      }
    });

    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
