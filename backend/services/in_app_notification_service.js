const InAppNotification = require('../models/in_app_notification');

/**
 * Creates an in-app notification record.
 * Wraps in try/catch — logs error but NEVER throws (must not break primary operation).
 */
async function createNotification({ event_type, title, message, reference_id = null, reference_type = null, user = null }) {
  try {
    const notification = await InAppNotification.create({
      event_type,
      title,
      message,
      reference_id,
      reference_type,
      user
    });
    return notification;
  } catch (error) {
    console.error('Failed to create in-app notification:', error.message);
    return null;
  }
}

/**
 * Deletes all notifications linked to a specific reference (entity).
 * Call this when an entity (client, invoice, quotation, etc.) is deleted.
 * Never throws — deletion failure must not break the primary operation.
 */
async function deleteNotificationsByReference(reference_id, reference_type) {
  try {
    if (!reference_id) return;
    const filter = { reference_id };
    if (reference_type) filter.reference_type = reference_type;
    await InAppNotification.deleteMany(filter);
  } catch (error) {
    console.error('Failed to delete notifications by reference:', error.message);
  }
}

module.exports = { createNotification, deleteNotificationsByReference };
