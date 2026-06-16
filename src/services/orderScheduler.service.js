const { autoCancelPendingOrders } = require('./checkout.service');

/**
 * Periodically scans the database to automatically cancel unpaid pending orders older than 24 hours.
 * Runs every 60 seconds (60000ms) to check.
 */
const startAutoCancelScheduler = () => {
    const INTERVAL_MS = 60000;

    console.log('⏰ [Scheduler] Order Auto-Cancel background service initialized (polling every 60s).');

    setInterval(async () => {
        try {
            const count = await autoCancelPendingOrders();
            if (count > 0) {
                console.log(`⏰ [Scheduler] Auto-cancelled ${count} unpaid pending orders that exceeded the 24-hour threshold.`);
            }
        } catch (error) {
            console.error('⏰ [Scheduler] Error occurred during auto-cancel run:', error);
        }
    }, INTERVAL_MS);
};

module.exports = { startAutoCancelScheduler };
