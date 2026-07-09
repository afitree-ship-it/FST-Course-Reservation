import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support larger logo/favicon base64 strings
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));

  const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');

  // Load cached settings from local disk if exists
  let cachedSettings: Record<string, string> = {};
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      cachedSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    } catch (err) {
      console.error('Failed to parse settings.json:', err);
    }
  }

  // API Route to get all cached settings
  app.get("/api/settings", (req, res) => {
    res.json({ success: true, data: cachedSettings });
  });

  // API Route to save a setting
  app.post("/api/settings", (req, res) => {
    const { key, value } = req.body;
    if (key !== undefined) {
      cachedSettings[key] = value || '';
      try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(cachedSettings, null, 2), 'utf-8');
        res.json({ success: true });
      } catch (err) {
        console.error('Failed to write settings.json:', err);
        res.status(500).json({ success: false, error: 'Failed to write settings' });
      }
    } else {
      res.status(400).json({ success: false, error: 'Missing key parameter' });
    }
  });

  // Vite middleware for development, static serve for production
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
