# A2A Client with x402 Payment Integration

This client demonstrates how to integrate x402 payment protocol with an A2A (Agent-to-Agent) client.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

3. Edit `.env` file with your configuration:
   - `PRIVATE_KEY`: Your wallet private key (REQUIRED)
   - `FACILITATOR_URL`: x402 facilitator URL (optional)
   - `SERVER_URL`: Your A2A server URL (optional)
   - `NETWORK`: Blockchain network (base-sepolia, base, or mainnet)
   - `USER_MESSAGE`: Custom message to send to the AI agent

## Running the Client

```bash
npm start
```

## How it Works

1. The client loads configuration from environment variables
2. Creates a wallet using the provided private key
3. Sets up an axios client with x402 payment interceptor
4. When making requests to protected endpoints:
   - Server returns 402 Payment Required
   - x402 interceptor automatically creates and signs a payment
   - Request is retried with payment header
   - Server validates payment and processes the request

## Security

⚠️ **NEVER commit real private keys to version control!**

For testing, you can use Anvil's default test key:
```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## Payment Flow

The client automatically handles x402 payments when the server requires them:
- Protected endpoint: POST /contexts ($0.01)
- Payment is processed transparently via the x402 interceptor
- Transaction details are logged to the console