export const supportCategories = [
  { value: 'bug', label: 'Report a bug', hint: 'Something is not working' },
  { value: 'feature', label: 'Suggest a feature', hint: 'An idea for the future' },
  { value: 'feedback', label: 'Share feedback', hint: 'Tell us how it feels' }
];

export const supportStatuses = [
  { value: 'new', label: 'New' },
  { value: 'in_review', label: 'In review' },
  { value: 'planned', label: 'Planned' },
  { value: 'resolved', label: 'Resolved' }
];

export const supportPriorities = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' }
];

export function validateSupportRequest({ category, title, body, steps = '' }) {
  if (!supportCategories.some((item) => item.value === category)) return 'Choose a request type.';
  if (!title.trim()) return 'Add a short title.';
  if (title.trim().length > 120) return 'Keep the title under 120 characters.';
  if (!body.trim()) return 'Tell us a little more about your request.';
  if (body.trim().length > 5000) return 'Keep the description under 5,000 characters.';
  if (steps.length > 2000) return 'Keep the steps under 2,000 characters.';
  return '';
}

export function collectSupportDiagnostics({ pathname, theme, mode, width, height, userAgent }) {
  const browser = /Firefox\//.test(userAgent) ? 'Firefox'
    : /Edg\//.test(userAgent) ? 'Edge'
      : /Chrome\//.test(userAgent) ? 'Chrome'
        : /Safari\//.test(userAgent) ? 'Safari' : 'Other';
  return {
    page: diagnosticPages.includes(pathname) ? pathname : 'unknown',
    theme: ['warm', 'ocean', 'garden', 'night', 'sunrise'].includes(theme) ? theme : 'unknown',
    mode: ['light', 'dark'].includes(mode) ? mode : 'unknown',
    browser,
    viewport: `${safeDimension(width)}x${safeDimension(height)}`
  };
}

const diagnosticPages = ['/', '/checkin', '/entries', '/calendar', '/summary', '/activities', '/settings', '/games', '/games/garden', '/games/constellation', '/games/orbit', '/support', '/about', '/newsletter', '/admin'];
const safeDimension = (value) => Number.isFinite(value) ? Math.max(1, Math.min(99999, Math.round(value))) : 1;

export function supportErrorMessage(error) {
  if (error?.code === '42P01' || error?.code === 'PGRST205') {
    return 'Feedback is not ready yet. The support tables still need to be added in Supabase.';
  }
  return error?.message || 'Something went wrong. Please try again.';
}

export function filterSupportRequests(requests, { search = '', category = 'all', status = 'all' }) {
  const query = search.trim().toLocaleLowerCase();
  return requests.filter((request) =>
    (category === 'all' || request.category === category)
    && (status === 'all' || request.status === status)
    && (!query || `${request.title} ${request.body} ${request.id}`.toLocaleLowerCase().includes(query))
  );
}
