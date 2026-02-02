const {
  getWarmupState,
  createWarmupState,
  resetDaily,
  incrementSent
} = require("../models/warmup.model");

const defaultLimits = {
  day1: 20,
  day2: 40,
  day3: 80,
  day7: 200,
  normal: 1000
};

const getWarmupLimit = (dayIndex, limits) => {
  if (dayIndex <= 1) return limits.day1 ?? defaultLimits.day1;
  if (dayIndex <= 2) return limits.day2 ?? defaultLimits.day2;
  if (dayIndex <= 3) return limits.day3 ?? defaultLimits.day3;
  if (dayIndex <= 7) return limits.day7 ?? defaultLimits.day7;
  return limits.normal ?? defaultLimits.normal;
};

const getDayIndex = (startDate) => {
  const start = new Date(startDate);
  const diff = Date.now() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const isAllowed = async (lineId) => {
  let state = await getWarmupState(lineId);
  if (!state) {
    state = await createWarmupState({ lineId });
  }

  if (!state.enabled) return true;

  const todayKey = new Date().toISOString().slice(0, 10);
  if (state.date_key !== todayKey) {
    state = await resetDaily(lineId, todayKey);
  }

  const dayIndex = getDayIndex(state.start_date);
  const limits = state.limits || {};
  const limit = getWarmupLimit(dayIndex, limits);

  if (state.sent_today >= limit) return false;

  await incrementSent(lineId, todayKey);
  return true;
};

module.exports = { isAllowed };
