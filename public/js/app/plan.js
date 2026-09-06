// Shared plan copy and safe HTML encoding for account/provider values.
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}
export const FREE_FACTS = ['10 PDF batches total', 'Up to 200 labels per batch', 'All label tools and saved projects', '7-day PDF downloads · no watermark', 'No credit card required'];
