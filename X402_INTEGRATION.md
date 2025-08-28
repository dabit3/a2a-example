# x402 Payment Integration for A2A Movie Agent

This A2A agent now supports x402 payment protocol, enabling programmatic stablecoin payments for API access.

## Configuration

1. **Set up your wallet address** in `server/.env`:
   ```
   ADDRESS=0xYourWalletAddressHere
   ```
   Replace with your actual wallet address to receive USDC payments.

2. **Choose your network**:
   - For testnet (default): `X402_NETWORK=base-sepolia`
   - For mainnet: `X402_NETWORK=base`

3. **Facilitator URL** is pre-configured to use Coinbase's x402 facilitator:
   ```
   FACILITATOR_URL=https://x402.org/facilitator
   ```

## Protected Endpoints

The following endpoints require payment when x402 is configured:

### A2A Agent Endpoints
- **POST /contexts** - Create new agent context ($0.001 USDC)
- **POST /contexts/:contextId/messages** - Send message to agent ($0.002 USDC)

### Additional API Endpoints
- **GET /api/movie/:id** - Get movie details (protected)
- **GET /api/search?q=query** - Search movies (protected)
- **/premium/*** - Premium features ($0.005 USDC)

## How It Works

1. **Client requests a protected resource**
2. **Server responds with 402 Payment Required** including payment instructions
3. **Client sends payment** via USDC on Base network
4. **Server verifies payment** through the facilitator
5. **Server returns the requested resource**

## Testing

### Without Payment Protection
If ADDRESS is not configured or set to the default placeholder, the server will run without payment protection.

### With Payment Protection
1. Configure your wallet address in `.env`
2. Start the server: `npm run dev`
3. The console will show which endpoints are protected
4. Clients need to implement x402 payment flow to access protected endpoints

## Client Integration

Clients (both human and AI agents) can pay programmatically using the x402 protocol. Example using x402 client libraries:

```javascript
import { x402Client } from '@coinbase/x402';

const client = new x402Client({
  wallet: yourWallet,
  network: 'base-sepolia'
});

// Request will handle payment automatically
const response = await client.request('http://localhost:41243/contexts', {
  method: 'POST',
  body: JSON.stringify({ message: 'Tell me about Inception' })
});
```

## Network Support

- **Testnet**: Base Sepolia (free test USDC available)
- **Mainnet**: Base (real USDC payments)

## Fee Structure

- Coinbase's x402 facilitator processes **fee-free USDC payments** on Base
- No intermediary fees
- Direct wallet-to-wallet transfers

## Troubleshooting

1. **"x402 Payment not configured" warning**: Set your ADDRESS in `.env`
2. **402 responses on all requests**: This is expected behavior - clients need to implement payment flow
3. **Payment verification fails**: Ensure you're using the correct network (testnet vs mainnet)

## Resources

- [x402 Documentation](https://docs.x402.org)
- [Coinbase Developer Platform](https://www.coinbase.com/developer-platform)
- [Base Network](https://base.org)