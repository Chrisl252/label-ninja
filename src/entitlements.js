// Entitlement math — the single source of truth for the free-use formula.
// Used by auth (/api/auth/me), export (reservation + recomputation), and billing
// (webhook state sync). Never duplicate.
//
// Spec rule: access remains through the paid-through date after normal cancellation.
// status active|trialing -> pro; canceled|past_due -> pro only while paid_through is in
// the future; incomplete/unpaid/anything else never grants. `plan` is a synced display
// column derived from THIS predicate (billing.js applies it) — the predicate itself is
// the authority, so it must not read `plan` (that would be circular).

export function isProActive(user) {
  const status = user.subscription_status;
  if (status === 'active' || status === 'trialing') return true;
  if (status === 'canceled' || status === 'past_due') {
    return user.paid_through != null && user.paid_through > Date.now();
  }
  return false;
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
