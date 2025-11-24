#!/usr/bin/env node

/**
 * SFMC Connection Test Script
 * 
 * This script validates your SFMC credentials and tests the connection.
 * Run with: node tools/test-sfmc-connection.js
 */

// Load environment variables from .env.local
const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('❌ .env.local file not found!');
        console.log('📝 Please create .env.local from .env.example and add your SFMC credentials.');
        console.log('   See docs/SFMC_SETUP_GUIDE.md for instructions.');
        process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^#][^=]+)=(.+)$/);
        if (match) {
            const [, key, value] = match;
            process.env[key.trim()] = value.trim();
        }
    });
}

loadEnv();

// Check required variables
const required = [
    'SFMC_CLIENT_ID',
    'SFMC_CLIENT_SECRET',
    'SFMC_AUTH_BASE_URL',
    'SFMC_REST_BASE_URL',
    'SFMC_SOAP_BASE_URL'
];

console.log('🔍 Checking SFMC environment variables...\n');

let valid = true;
required.forEach(key => {
    const value = process.env[key];
    const placeholder = !value || value.includes('your_') || value.includes('YOUR_');

    if (!value) {
        console.log(`❌ ${key}: Not set`);
        valid = false;
    } else if (placeholder) {
        console.log(`⚠️  ${key}: Still using placeholder value`);
        valid = false;
    } else {
        // Mask sensitive values
        const display = key.includes('SECRET') ? '***' + value.slice(-4) : value;
        console.log(`✅ ${key}: ${display}`);
    }
});

if (!valid) {
    console.log('\n❌ Configuration incomplete!');
    console.log('📖 Please see docs/SFMC_SETUP_GUIDE.md for setup instructions.');
    process.exit(1);
}

console.log('\n✅ All required variables are set!');
console.log('\n🔄 Testing SFMC connection...\n');

// Test token acquisition
async function testConnection() {
    const authBase = process.env.SFMC_AUTH_BASE_URL.replace(/\/$/, '');
    const restBase = process.env.SFMC_REST_BASE_URL.replace(/\/$/, '');

    try {
        // Step 1: Get access token
        console.log('1️⃣  Requesting OAuth token...');
        const tokenUrl = `${authBase}/v2/token`;
        const tokenBody = {
            grant_type: 'client_credentials',
            client_id: process.env.SFMC_CLIENT_ID,
            client_secret: process.env.SFMC_CLIENT_SECRET,
        };

        if (process.env.SFMC_ACCOUNT_ID && !process.env.SFMC_ACCOUNT_ID.includes('your')) {
            tokenBody.account_id = process.env.SFMC_ACCOUNT_ID;
        }

        const tokenRes = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tokenBody),
        });

        if (!tokenRes.ok) {
            const error = await tokenRes.text();
            console.error('❌ Token request failed:', tokenRes.status, error);
            console.log('\n💡 Common issues:');
            console.log('   - Check your Client ID and Client Secret');
            console.log('   - Verify your AUTH_BASE_URL is correct');
            console.log('   - Ensure the Installed Package is enabled in SFMC');
            process.exit(1);
        }

        const tokenData = await tokenRes.json();
        console.log('✅ Token acquired successfully!');
        console.log(`   Expires in: ${tokenData.expires_in} seconds`);

        // Step 2: Test REST API
        console.log('\n2️⃣  Testing REST API connectivity...');
        const endpointsUrl = `${restBase}/platform/v1/endpoints`;
        const apiRes = await fetch(endpointsUrl, {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Accept': 'application/json',
            },
        });

        if (!apiRes.ok) {
            const error = await apiRes.text();
            console.error('❌ REST API test failed:', apiRes.status, error);
            process.exit(1);
        }

        const endpoints = await apiRes.json();
        console.log('✅ REST API connection successful!');

        // Step 3: Try to fetch Data Extensions count
        console.log('\n3️⃣  Fetching Data Extensions...');
        console.log('   (Using SOAP API for complete DE metadata)');
        console.log('   This may take a moment...\n');

        const soapBase = process.env.SFMC_SOAP_BASE_URL.replace(/\/$/, '');
        const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
      <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
        <s:Header>
          <fueloauth xmlns="http://exacttarget.com/wsdl/partnerAPI">${tokenData.access_token}</fueloauth>
        </s:Header>
        <s:Body>
          <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
            <RetrieveRequest>
              <ObjectType>DataExtension</ObjectType>
              <Properties xmlns="http://exacttarget.com/wsdl/partnerAPI">Name</Properties>
              <Properties xmlns="http://exacttarget.com/wsdl/partnerAPI">CustomerKey</Properties>
            </RetrieveRequest>
          </RetrieveRequestMsg>
        </s:Body>
      </s:Envelope>`;

        const soapRes = await fetch(`${soapBase}/Service.asmx`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'Accept': 'text/xml',
            },
            body: soapEnvelope,
        });

        if (!soapRes.ok) {
            const error = await soapRes.text();
            console.error('❌ SOAP API test failed:', soapRes.status);
            console.log('⚠️  REST API works but SOAP may need additional permissions');
        } else {
            const soapXml = await soapRes.text();

            // Count Data Extensions in response
            const deMatches = soapXml.match(/<CustomerKey>/g);
            const deCount = deMatches ? deMatches.length : 0;

            console.log(`✅ SOAP API connection successful!`);
            console.log(`   Found ${deCount}+ Data Extensions`);

            // Extract a few DE names
            const nameMatches = soapXml.match(/<Name>([^<]+)<\/Name>/g);
            if (nameMatches && nameMatches.length > 0) {
                console.log('\n   Sample Data Extensions:');
                nameMatches.slice(0, 5).forEach(match => {
                    const name = match.replace(/<\/?Name>/g, '');
                    console.log(`   - ${name}`);
                });
                if (nameMatches.length > 5) {
                    console.log(`   ... and ${nameMatches.length - 5} more`);
                }
            }
        }

        console.log('\n');
        console.log('═'.repeat(60));
        console.log('🎉 SFMC CONNECTION TEST SUCCESSFUL!');
        console.log('═'.repeat(60));
        console.log('\n✨ Your DERA app is now ready to sync with SFMC!');
        console.log('\n📊 Next steps:');
        console.log('   1. Make sure your dev server is running: npm run dev');
        console.log('   2. Open http://localhost:3000/data-extensions');
        console.log('   3. Your real SFMC Data Extensions should now appear!');
        console.log('');

    } catch (error) {
        console.error('\n❌ Connection test failed:', error.message);
        console.log('\n💡 Troubleshooting:');
        console.log('   - Check your internet connection');
        console.log('   - Verify all SFMC URLs are correct');
        console.log('   - Check SFMC Setup → Installed Packages');
        console.log('   - See docs/SFMC_SETUP_GUIDE.md for help');
        process.exit(1);
    }
}

testConnection();
