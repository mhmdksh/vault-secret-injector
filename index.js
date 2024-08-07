const vault = require('node-vault');
const fs = require('fs');
const path = require('path');

// Load environment variables from a .env file if needed
require('dotenv').config();

// File path to store the last known secret values
const cacheFilePath = path.resolve(__dirname, '.last.cache.json');

// Create a Vault client
const vaultClient = vault({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ENDPOINT,
  token: process.env.VAULT_TOKEN,
});

// Function to read the secret from Vault
async function readSecret() {
  const kvStore = process.env.VAULT_KV_STORE;
  const secretPath = process.env.VAULT_SECRET_PATH;

  try {
    // Read the secret from the specified path
    const secret = await vaultClient.read(`${kvStore}/data/${secretPath}`);
    const secretData = secret.data.data;

    // Cache the latest known secret values
    fs.writeFileSync(cacheFilePath, JSON.stringify(secretData, null, 2));

    // Output the values in the specified format
    for (const [key, value] of Object.entries(secretData)) {
      console.log(`${key}=${value}`);
    }
  } catch (err) {
    if (err.message.includes('permission denied') || err.message.includes('invalid token')) {
      console.error('Authentication Failure');

      // Check if there is a cached secret available
      if (fs.existsSync(cacheFilePath)) {
        const cachedData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));

        // Output the cached values in the specified format
        for (const [key, value] of Object.entries(cachedData)) {
          console.log(`${key}=${value}`);
        }
      } else {
        console.error('No cached secret values available');
      }
    } else {
      console.error('Error reading secret:', err.message);
    }
  }
}

// Function to periodically check for secret updates
async function checkForUpdates() {
  const kvStore = process.env.VAULT_KV_STORE;
  const secretPath = process.env.VAULT_SECRET_PATH;

  try {
    // Read the secret from the specified path
    const secret = await vaultClient.read(`${kvStore}/data/${secretPath}`);
    const secretData = secret.data.data;

    // Check if there are changes in the secret values
    if (fs.existsSync(cacheFilePath)) {
      const cachedData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));

      if (JSON.stringify(cachedData) !== JSON.stringify(secretData)) {
        console.log('Secret values have changed.');

        // Update the cache with the latest known secret values
        fs.writeFileSync(cacheFilePath, JSON.stringify(secretData, null, 2));

        // Output the updated values in the specified format
        for (const [key, value] of Object.entries(secretData)) {
          console.log(`${key}=${value}`);
        }
      }
    } else {
      // Cache the latest known secret values if not already cached
      fs.writeFileSync(cacheFilePath, JSON.stringify(secretData, null, 2));

      // Output the values in the specified format
      for (const [key, value] of Object.entries(secretData)) {
        console.log(`${key}=${value}`);
      }
    }
  } catch (err) {
    console.error('Error checking for updates:', err.message);
  }
}

// Function to keep the Node.js process alive and check for updates periodically
function keepAlive(intervalInSeconds) {
  setInterval(() => {
    checkForUpdates();
  }, intervalInSeconds * 1000);
}

// Execute the readSecret function initially
readSecret().then(() => {
  const intervalInSeconds = process.env.CHECK_INTERVAL || 5; // Default to 5 seconds if not set
  keepAlive(intervalInSeconds);
});