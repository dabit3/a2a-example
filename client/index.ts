import 'dotenv/config';
import { A2AClient } from "@a2a-js/sdk/client";
import type {
  Message,
  MessageSendParams,
  Task,
  TaskQueryParams,
  SendMessageResponse,
  GetTaskResponse,
} from "@a2a-js/sdk";
import { v4 as uuidv4 } from "uuid";
import { withPaymentInterceptor, decodeXPaymentResponse } from "x402-axios";
import axios from "axios";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, base, mainnet } from "viem/chains";

// Configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const FACILITATOR_URL = process.env.FACILITATOR_URL || "https://facilitator.x402.io";
const SERVER_URL = process.env.SERVER_URL || "http://localhost:41243";
const NETWORK = process.env.NETWORK || "base-sepolia";
const USER_MESSAGE = process.env.USER_MESSAGE || "who is Sydney Sweeney?";

// Validate required environment variables
if (!PRIVATE_KEY) {
  console.error("[ERROR] PRIVATE_KEY is required in .env file");
  console.error("Please set PRIVATE_KEY in the client/.env file");
  process.exit(1);
}

// Setup x402 payment configuration
const account = privateKeyToAccount(PRIVATE_KEY);

console.log('account: ', account)

console.log("[x402 Client] Configuration:");
console.log("  Wallet address:", account.address);
console.log("  Network:", NETWORK);
console.log("  Server URL:", SERVER_URL);
console.log("  Facilitator URL:", FACILITATOR_URL);

// Select the appropriate chain based on network
const chain = NETWORK === "base" ? base : 
              NETWORK === "mainnet" ? mainnet : 
              baseSepolia;

const publicClient = createPublicClient({
  chain,
  transport: http(),
});

const walletClient = createWalletClient({
  account,
  chain,
  transport: http(),
});

// Create a combined wallet for x402 with proper structure
const wallet = {
  ...walletClient,
  ...publicClient,
  address: account.address,
  account: account,
};

// Create axios instance with x402 payment interceptor
const paymentClient = withPaymentInterceptor(
  axios.create({
    baseURL: SERVER_URL,
  }),
  wallet as any
);

// Helper function to make requests with x402 payment support
async function makePaymentEnabledRequest(
  endpoint: string,
  data: any,
  retryCount = 0
): Promise<any> {
  console.log(`[x402] Requesting ${endpoint}...`);
  
  let paymentAmount: string | null = null;
  
  try {
    const response = await paymentClient.post(endpoint, data);
    
    // Check if payment was made and decode the payment details
    const paymentResponseHeader = response.headers['x-payment-response'];
    if (paymentResponseHeader) {
      try {
        // Decode the payment response to get actual payment details
        const paymentDetails = decodeXPaymentResponse(paymentResponseHeader);
        
        // Log the payment confirmation with transaction details
        console.log(`[x402] ✅ Payment processed successfully`);
        console.log(`[x402]    Transaction: ${paymentDetails.transaction}`);
        console.log(`[x402]    Network: ${paymentDetails.network}`);
        console.log(`[x402]    Payer: ${paymentDetails.payer}`);
        
        // If we captured the amount earlier, show it
        if (paymentAmount) {
          console.log(`[x402]    Amount: ${paymentAmount}`);
        }
      } catch (decodeError) {
        // Fallback if decoding fails
        console.log("[x402] ✅ Payment was processed automatically");
      }
    }
    
    return response.data;
  } catch (error: any) {
    // Check if this is a 402 Payment Required response
    if (error.response?.status === 402) {
      // Try to extract the payment amount from the 402 response
      const x402Header = error.response.headers['x-402'];
      if (x402Header) {
        try {
          // Parse the payment requirements to get the amount
          const requirements = JSON.parse(Buffer.from(x402Header, 'base64').toString());
          if (requirements?.price) {
            paymentAmount = requirements.price;
            console.log(`[x402] Server requires payment of ${paymentAmount}`);
          }
        } catch (parseError) {
          console.log("[x402] Server requires payment");
        }
      }
      
      if (retryCount === 0) {
        console.log("[x402] Retrying with payment...");
        // The x402 interceptor should handle this, but if not, we can force a retry
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
        return makePaymentEnabledRequest(endpoint, data, retryCount + 1);
      }
    }
    
    // For other errors or if retry failed
    console.error("[x402] Request failed:", error.response?.data || error.message);
    throw error;
  }
}

// Create A2A client with payment-enabled fetch
const client = new A2AClient(SERVER_URL, {
  fetchImpl: async (url: string | URL | Request, init?: RequestInit) => {
    const urlString = typeof url === 'string' ? url : 
                     url instanceof URL ? url.toString() : 
                     url.url;
    
    // Use the payment client for all requests
    const method = init?.method || 'GET';
    const body = init?.body;
    
    console.log(`[A2A Client] ${method} ${urlString}`);
    
    try {
      const response = await paymentClient.request({
        url: urlString,
        method: method,
        headers: init?.headers as any,
        data: body
      });
      
      // Check if payment was made
      if (response.headers['x-payment-response']) {
        const paymentDetails = decodeXPaymentResponse(response.headers['x-payment-response']);
        console.log(`[x402] ✅ Payment processed for A2A request`);
        console.log(`[x402]    Transaction: ${paymentDetails.transaction}`);
        console.log(`[x402]    Network: ${paymentDetails.network}`);
      }
      
      // Convert axios response to Fetch API Response
      return new Response(JSON.stringify(response.data), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as any
      });
    } catch (error: any) {
      // If this is NOT a 402, handle it as a regular error
      if (error.response && error.response.status !== 402) {
        console.log(`[A2A Client] Non-402 error: ${error.response.status}`);
        return new Response(JSON.stringify(error.response.data), {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers
        });
      }
      
      // For 402 errors or network errors, throw to let interceptor handle
      console.log(`[A2A Client] Throwing error for interceptor: ${error.response?.status || error.message}`);
      throw error;
    }
  }
});

async function run() {
  const messageId = uuidv4();
  let taskId: string | undefined;

  try {
    // Send message to the agent (context is created automatically by A2A)
    console.log("\n=== Sending message to AI agent ===");
    const sendParams: MessageSendParams = {
      message: {
        messageId: messageId,
        role: "user",
        parts: [{ kind: "text", text: USER_MESSAGE }],
        kind: "message",
      },
      configuration: {
        blocking: true,
        acceptedOutputModes: ["text/plain"],
      },
    };

    // Use standard A2A client for sending messages
    const sendResponse: SendMessageResponse = 
      await client.sendMessage(sendParams);

    // Check if the response has an error
    if ('error' in sendResponse) {
      console.error("[Client] Error sending message:", sendResponse.error);
      return;
    }

    // Process the response
    const result = sendResponse.result;
    
    console.log("\n=== Processing response ===");
    
    if (result.kind === "task") {
      // The agent created a task
      const taskResult = result as Task;
      console.log("[Client] Task created:", taskResult.id);
      taskId = taskResult.id;
      
      // Get task status
      console.log("\n=== Getting task status ===");
      const getParams: TaskQueryParams = { id: taskId };
      const getResponse: GetTaskResponse = await client.getTask(getParams);

      if ('error' in getResponse) {
        console.error(`[Client] Error getting task ${taskId}:`, getResponse.error);
        return;
      }

      const getTaskResult = getResponse.result;
      console.log("[Client] Task status:", getTaskResult.status?.state);
      
      if (getTaskResult.artifacts?.[0]) {
        console.log("\n=== AI Response ===");
        console.log(getTaskResult.artifacts[0]);
      }
    } else if (result.kind === "message") {
      // Direct message response
      const messageResult = result as Message;
      console.log("\n=== AI Response (Direct Message) ===");
      console.log(messageResult);
    }
    
  } catch (error: any) {
    console.error("\n[Client] Error:", error.message || error);
  }
}

run();
