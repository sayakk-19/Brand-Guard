import ActivityEvent from '../models/ActivityEvent.js';

export async function recordActivity({ workspaceId, actorId, contentItemId = null, action, description, metadata = {} }) {
  return ActivityEvent.create({ workspaceId, actorId, contentItemId, action, description, metadata });
}
