
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvLocal() {
    const envPath = resolve(process.cwd(), '.env.local');
    if (!existsSync(envPath)) return;

    const content = readFileSync(envPath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const equalsIndex = line.indexOf('=');
        if (equalsIndex <= 0) continue;

        const key = line.slice(0, equalsIndex).trim();
        let value = line.slice(equalsIndex + 1).trim();

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        value = value.replace(/\\n/g, '\n');

        if (!(key in process.env)) {
            process.env[key] = value;
        }
    }
}

loadEnvLocal();

async function testNewsletter() {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    const apiSecret = process.env.EXPORT_API_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    console.log('--- Newsletter Configuration Check ---');
    console.log(`API Key set: ${apiKey && apiKey.startsWith('SG.') ? '✅ Yes' : '❌ No (Invalid format)'}`);
    console.log(`From Email: ${fromEmail || '❌ Missing'}`);
    console.log(`API Secret: ${apiSecret || '❌ Missing'}`);
    console.log(`Target URL: ${appUrl}`);

    if (!apiKey || !apiKey.startsWith('SG.') || !fromEmail) {
        console.error('\n❌ Please configure SENDGRID_API_KEY and SENDGRID_FROM_EMAIL in .env.local first.');
        return;
    }

    console.log('\n--- Attempting to Trigger Newsletter Send ---');

    try {
        const response = await fetch(`${appUrl}/api/newsletter/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiSecret}`
            },
            body: JSON.stringify({ frequency: 'weekly', targetAudience: 'professional' })
        });

        const data = await response.json();
        console.log(`Status: ${response.status}`);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log('\n✅ Newsletter trigger successful!');
        } else {
            console.error('\n❌ Newsletter trigger failed.');
        }

    } catch (error) {
        console.error('\n❌ Error triggering newsletter:', error);
        console.log('Ensure your development server is running (npm run dev)!');
    }
}

testNewsletter();
