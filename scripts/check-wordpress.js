const fs = require('fs');
const path = require('path');
const https = require('https');

// Manually parse .env.local because dotenv might not be installed
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (!fs.existsSync(envPath)) {
            console.error('❌ .env.local file not found!');
            return {};
        }
        const content = fs.readFileSync(envPath, 'utf8');
        const env = {};
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                let value = match[2].trim();
                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                env[match[1].trim()] = value;
            }
        });
        return env;
    } catch (e) {
        console.error('Error loading .env.local:', e);
        return {};
    }
}

const env = loadEnv();
const siteUrl = env.WORDPRESS_SITE_URL;
const username = env.WORDPRESS_USERNAME;
const appPassword = env.WORDPRESS_APPLICATION_PASSWORD;
const categorySlug = env.WORDPRESS_PATIENT_CATEGORY_SLUG || 'strefa-wiedzy';

console.log('--- WordPress Connection Check ---');
console.log(`URL: ${siteUrl}`);
console.log(`User: ${username}`);
console.log(`Category: ${categorySlug}`);

if (!siteUrl || !username || !appPassword) {
    console.error('❌ Missing credentials in .env.local');
    process.exit(1);
}

// Helper for https request
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const apiUrl = new URL(url);
        const options = {
            hostname: apiUrl.hostname,
            path: apiUrl.pathname + apiUrl.search,
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${username}:${appPassword}`).toString('base64'),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                    data: data
                });
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}

(async () => {
    try {
        const apiBase = `${siteUrl.replace(/\/+$/, '')}/wp-json/wp/v2`;

        // 1. Check User
        console.log('\n--> Authenticating...');
        const userRes = await makeRequest(`${apiBase}/users/me`);

        if (userRes.statusCode !== 200) {
            console.error(`❌ Authentication Failed: ${userRes.statusCode} ${userRes.statusMessage}`);
            console.error(`Response: ${userRes.data.substring(0, 200)}`);

            if (userRes.statusCode === 401) {
                console.error('\n⚠️  Troubleshooting 401 Unauthorized:');
                console.error('1. Did you use an Application Password? (Not your login password)');
                console.error('2. Is strict security plugin blocking Basic Auth?');
                console.error('3. Are you using the correct Username?');
            }
            return;
        }

        const user = JSON.parse(userRes.data);
        console.log(`✅ Success! Logged in as: ${user.name} (ID: ${user.id})`);

        // 2. Check Category
        console.log(`\n--> Verifying Category "${categorySlug}"...`);
        const catRes = await makeRequest(`${apiBase}/categories?slug=${categorySlug}`);

        if (catRes.statusCode !== 200) {
            console.error(`❌ Category request failed: ${catRes.statusCode}`);
            return;
        }

        const categories = JSON.parse(catRes.data);
        if (categories.length > 0) {
            console.log(`✅ Category Found: "${categories[0].name}" (ID: ${categories[0].id})`);
        } else {
            console.error(`❌ Category "${categorySlug}" NOT FOUND.`);
            console.log('Action: Please create this category in your WordPress Admin.');
        }

    } catch (error) {
        console.error('❌ Connection Error:', error.message);
    }
})();
