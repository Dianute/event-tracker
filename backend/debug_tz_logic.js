// Simulate Server running in UTC
process.env.TZ = 'UTC';

const now = new Date();
console.log("Current System Time:", now.toISOString());

const testLogic = (timeStr, description) => {
    const buffer = 15 * 60 * 1000;
    const cutoff = new Date(now.getTime() - buffer);
    let eventEnd = new Date(timeStr);

    console.log(`\nTesting: ${description}`);
    console.log(`   String: ${timeStr}`);
    console.log(`   Parsed: ${eventEnd.toISOString()}`);
    console.log(`   Cutoff: ${cutoff.toISOString()}`);

    if (eventEnd > cutoff) console.log("   Result: ✅ ACTIVE (Kept)");
    else console.log("   Result: ❌ EXPIRED (Hidden)");
};

// Test Case 1: Event ended 1 hour ago (Local Time: Lithuania)
// If now is 15:40 UTC+2 (13:40 UTC), event was 14:40 UTC+2.
// String: "2025-12-21 14:40"
// Expected: EXPIRED.
// Actual if parsed as UTC: 14:40 UTC (Future! vs 13:40 UTC)
const hourAgo = new Date(Date.now() - 3600000); // 1h ago
const localStr = hourAgo.toISOString().slice(0, 16).replace('T', ' '); // Simple format

testLogic(localStr, "Event Ended 1h ago (Simulated String)");
