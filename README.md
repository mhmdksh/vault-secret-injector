# The Vault Secret Injector
A Secret Injector Service built specifically to sync secrets from vault to host machines privately and securely
## Configure a Vault Token
1. Download vault cli from here: https://developer.hashicorp.com/vault/install
2. Export Vault Configs
```
export VAULT_ADDR='https://vault.giveth.io'
export TOKEN='hvs.ADMINXXXXXXXXXXXXX'
```
3. Connect to VPN to be able to reach vault
4. Login to vault
```
vault login $TOKEN
```
5. Create a Token for a policy using the exact same command
```
vault token create -policy="admin" -period=30d -format=json | jq -r ".auth.client_token" > periodic_token.txt
```
6. You can see the token value here in this file
```
cat periodic_token.txt
```
7. Lookup the validity of the token using the below command
```
vault token lookup $(cat periodic_token.txt)
```

## Setup
### Configure
Make a copy of the `.env.template` file and populate it
```bash
# The Vault Endpoint
VAULT_ENDPOINT=http://127.0.0.1:8200
# The Vault Token
VAULT_TOKEN=example-token
# The Key Value Storne Name
VAULT_KV_STORE=kv-secret
# The path for the secret
VAULT_SECRET_PATH=my-secret
# The targeted ENV file on the host system
TARGET_HOST_FILE="./secrets.env"
# The Interval in which the injector will check for secrets updates (Note: You can use the time formats: s,m,h,d)
SECRETS_CHECK_INTERVAL=5s
# The Interval in which the injector will check if the token is about to expire (Note: You can use the time formats: s,m,h,d)
TOKEN_CHECK_INTERVAL=12h
# The minimum threshold in which the token TTL is allowed to be (It should be more than the TOKEN_CHECK_INTERVAL) (Note: You can use the time formats: s,m,h,d)
TOKEN_RENEW_THRESHOLD=25d
```
### Start
```bash
docker compose build --no-cache
docker compose up -d --build
```