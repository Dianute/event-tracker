const fs = require('fs');
const html = fs.readFileSync('bilietai_dump.txt', 'utf8');

// Find all class="..." strings containing "event" or "concert"
const eventMatches = html.match(/class="[^"]*event[^"]*"/g) || [];
const concertMatches = html.match(/class="[^"]*concert[^"]*"/g) || [];

const allMatches = [...eventMatches, ...concertMatches];
const uniqueClasses = [...new Set(allMatches)];

console.log(`\n🔍 Found ${uniqueClasses.length} unique class strings.`);
console.log("👇 Top 20 Unique Classes:");
uniqueClasses.slice(0, 20).forEach(c => console.log(c));

// If we see something promising, print context
const promising = uniqueClasses.find(c =>
    (c.includes('item') || c.includes('card') || c.includes('row')) &&
    c.length < 50 // Avoid huge strings
);

if (promising) {
    const cleanClass = promising.replace('class="', '').replace('"', '');
    // Take the first class if multiple
    const firstClass = cleanClass.split(' ')[0];

    console.log(`\n📄 Context around '${firstClass}':`);
    const idx = html.indexOf(firstClass);
    if (idx > -1) {
        console.log(html.substring(idx - 100, idx + 1000));
    }
}
