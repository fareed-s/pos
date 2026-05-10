import { ActivityLog } from '../models/OtherModels.js';

export const logActivity = async (userId, userName, action, module, businessId, recordId = null, details = '', ipAddress = '') => {
  try {
    await ActivityLog.create({
      userId,
      userName,
      action,
      module,
      recordId,
      details,
      ipAddress,
      businessId,
    });
  } catch (error) {
    console.error('Activity log error:', error.message);
  }
};
