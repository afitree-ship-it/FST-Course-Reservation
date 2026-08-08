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
  const AUDIT_LOGS_FILE = path.join(process.cwd(), 'audit_logs.json');

  // Load cached settings from local disk if exists
  let cachedSettings: Record<string, string> = {};
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      cachedSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    } catch (err) {
      console.error('Failed to parse settings.json:', err);
    }
  }

  // Load audit logs from local disk if exists
  let cachedAuditLogs: Array<{ id: string; timestamp: string; adminName: string; action: string; targetId?: string; details: string }> = [];
  if (fs.existsSync(AUDIT_LOGS_FILE)) {
    try {
      cachedAuditLogs = JSON.parse(fs.readFileSync(AUDIT_LOGS_FILE, 'utf-8'));
    } catch (err) {
      console.error('Failed to parse audit_logs.json:', err);
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

  // API Route to get audit logs
  app.get("/api/audit-logs", (req, res) => {
    res.json({ success: true, data: cachedAuditLogs });
  });

  // API Route to record an audit log
  app.post("/api/audit-logs", (req, res) => {
    const { adminName, action, targetId, details } = req.body;
    if (action && details) {
      const newLog = {
        id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        adminName: adminName || 'เจ้าหน้าที่',
        action,
        targetId: targetId || '',
        details
      };
      // Keep max 500 logs in memory/disk
      cachedAuditLogs = [newLog, ...cachedAuditLogs].slice(0, 500);
      try {
        fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(cachedAuditLogs, null, 2), 'utf-8');
        res.json({ success: true, data: newLog });
      } catch (err) {
        console.error('Failed to write audit_logs.json:', err);
        res.status(500).json({ success: false, error: 'Failed to write audit logs' });
      }
    } else {
      res.status(400).json({ success: false, error: 'Missing log action or details' });
    }
  });

  // API Route to proxy notifications (LINE Notify or Webhook)
  app.post("/api/notify", async (req, res) => {
    const { tokenOrWebhook, message } = req.body;
    if (!tokenOrWebhook || !message) {
      res.status(400).json({ success: false, error: 'Missing notification endpoint or message' });
      return;
    }

    try {
      // Check if it's a URL (Webhook) or LINE token
      if (tokenOrWebhook.startsWith('http://') || tokenOrWebhook.startsWith('https://')) {
        const webhookRes = await fetch(tokenOrWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: message, text: message, message })
        });
        res.json({ success: true, status: webhookRes.status });
      } else {
        // LINE Notify API
        const formData = new URLSearchParams();
        formData.append('message', message);

        const lineRes = await fetch('https://notify-api.line.me/api/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${tokenOrWebhook.trim()}`
          },
          body: formData.toString()
        });
        const lineResult = await lineRes.json().catch(() => ({}));
        res.json({ success: true, lineResult });
      }
    } catch (err: any) {
      console.error('Failed to send notification via server proxy:', err);
      res.status(500).json({ success: false, error: err?.message || 'Failed to dispatch notification' });
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
