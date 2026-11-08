export const formatDate = (value, options = { month: 'short', day: 'numeric' }) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', options).format(new Date(value));
};

export const timeAgo = (value) => {
  if (!value) return '—';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'BG';
export const titleCase = (value = '') => value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
export const statusTone = (status) => ({ approved: 'success', in_review: 'info', changes_requested: 'warning', draft: 'neutral' }[status] || 'neutral');
export const severityTone = (severity) => ({ critical: 'critical', high: 'danger', medium: 'warning', low: 'neutral' }[severity] || 'neutral');
