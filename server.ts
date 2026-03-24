import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  try {
    const app = express();
    const PORT = 3000;

    // API proxy for Squiggle
    app.get("/api/health", (req, res) => {
      res.json({ status: "ok" });
    });

    app.get("/api/games", async (req, res) => {
      try {
        // Try to fetch 2026 games first
        let response = await fetch("https://api.squiggle.com.au/?q=games&year=2026");
        if (!response.ok) {
          throw new Error(`Squiggle API responded with status: ${response.status}`);
        }
        let data = await response.json();
        
        // If no games for 2026, fallback to 2025 for demo purposes
        if (!data.games || data.games.length === 0) {
          console.log("No 2026 games found, falling back to 2025");
          response = await fetch("https://api.squiggle.com.au/?q=games&year=2025");
          data = await response.json();
        }
        
        res.json(data);
      } catch (error) {
        console.error("Error proxying Squiggle API (games):", error);
        res.status(500).json({ error: "Failed to fetch games from Squiggle API" });
      }
    });

    app.get("/api/teams", async (req, res) => {
      try {
        const response = await fetch("https://api.squiggle.com.au/?q=teams");
        if (!response.ok) {
          throw new Error(`Squiggle API responded with status: ${response.status}`);
        }
        const data = await response.json();
        res.json(data);
      } catch (error) {
        console.error("Error proxying Squiggle API (teams):", error);
        res.status(500).json({ error: "Failed to fetch teams from Squiggle API" });
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
  }
}

startServer();
