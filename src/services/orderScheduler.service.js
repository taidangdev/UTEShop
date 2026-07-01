const { autoCancelPendingOrders, autoConfirmPendingOrders } = require('./checkout.service');

/**
 * Periodically scans the database to automatically cancel unpaid pending orders older than 24 hours
 * and automatically confirm pending orders older than 30 minutes.
 * Runs every 60 seconds (60000ms) to check.
 */
const startAutoCancelScheduler = () => {
    const INTERVAL_MS = 60000;

    console.log('⏰ [Scheduler] Order Scheduler background service initialized (polling every 60s).');

    setInterval(async () => {
        try {
            const cancelCount = await autoCancelPendingOrders();
            if (cancelCount > 0) {
                console.log(`⏰ [Scheduler] Auto-cancelled ${cancelCount} unpaid pending orders that exceeded the 24-hour threshold.`);
            }
        } catch (error) {
            console.error('⏰ [Scheduler] Error occurred during auto-cancel run:', error);
        }

        try {
            const confirmCount = await autoConfirmPendingOrders();
            if (confirmCount > 0) {
                console.log(`⏰ [Scheduler] Auto-confirmed ${confirmCount} pending orders older than 30 minutes.`);
            }
        } catch (error) {
            console.error('⏰ [Scheduler] Error occurred during auto-confirm run:', error);
        }
    }, INTERVAL_MS);
};

module.exports = { startAutoCancelScheduler };
