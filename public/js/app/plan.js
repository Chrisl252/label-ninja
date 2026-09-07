// Shared plan copy and safe HTML encoding for account/provider values.
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}
export const FREE_FACTS = ['10 PDF batches total', 'Up to 200 labels per batch', 'All label tools and saved projects', '7-day PDF downloads · no watermark', 'No credit card required'];

// Copy follows /me; missing account data must not invent another free allowance.
export function pricingSummary(user) {
  if (!user) return { heading: 'Your first 10 batches are free.', balance: '', unavailable: 'You can use your 10 free batches now.' };
  if (user.free_uses?.unlimited) return { heading: 'You’re on Label Ninja Pro.', balance: 'Unlimited PDF batches while your paid access is active.', unavailable: 'Your current access is shown in your account.' };
  const { remaining, granted } = user.free_uses || {};
  if (!Number.isInteger(remaining) || !Number.isInteger(granted) || remaining < 0 || granted < remaining) {
    return { heading: 'Choose the plan for your labels.', balance: 'Check your account for your free batch balance.', unavailable: 'You can still edit and save your labels.' };
  }
  return {
    heading: remaining === 0 ? `You’ve used your ${granted} free batches.` : `You have ${remaining} free ${remaining === 1 ? 'batch' : 'batches'} left.`,
    balance: `${remaining} of ${granted} free batches left. This allowance does not reset.`,
    unavailable: remaining === 0 ? 'You can still edit, save projects, and re-download unexpired PDFs.' : `You can use your ${remaining} remaining free ${remaining === 1 ? 'batch' : 'batches'}.`,
  };
}
