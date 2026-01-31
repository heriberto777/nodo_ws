const warmupState = new Map();

const getWarmupLimit = (day) => {
  if (day <= 1) return 20;
  if (day <= 2) return 50;
  if (day <= 7) return 200;
  return 1000;
};

const getDayIndex = (startDate) => {
  const diff = Date.now() - startDate.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const isAllowed = (lineId) => {
  const state = warmupState.get(lineId);
  if (!state) {
    warmupState.set(lineId, {
      startDate: new Date(),
      sentToday: 0,
      dateKey: new Date().toDateString()
    });
    return true;
  }

  const todayKey = new Date().toDateString();
  if (state.dateKey !== todayKey) {
    state.dateKey = todayKey;
    state.sentToday = 0;
  }

  const dayIndex = getDayIndex(state.startDate);
  const limit = getWarmupLimit(dayIndex);

  if (state.sentToday >= limit) return false;

  state.sentToday += 1;
  warmupState.set(lineId, state);
  return true;
};

module.exports = { isAllowed };
