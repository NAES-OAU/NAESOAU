// Vercel serverless function: POST /api/invite
// Sends a Supabase invite email. Only a signed-in Super Admin may call it.
//
// Environment variables (Vercel -> Project Settings -> Environment Variables):
//   SUPABASE_URL                e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   secret key, never put this in browser code
//   SITE_URL                    https://naesoau1.vercel.app

const { createClient } = require('@supabase/supabase-js');

// ===== ADJUST THESE TO MATCH YOUR DATABASE =====
const ROLES_TABLE = 'executives';      // table that stores your executives
const EMAIL_COLUMN = 'email';          // column holding the executive's email
const ROLE_COLUMN = 'role';            // column holding their role
const SUPER_ROLE = 'Super Admin';      // exact value used for Super Admin
const INVITE_LANDING_PATH = '/set-password.html';
// ================================================

const ALLOWED_ROLES = ['Super Admin', 'Finance', 'Records', 'Welfare', 'Viewer'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SITE_URL) {
    return res.status(500).json({ error: 'Server is not configured. Check environment variables.' });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Identify the caller from the access token sent by the admin page.
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Please sign in first.' });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return res.status(401).json({ error: 'Your session is invalid. Sign in again.' });

  // 2. Make sure the caller is a Super Admin.
  const { data: caller, error: callerErr } = await admin
    .from(ROLES_TABLE)
    .select(ROLE_COLUMN)
    .eq(EMAIL_COLUMN, userData.user.email)
    .maybeSingle();

  if (callerErr || !caller || caller[ROLE_COLUMN] !== SUPER_ROLE) {
    return res.status(403).json({ error: 'Only a Super Admin can send invites.' });
  }

  // 3. Validate the request.
  const { email, role } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Choose a valid role.' });
  }

  // 4. Send the invite, pointing at the live site (never localhost).
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(cleanEmail, {
    redirectTo: SITE_URL.replace(/\/$/, '') + INVITE_LANDING_PATH,
    data: { role },
  });
  if (inviteErr) return res.status(400).json({ error: inviteErr.message });

  // 5. Record the role so the new admin has access once they sign in.
  const { error: roleErr } = await admin
    .from(ROLES_TABLE)
    .upsert({ [EMAIL_COLUMN]: cleanEmail, [ROLE_COLUMN]: role }, { onConflict: EMAIL_COLUMN });
  if (roleErr) {
    return res.status(200).json({
      ok: true,
      warning: 'Invite sent, but the role could not be saved: ' + roleErr.message,
    });
  }

  return res.status(200).json({ ok: true });
};
