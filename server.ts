import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import bodyParser from "body-parser";
import crypto from "crypto";
import otpGenerator from "otp-generator";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json());

  // Mock database for OTPs (in a real app, use Firestore)
  const otpStore: Record<string, { otp: string; expires: number }> = {};

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // OTP Generation
  app.post("/api/auth/generate-otp", (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const otp = otpGenerator.generate(6, { 
      upperCaseAlphabets: false, 
      specialChars: false, 
      lowerCaseAlphabets: false 
    });
    
    // Store OTP with 5-minute expiry
    otpStore[email] = {
      otp,
      expires: Date.now() + 5 * 60 * 1000
    };

    console.log(`[AUTH] OTP for ${email}: ${otp}`); // In real app, send via email/SMS
    res.json({ message: "OTP sent successfully (check server logs for demo)" });
  });

  // OTP Verification
  app.post("/api/auth/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    const stored = otpStore[email];

    if (!stored || stored.otp !== otp || Date.now() > stored.expires) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    delete otpStore[email];
    res.json({ success: true });
  });

  // Fraud Detection Logic (Simplified)
  app.post("/api/security/risk-score", (req, res) => {
    const { userId, amount, location, deviceId, lastLoginLocation } = req.body;
    
    let riskScore = 0;
    const alerts = [];

    // 1. Amount Threshold
    if (amount > 10000) {
      riskScore += 40;
      alerts.push("High-value transaction detected");
    }

    // 2. Location Anomaly
    if (location !== lastLoginLocation) {
      riskScore += 30;
      alerts.push("Location mismatch detected");
    }

    // 3. Device Fingerprinting (Simplified)
    if (!deviceId) {
      riskScore += 20;
      alerts.push("Unknown device detected");
    }

    res.json({
      riskScore,
      status: riskScore > 70 ? "High Risk" : riskScore > 30 ? "Medium Risk" : "Low Risk",
      alerts
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[RAKSHAKAVACH] Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
