const vault = require('node-vault');
const fs = require('fs');
const path = require('path');

// Load environment variables from a .env file if needed
require('dotenv').config();

// File path to store the last known secret values
const cacheFilePath = path.resolve(__dirname, '.last.cache.json');
const secretsFilePath = process.env.SECRETS_FILE_PATH || path.resolve('/secrets', 'secrets.env');

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
    console.log('Secrets cached successfully.');

    // Output the values in the specified format
    for (const [key, value] of Object.entries(secretData)) {
      console.log(`${key}=${value}`);
    }

    // Write the secrets to the .env file
    writeSecretsToFile(secretData);
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

        // Write the cached secrets to the .env file
        writeSecretsToFile(cachedData);
      } else {
        console.error('No cached secret values available');
      }
    } else {
      console.error('Error reading secret:', err.message);
    }
  }
}

// Function to write secrets to a .env file
function writeSecretsToFile(secretData) {
  const secretLines = Object.entries(secretData).map(([key, value]) => `${key}=${value}`).join('\n');
  
  // Create the .env file if it doesn't exist and log the action
  if (!fs.existsSync(secretsFilePath)) {
    fs.writeFileSync(secretsFilePath, '');
    console.log(`Created new secrets file at ${secretsFilePath}`);
  }

  // Write to the .env file and log the action
  fs.writeFileSync(secretsFilePath, secretLines);
  console.log(`Secrets written to ${secretsFilePath}`);
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
        console.log('Secrets cache updated.');

        // Output the updated values in the specified format
        for (const [key, value] of Object.entries(secretData)) {
          console.log(`${key}=${value}`);
        }

        // Write the updated secrets to the .env file
        writeSecretsToFile(secretData);
      } else {
        console.log('No changes detected in secret values.');
      }
    } else {
      // Cache the latest known secret values if not already cached
      fs.writeFileSync(cacheFilePath, JSON.stringify(secretData, null, 2));
      console.log('Secrets cached for the first time.');

      // Output the values in the specified format
      for (const [key, value] of Object.entries(secretData)) {
        console.log(`${key}=${value}`);
      }

      // Write the secrets to the .env file
      writeSecretsToFile(secretData);
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

// Function to check the token's TTL and renew it if necessary
async function renewVaultToken() {
  try {
    // Check the current token's TTL
    const tokenLookup = await vaultClient.tokenLookupSelf();
    const ttl = tokenLookup.data.ttl;

    console.log(`Current token TTL: ${ttl} seconds`);

    // If the TTL is less than a threshold (e.g., 60 seconds), renew the token
    const renewThreshold = process.env.TOKEN_RENEW_THRESHOLD || 60;

    if (ttl <= renewThreshold) {
      console.log('Token TTL is low. Renewing the token...');
      const renewedToken = await vaultClient.tokenRenewSelf();
      console.log('Token successfully renewed. New TTL:', renewedToken.auth.lease_duration);
    } else {
      console.log('Token is valid and does not require renewal.');
    }
  } catch (err) {
    console.error('Error checking or renewing the token:', err.message);
  }
}

// Call the function periodically to renew the token if necessary
function keepTokenAlive(intervalInSeconds) {
  setInterval(() => {
    renewVaultToken();
  }, intervalInSeconds * 1000);
}

// Start token renewal check (you can set a different interval if needed)
const tokenCheckInterval = process.env.TOKEN_CHECK_INTERVAL || 300; // Check every 5 minutes
keepTokenAlive(tokenCheckInterval);