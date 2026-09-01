// Entitlement math — the single source of truth for the free-use formula.
// Used by auth (/api/auth/me) and export (reservation + recomputation). Never duplicate.

export function isProActive(user) {
  return (
    user.plan === 'pro' &&
    (user.subscription_status === 'active' || user.subscription_status === 'trialing') &&
    (user.paid_through == null || user.paid_through > Date.now())
  );
}

export async function ledgerSums(db, userId) {
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN kind IN ('admin_grant','admin_revoke') THEN delta ELSE 0 END), 0) AS adjustments,
              COALESCE(SUM(CASE WHEN kind = 'export' THEN 1 ELSE 0 END), 0) AS consumed
       FROM usage_ledger WHERE user_id = ?`
    )
    .bind(userId)
    .first();
  return row || { adjustments: 0, consumed: 0 };
}

export function computeFreeUses(user, ledger) {
  const consumed = ledger ? ledger.consumed : 0;
  const adjustments = ledger ? ledger.adjustments : 0;
  return {
    consumed,
    adjustments,
    remaining: user.free_uses_granted + adjustments - consumed,
  };
}

// Recompute the user-facing remaining count (null when unlimited/pro-active).
export async function remainingFreeUses(db, user) {
  if (isProActive(user)) return null;
  return computeFreeUses(user, await ledgerSums(db, user.id)).remaining;
}
