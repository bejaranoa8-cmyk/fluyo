import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";


import { pool } from "./db.js";
import { verifyGoogleIdToken, upsertUserFromGoogle, signAppJwt } from "./auth.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (e) {
    console.error("DB ERROR:", e);
    res.status(500).json({
      ok: false,
      error: "db_error",
      detail: String(e?.message || e),
    });
  }
});

app.post("/auth/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "idToken_required" });

    const payload = await verifyGoogleIdToken(idToken);
    if (!payload?.sub || !payload?.email) {
      return res.status(401).json({ error: "invalid_google_token" });
    }

    const user = await upsertUserFromGoogle(payload);
    const token = signAppJwt(user);

    res.json({ token, user });
  } catch (e) {
    console.error("AUTH ERROR:", e);
    res.status(401).json({ error: "google_auth_failed" });
  }
});

function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing_token" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}

app.get("/me/entitlements", requireAuth, async (req, res) => {
  const uid = req.user.uid;
  const { rows } = await pool.query(
    `SELECT status, premium_until
     FROM subscriptions
     WHERE user_id = $1`,
    [uid]
  );
  res.json(rows[0] || { status: "free", premium_until: null });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("API running on", PORT));