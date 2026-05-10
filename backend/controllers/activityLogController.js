import { ActivityLog } from '../models/OtherModels.js';

// @desc Get activity logs
export const getActivityLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, userId, module, action, startDate, endDate, search } = req.query;
    const query = { businessId: req.user.businessId };

    if (userId) query.userId = userId;
    if (module) query.module = module;
    if (action) query.action = action;
    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } },
      ];
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); query.createdAt.$lte = e; }
    }

    const total = await ActivityLog.countDocuments(query);
    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Module stats
    const moduleStats = await ActivityLog.aggregate([
      { $match: { businessId: req.user.businessId } },
      { $group: { _id: '$module', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true, data: logs, moduleStats,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};
