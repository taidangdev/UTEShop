const { autoConfirmPendingOrders } = require('./checkout.service');

/**
 * Periodically scans the database to automatically confirm pending orders older than 5 minutes.
 * Runs every 60 seconds (60000ms).
 */
const startAutoConfirmScheduler = () => {
    const INTERVAL_MS = 60000;

    console.log('⏰ [Scheduler] Order Auto-Confirm background service initialized (polling every 60s).');

    setInterval(async () => {
        try {
            const count = await autoConfirmPendingOrders();
            if (count > 0) {
                console.log(`⏰ [Scheduler] Auto-confirmed ${count} pending orders that exceeded the 5-minute threshold.`);
            }
        } catch (error) {
            console.error('⏰ [Scheduler] Error occurred during auto-confirm run:', error);
        }
    }, INTERVAL_MS);
};

module.exports = { startAutoConfirmScheduler };
