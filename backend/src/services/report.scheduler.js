const cron = require("node-cron");
const logger = require("../config/logger");
const { getSettings } = require("../models/settings.model");
const { sendReportNow } = require("./report.service");

let task = null;
let currentCron = null;
let refreshTimer = null;

const scheduleWith = (cronExpr) => {
  if (!cron.validate(cronExpr)) {
    logger.warn("Invalid report cron", { cronExpr });
    return;
  }

  task = cron.schedule(cronExpr, async () => {
    try {
      await sendReportNow();
    } catch (error) {
      logger.error("Failed to send report", { error: error.message });
    }
  });

  currentCron = cronExpr;
  task.start();
};

const refreshSchedule = async () => {
  const settings = await getSettings();
  if (!settings?.report_enabled) {
    if (task) {
      task.stop();
      task = null;
    }
    currentCron = null;
    return;
  }

  const cronExpr = settings.report_cron || "0 8 * * *";
  if (cronExpr === currentCron && task) return;

  if (task) {
    task.stop();
    task = null;
  }

  scheduleWith(cronExpr);
};

const startReportScheduler = () => {
  refreshSchedule();
  refreshTimer = setInterval(refreshSchedule, 120000);
};

const stopReportScheduler = () => {
  if (task) task.stop();
  if (refreshTimer) clearInterval(refreshTimer);
};

module.exports = { startReportScheduler, stopReportScheduler };
