import User from '../models/User.js';

// Boot-time helper — guarantees a usable super admin exists so a fresh
// production deploy can log in without anyone having to SSH and run a seed
// script. Idempotent: if a super admin is already present, this is a no-op.
//
// Reads SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD from the environment. If
// either is missing, we skip silently (operator presumably wants to seed
// manually or already has an admin in place).
export async function ensureSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('[init] SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set — skipping super admin bootstrap');
    return;
  }

  try {
    const existing = await User.findOne({ role: 'superadmin' });
    if (existing) {
      console.log(`[init] super admin already present: ${existing.email}`);
      return;
    }

    // The User model has a pre-save hook that bcrypt-hashes the password —
    // pass the plaintext, the hook handles it.
    const created = await User.create({
      name: 'Super Admin',
      email: email.toLowerCase().trim(),
      password,
      role: 'superadmin',
      phone: '',
      isActive: true,
    });
    console.log(`[init] super admin bootstrapped: ${created.email}`);
  } catch (err) {
    console.error('[init] failed to bootstrap super admin:', err.message);
  }
}
