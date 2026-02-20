
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

async function testConnection() {
    const siteUrl = process.env.WORDPRESS_SITE_URL;
    const username = process.env.WORDPRESS_USERNAME;
    const appPassword = process.env.WORDPRESS_APPLICATION_PASSWORD; // Corrected env var name
    const categorySlug = process.env.WORDPRESS_PATIENT_CATEGORY_SLUG || 'strefa-wiedzy';

    console.log('--- WordPress Connection Test ---');
    console.log(`URL: ${siteUrl}`);
    console.log(`User: ${username}`);
    console.log(`Category Slug: ${categorySlug}`);

    if (!siteUrl || !username || !appPassword) {
        console.error('❌ Missing credentials in .env.local');
        return;
    }

    const apiBase = `${siteUrl.replace(/\/+$/, '')}/wp-json/wp/v2`;
    const token = Buffer.from(`${username}:${appPassword}`).toString('base64');
    const headers = {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json'
    };

    try {
        // 1. Test Authentication (Get current user)
        console.log('\nTesting authentication...');
        const userRes = await fetch(`${apiBase}/users/me`, { headers });

        if (!userRes.ok) {
            const text = await userRes.text();
            console.error(`❌ Authentication Failed: ${userRes.status} ${userRes.statusText}`);
            console.error(`Response: ${text.slice(0, 200)}...`);
            return;
        }

        const userData = await userRes.json();
        console.log(`✅ Authenticated as: ${userData.name} (ID: ${userData.id})`);

        // 2. Check Category
        console.log(`\nChecking category "${categorySlug}"...`);
        const catRes = await fetch(`${apiBase}/categories?slug=${categorySlug}`, { headers });

        if (!catRes.ok) {
            console.error(`❌ Failed to fetch categories: ${catRes.status}`);
            return;
        }

        const categories = await catRes.json();
        if (categories.length > 0) {
            console.log(`✅ Category found! ID: ${categories[0].id}, Name: ${categories[0].name}`);
        } else {
            console.error(`❌ Category "${categorySlug}" NOT FOUND.`);
            console.log('Please create this category in your WordPress Admin panel.');
        }

    } catch (error) {
        console.error('❌ Connection Error:', error);
    }
}

testConnection();
