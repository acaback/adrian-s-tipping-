import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  try {
    const app = express();
    app.use(cors());
    const PORT = 3000; // Hardcoded to 3000 as per environment requirements

    console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`Current Time: ${new Date().toISOString()}`);

    // Request logging with status code
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
      });
      next();
    });

    // Add a custom header and handle caching
    app.use((req, res, next) => {
      res.setHeader('X-App-Version', `2026.04.14.0113-${Math.random().toString(36).substring(7)}`);
      
      // Only apply strict no-cache to HTML and API requests
      if (req.url === '/' || req.url.includes('.html') || req.url.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      next();
    });

    // Simple in-memory cache
    const cache = new Map<string, { data: any; timestamp: number }>();
    const CACHE_TTL = 1000 * 60 * 60; // 1 hour default
    const GAMES_CACHE_TTL = 1000 * 60; // 1 minute for live scores

    const fetchWithRetry = async (url: string, options: any = {}, retries = 3, timeout = 15000) => {
      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ...options.headers
      };

      for (let i = 0; i < retries; i++) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
          console.log(`Attempt ${i + 1} for ${url}...`);
          const response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
          });
          clearTimeout(id);
          
          if (response.ok) return response;
          
          console.warn(`Attempt ${i + 1} failed with status: ${response.status}`);
        } catch (error) {
          clearTimeout(id);
          console.warn(`Attempt ${i + 1} error: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Wait before retrying (exponential backoff)
        if (i < retries - 1) {
          const delay = Math.pow(2, i) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
    };

    // Hardcoded fallbacks for total API failure
    const FALLBACK_GAMES = {
      games: [
        // Round 1 (March)
        { id: 1, round: 1, year: 2026, hteam: "Richmond", ateam: "Carlton", date: "2026-03-12 19:20:00", unixtime: 1773343200, venue: "MCG", complete: 100, hscore: 82, ascore: 86, winner: "Carlton", timestr: "Final" },
        { id: 2, round: 1, year: 2026, hteam: "Collingwood", ateam: "Sydney", date: "2026-03-13 19:40:00", unixtime: 1773430800, venue: "MCG", complete: 100, hscore: 64, ascore: 97, winner: "Sydney", timestr: "Final" },
        // ... (more round 1)
        
        // Round 10 (May - Current/Upcoming for May 14)
        { id: 101, round: 10, year: 2026, hteam: "Gold Coast", ateam: "Geelong", date: "2026-05-15 19:10:00", unixtime: 1778922600, venue: "TIO Stadium", complete: 0, hscore: 0, ascore: 0, winner: null, timestr: "Friday 7:10 PM" },
        { id: 102, round: 10, year: 2026, hteam: "Sydney", ateam: "Carlton", date: "2026-05-15 19:40:00", unixtime: 1778924400, venue: "SCG", complete: 0, hscore: 0, ascore: 0, winner: null, timestr: "Friday 7:40 PM" },
        { id: 103, round: 10, year: 2026, hteam: "GWS", ateam: "Western Bulldogs", date: "2026-05-16 13:45:00", unixtime: 1778989500, venue: "Engie Stadium", complete: 0, hscore: 0, ascore: 0, winner: null, timestr: "Saturday 1:45 PM" },
        { id: 104, round: 10, year: 2026, hteam: "St Kilda", ateam: "Fremantle", date: "2026-05-16 16:35:00", unixtime: 1778999700, venue: "Marvel Stadium", complete: 0, hscore: 0, ascore: 0, winner: null, timestr: "Saturday 4:35 PM" },
        { id: 105, round: 10, year: 2026, hteam: "Brisbane", ateam: "Richmond", date: "2026-05-16 19:30:00", unixtime: 1779010200, venue: "Gabba", complete: 0, hscore: 0, ascore: 0, winner: null, timestr: "Saturday 7:30 PM" },
        { id: 106, round: 10, year: 2026, hteam: "Adelaide", ateam: "Collingwood", date: "2026-05-17 13:10:00", unixtime: 1779073800, venue: "Adelaide Oval", complete: 0, hscore: 0, ascore: 0, winner: null, timestr: "Sunday 1:10 PM" },
        { id: 107, round: 10, year: 2026, hteam: "Hawthorn", ateam: "Port Adelaide", date: "2026-05-17 15:20:00", unixtime: 1779081600, venue: "Adelaide Oval", complete: 0, hscore: 0, ascore: 0, winner: null, timestr: "Sunday 3:20 PM" },
        { id: 108, round: 10, year: 2026, hteam: "North Melbourne", ateam: "Essendon", date: "2026-05-17 16:10:00", unixtime: 1779084600, venue: "Marvel Stadium", complete: 0, hscore: 0, ascore: 0, winner: null, timestr: "Sunday 4:10 PM" },
        { id: 109, round: 10, year: 2026, hteam: "West Coast", ateam: "Melbourne", date: "2026-05-17 18:50:00", unixtime: 1779094200, venue: "Optus Stadium", complete: 0, hscore: 0, ascore: 0, winner: null, timestr: "Sunday 6:50 PM" }
      ]
    };

    const FALLBACK_STANDINGS = {
      standings: [
        { rank: 1, name: "Sydney", played: 9, wins: 8, losses: 1, draws: 0, pts: 32, percentage: 145.2 },
        { rank: 2, name: "Geelong", played: 9, wins: 7, losses: 2, draws: 0, pts: 28, percentage: 128.5 },
        { rank: 3, name: "Port Adelaide", played: 9, wins: 6, losses: 3, draws: 0, pts: 24, percentage: 115.3 },
        { rank: 4, name: "GWS", played: 9, wins: 6, losses: 3, draws: 0, pts: 24, percentage: 112.1 },
        { rank: 5, name: "Melbourne", played: 9, wins: 6, losses: 3, draws: 0, pts: 24, percentage: 108.4 },
        { rank: 6, name: "Essendon", played: 9, wins: 6, losses: 2, draws: 1, pts: 26, percentage: 102.7 },
        { rank: 7, name: "Carlton", played: 9, wins: 5, losses: 4, draws: 0, pts: 20, percentage: 105.9 },
        { rank: 8, name: "Collingwood", played: 9, wins: 4, losses: 4, draws: 1, pts: 18, percentage: 101.2 }
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
      const forceRef = req.query.force === "true";
      const cacheKey = `games-${year}`;
      const cached = cache.get(cacheKey);

      if (!forceRef && cached && Date.now() - cached.timestamp < GAMES_CACHE_TTL) {
        console.log(`Returning cached games for ${year}`);
        return res.json(cached.data);
      }

      try {
        console.log(`Fetching games for year: ${year}...`);
        
        let response = await fetchWithRetry(`https://api.squiggle.com.au/?q=games&year=${year}`);
        let data = await response.json();
        data.source = 'live';
        
        // If one year (e.g. the requested year) returns empty results,
        // iterate through years 2024, 2025, and 2026 sequentially and aggregate all games found into a single response.
        if (!data.games || data.games.length === 0) {
          console.log(`No games found for requested year ${year}. Querying years 2024, 2025, and 2026 sequentially to aggregate results...`);
          const yearsToTry = ["2024", "2025", "2026"];
          let aggregatedGames: any[] = [];
          
          for (const fallbackYear of yearsToTry) {
            try {
              console.log(`Sequential fetch of games for year ${fallbackYear}...`);
              const resYear = await fetchWithRetry(`https://api.squiggle.com.au/?q=games&year=${fallbackYear}`);
              const yearData = await resYear.json();
              if (yearData.games && yearData.games.length > 0) {
                console.log(`Found ${yearData.games.length} games for year ${fallbackYear}`);
                aggregatedGames = aggregatedGames.concat(yearData.games);
              } else {
                console.log(`Year ${fallbackYear} returned empty results.`);
              }
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err);
              console.warn(`Failed to fetch duplicate/fallback year ${fallbackYear}: ${errMsg}`);
            }
          }
          
          if (aggregatedGames.length > 0) {
            data.games = aggregatedGames;
            data.source = 'fallback';
            console.log(`Successfully aggregated ${aggregatedGames.length} games from years 2024, 2025, and 2026.`);
          }
        }

        // Final fallback to hardcoded data if API completely fails or returns nothing for all years
        if (!data.games || data.games.length === 0) {
          console.warn("No games found in any year, using hardcoded fallback");
          data = { ...FALLBACK_GAMES, source: 'fallback' };
        }
        
        console.log(`Successfully fetched ${data.games?.length || 0} games.`);
        cache.set(cacheKey, { data, timestamp: Date.now() });
        res.json(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Squiggle API (games) issue: ${errorMessage}. Attempting fallback...`);
        if (cached) {
          console.log("Returning stale cache due to API error");
          return res.json({ ...cached.data, source: 'cache' });
        }
        console.log("Returning hardcoded fallback games");
        res.json({ ...FALLBACK_GAMES, source: 'fallback' });
      }
    });

    app.get("/api/standings", async (req, res) => {
      const year = req.query.year || "2026";
      const forceRef = req.query.force === "true";
      const cacheKey = `standings-${year}`;
      const cached = cache.get(cacheKey);

      if (!forceRef && cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`Returning cached standings for ${year}`);
        return res.json(cached.data);
      }

      try {
        console.log(`Fetching standings for year: ${year}...`);
        
        let response = await fetchWithRetry(`https://api.squiggle.com.au/?q=standings&year=${year}`);
        let data = await response.json();
        data.source = 'live';

        // If no standings for current requested year, try previous years
        if (!data.standings || data.standings.length === 0) {
          const yearsToTry = ["2025", "2024"];
          for (const fallbackYear of yearsToTry) {
            if (year === fallbackYear) continue;
            console.log(`No ${year} standings found, trying ${fallbackYear}`);
            try {
              response = await fetchWithRetry(`https://api.squiggle.com.au/?q=standings&year=${fallbackYear}`);
              data = await response.json();
              if (data.standings && data.standings.length > 0) {
                data.source = 'fallback';
                console.log(`Found standings in ${fallbackYear}`);
                break;
              }
            } catch (e) {
              console.warn(`${fallbackYear} fetch failed: ${e.message}`);
            }
          }
        }

        // Final fallback to hardcoded data
        if (!data.standings || data.standings.length === 0) {
          console.warn("No standings found in any year, using hardcoded fallback");
          data = { ...FALLBACK_STANDINGS, source: 'fallback' };
        }

        console.log(`Successfully fetched ${data.standings?.length || 0} standings.`);
        cache.set(cacheKey, { data, timestamp: Date.now() });
        res.json(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Squiggle API (standings) issue: ${errorMessage}. Attempting fallback...`);
        if (cached) {
          console.log("Returning stale cache due to API error");
          return res.json({ ...cached.data, source: 'cache' });
        }
        console.log("Returning hardcoded fallback standings");
        res.json({ ...FALLBACK_STANDINGS, source: 'fallback' });
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
        console.log("Fetching teams...");
        const response = await fetchWithRetry("https://api.squiggle.com.au/?q=teams");
        const data = await response.json();
        data.source = 'live';
        console.log(`Successfully fetched ${data.teams?.length || 0} teams.`);
        cache.set(cacheKey, { data, timestamp: Date.now() });
        res.json(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Squiggle API (teams) issue: ${errorMessage}. Attempting fallback...`);
        if (cached) {
          console.log("Returning stale cache due to API error");
          return res.json({ ...cached.data, source: 'cache' });
        }
        console.log("Returning hardcoded fallback teams");
        res.json({ ...FALLBACK_TEAMS, source: 'fallback' });
      }
    });

    // API 404 handler - catch all other /api/* requests
    app.all("/api/*", (req, res) => {
      console.warn(`API 404: ${req.method} ${req.url}`);
      res.status(404).json({ error: "API route not found" });
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
