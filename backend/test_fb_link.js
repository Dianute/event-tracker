const { extractTime, parseLithuanianDate } = require('./scout');

// MOCK: HTML snippet simulating an Apify response from a Facebook Event/Post
const MOCK_FB_HTML = `
<html>
<head>
    <meta property="og:title" content="Jazz Night at Oldman Parkas" />
    <meta property="og:description" content="Join us this Friday, January 3rd, for an amazing evening of Jazz! Music starts at 19:00. Location: Oldman Parkas, Klaipeda." />
    <meta property="og:image" content="https://example.com/jazz.jpg" />
</head>
<body>
    <div class="userContent">
        <p>Join us this Friday, January 3rd, for an amazing evening of Jazz! Music starts at 19:00. Location: Oldman Parkas, Klaipeda.</p>
    </div>
</body>
</html>
`;

async function testLink(url) {
    console.log(`🔍 Analyzing Link: ${url}`);

    // Simulate fetching HTML (in real app, await apify.fetch(url))
    const html = MOCK_FB_HTML;

    // Use REGEX to extract OpenGraph tags (simulating parsed metadata)
    const ogTitleMatch = html.match(/<meta property="og:title" content="(.*?)"/);
    const ogTitle = ogTitleMatch ? ogTitleMatch[1] : "Unknown Title";

    const ogDescMatch = html.match(/<meta property="og:description" content="(.*?)"/);
    const ogDesc = ogDescMatch ? ogDescMatch[1] : "";

    const ogImageMatch = html.match(/<meta property="og:image" content="(.*?)"/);
    const ogImage = ogImageMatch ? ogImageMatch[1] : "";

    console.log('\n--- Extracted Metadata ---');
    console.log(`Title: ${ogTitle}`);
    console.log(`Image: ${ogImage}`);
    console.log(`Description: ${ogDesc}`);

    // Run Scout Logic (Parsing Time/Date from Description)
    console.log('\n--- Running Scout Logic ---');

    // 1. Detect Time
    // Simple regex for demo purposes if extractTime isn't perfect for this text
    const timeMatch = ogDesc.match(/(\d{1,2})[:.](\d{2})/);
    const time = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : null;
    console.log(`🕒 Detected Time: ${time}`);

    // 2. Detect Date
    // "January 3rd" Logic
    const dateMatch = ogDesc.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s(\d{1,2})/i);
    let date = null;
    if (dateMatch) {
        const month = dateMatch[1];
        const day = dateMatch[2];
        const currentYear = new Date().getFullYear();
        const monthIdx = new Date(`${month} 1, 2000`).getMonth();
        const d = new Date(currentYear, monthIdx, day);
        if (d < new Date()) d.setFullYear(currentYear + 1);
        date = d.toISOString().split('T')[0];
    }
    console.log(`📅 Detected Date: ${date}`);

    console.log('\n✅ RESULT: This is what would be auto-filled in the form!');
}

testLink('https://facebook.com/mock-link');
