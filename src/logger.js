const fs = require("fs").promises;
const path = require("path");

const LOG_FILE = path.join(__dirname, "../logs/activity.log");

/**
 * Append a log entry to the activity log
 * @param {Object} entry - Log entry object
 */
async function log(entry) {
  try {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [User: ${entry.user || "SYSTEM"}] [${
      entry.action
    }] ${JSON.stringify(entry.details)}\n`;

    await fs.appendFile(LOG_FILE, logLine, "utf8");
  } catch (error) {
    console.error("Error writing to log file:", error);
  }
}

module.exports = { log };
