import { Settings } from '../models/OtherModels.js';
import Business from '../models/Business.js';
import { logActivity } from '../middleware/activityLog.js';

// @desc Get settings
export const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ businessId: req.user.businessId });
    if (!settings) {
      settings = await Settings.create({ businessId: req.user.businessId });
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// @desc Update settings
export const updateSettings = async (req, res, next) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { businessId: req.user.businessId },
      req.body,
      { new: true, upsert: true, runValidators: true }
    );

    logActivity(req.user._id, req.user.name, 'update', 'settings', req.user.businessId, settings._id, 'Updated business settings');

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// @desc Get business profile
export const getBusinessProfile = async (req, res, next) => {
  try {
    const business = await Business.findById(req.user.businessId);
    res.json({ success: true, data: business });
  } catch (error) {
    next(error);
  }
};

// @desc Update business profile
export const updateBusinessProfile = async (req, res, next) => {
  try {
    const { name, phone, address, logo, taxNumber, businessType, website, currency, timezone, fiscalYearStart } = req.body;

    const business = await Business.findByIdAndUpdate(
      req.user.businessId,
      { name, phone, address, logo, taxNumber, businessType, website, currency, timezone, fiscalYearStart },
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: business });
  } catch (error) {
    next(error);
  }
};
