// Copied logic from scout.js to verify fixes
function extractTime(text) {
    let clean = text.replace(/Doors:?/i, "").trim();
    const timeRegex = /((?:1[0-2]|0?[1-9])(?::[0-5][0-9])?\s*(?:AM|PM))|((?:[0-1]?[0-9]|2[0-3]):[0-5][0-9])/i;
    const match = clean.match(timeRegex);
    if (match) {
        let t = match[0];
        if (t.match(/PM/i)) {
            const parts = t.replace(/PM/i, "").trim().split(':');
            let h = parseInt(parts[0], 10);
            const m = parts[1] ? parseInt(parts[1], 10) : 0;
            if (h !== 12) h += 12;
            return `${h}:${m.toString().padStart(2, '0')}`;
        } else if (t.match(/AM/i)) {
            const parts = t.replace(/AM/i, "").trim().split(':');
            let h = parseInt(parts[0], 10);
            const m = parts[1] ? parseInt(parts[1], 10) : 0;
            if (h === 12) h = 0;
            return `${h}:${m.toString().padStart(2, '0')}`;
        }
        return t;
    }
    return null;
}

function parseLithuanianDate(dateStr, timeStr) {
    if (!dateStr) return new Date();
    const months = {
        'sausio': 0, 'vasario': 1, 'kovo': 2, 'balandžio': 3, 'gegužės': 4, 'birželio': 5,
        'liepos': 6, 'rugpjūčio': 7, 'rugsėjo': 8, 'spalio': 9, 'lapkričio': 10, 'gruodžio': 11,
        'saus': 0, 'vas': 1, 'kov': 2, 'bal': 3, 'geg': 4, 'bir': 5,
        'lie': 6, 'rgp': 7, 'rgs': 8, 'spa': 9, 'lap': 10, 'gruod': 11, 'gruo': 11,
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };

    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    let day = now.getDate();
    const lower = dateStr.toLowerCase();

    for (const [mName, mIdx] of Object.entries(months)) {
        if (lower.includes(mName)) {
            month = mIdx;
            break;
        }
    }
    const dayMatch = lower.match(/(\d+)/);
    if (dayMatch) day = parseInt(dayMatch[1], 10);

    let hours = 19, minutes = 0;
    if (timeStr) {
        const parts = timeStr.split(':');
        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1], 10);
    }
    return new Date(year, month, day, hours, minutes);
}

// Tests
console.log("--- Testing Time Extraction ---");
console.log("7 PM:", extractTime("Doors: 7 PM") === "19:00" ? "PASS" : "FAIL");
console.log("7:30 PM:", extractTime("7:30 PM") === "19:30" ? "PASS" : "FAIL");
console.log("19:00:", extractTime("19:00") === "19:00" ? "PASS" : "FAIL");
console.log("12 PM (Noon):", extractTime("12 PM") === "12:00" ? "PASS" : "FAIL");
console.log("12 AM (Midnight):", extractTime("12 AM") === "00:00" ? "PASS" : "FAIL");

console.log("\n--- Testing Date Parsing ---");
const d1 = parseLithuanianDate("Jan 15", "19:00");
console.log("Jan 15:", d1.getMonth() === 0 && d1.getDate() === 15 ? "PASS" : "FAIL", d1.toISOString());

const d2 = parseLithuanianDate("Sausio 15", "19:00");
console.log("Sausio 15:", d2.getMonth() === 0 && d2.getDate() === 15 ? "PASS" : "FAIL");

const d3 = parseLithuanianDate("FEB 28", "20:00");
console.log("FEB 28:", d3.getMonth() === 1 && d3.getDate() === 28 ? "PASS" : "FAIL");
