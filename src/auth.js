import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { pool } from "./db.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function verifyGoogleIdToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

export function signAppJwt(user) {
  return jwt.sign(
    { uid: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export async function upsertUserFromGoogle(payload) {
  const googleSub = payload?.sub;
  const email = payload?.email;

  if (!googleSub || !email) {
    throw new Error("google_payload_missing_sub_or_email");
  }

  const name = payload?.name || null;
  const pictureUrl = payload?.picture || null;

  // 1) Upsert usuario
  const qUser = `
    INSERT INTO public.users (google_sub, email, name, picture_url)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (google_sub)
    DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      picture_url = EXCLUDED.picture_url,
      updated_at = NOW()
    RETURNING id, google_sub, email, name, picture_url;
  `;
  const { rows } = await pool.query(qUser, [googleSub, email, name, pictureUrl]);
  const user = rows[0];

  // 2) Crea suscripcion base (free) si no existe
  const qSub = `
    INSERT INTO public.subscriptions (user_id, status)
    VALUES ($1, 'free')
    ON CONFLICT (user_id) DO NOTHING;
  `;
  await pool.query(qSub, [user.id]);

  return user;
}