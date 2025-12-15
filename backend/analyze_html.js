const fs = require('fs');
const html = fs.readFileSync('bilietai_dump.txt', 'utf8');

console.log("📏 HTML Length:", html.length);

// Regex to find potential event containers or titles
// Look for common patterns in Bilietai
const patterns = [
    /class="[^"]*event[^"]*"/g,
    /class="[^"]*concert[^"]*"/g,
    /class="[^"]*title[^"]*"/g,
    /class="[^"]*item[^"]*"/g
];

patterns.forEach(p => {
    const matches = html.match(p);
    if (matches) {
        // Unique matches
        const unique = [...new Set(matches)];
        console.log(`\n🔍 Pattern ${p}: Found ${matches.length}, Unique: ${unique.slice(0, 10)}`);
    } else {
        console.log(`\n❌ Pattern ${p}: No matches`);
    }
});

// Print unique matches for "concert"
const concertMatches = html.match(/class="[^"]*concert[^"]*"/g);
if (concertMatches) {
    const unique = [...new Set(concertMatches)];
    console.log("\nUnique 'concert' classes:", unique);

    // If we find a list item class, print context around it
    const itemClass = unique.find(c => c.includes('item') || c.includes('card') || c.includes('list'));
    if (itemClass) {
        const className = itemClass.match(/class="([^"]*)"/)[1];
        console.log(`\n📄 Context around '${className}':`);
        const idx = html.indexOf(className);
        console.log(html.substring(idx - 50, idx + 1000));
    }
}
