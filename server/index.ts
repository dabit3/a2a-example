import 'dotenv/config';
import type {
  AgentCard,
  TaskStatusUpdateEvent,
  Task,
  TaskArtifactUpdateEvent
} from "@a2a-js/sdk";

import {
  InMemoryTaskStore,
  TaskStore,
  AgentExecutor,
  RequestContext,
  ExecutionEventBus,
  DefaultRequestHandler,
} from "@a2a-js/sdk/server";
import { A2AExpressApp } from "@a2a-js/sdk/server/express";
import { v4 as uuidv4 } from "uuid";

import express from "express";
import { basePrompt } from "./basePrompt";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 41243;

const movieAgentCard: AgentCard = {
  name: process.env.AGENT_NAME || "Movie Agent",
  description:
    "An agent that can answer questions about movies and actors.",
  // Adjust the base URL and port as needed.
  url: `http://localhost:${PORT}/`,
  provider: {
    organization: process.env.AGENT_ORGANIZATION || "A2A Agents",
    url: "https://example.com/a2a-agents", // Added provider URL
  },
  protocolVersion: "0.3.0", // A2A protocol this agent supports.
  version: "0.0.2", // Incremented version
  capabilities: {
    streaming: true, // Supports streaming
    pushNotifications: false, // Assuming not implemented for this agent yet
    stateTransitionHistory: true, // Agent uses history
  },
  securitySchemes: undefined, // Or define actual security schemes if any
  security: undefined,
  defaultInputModes: ["text/plain"],
  defaultOutputModes: ["text/plain"],
  skills: [
    {
      id: "general_movie_chat",
      name: "General Movie Chat",
      description:
        "Answer general questions or chat about movies, actors, directors.",
      tags: ["movies", "actors", "directors"],
      examples: [
        "Tell me about the plot of Inception.",
        "Recommend a good sci-fi movie.",
        "Who directed The Matrix?",
        "What other movies has Scarlett Johansson been in?",
        "Find action movies starring Keanu Reeves",
        "Which came out first, Jurassic Park or Terminator 2?",
      ],
      inputModes: ["text/plain"], // Explicitly defining for skill
      outputModes: ["text/plain"], // Explicitly defining for skill
    },
  ],
  supportsAuthenticatedExtendedCard: false,
};

// 1. Define your agent's logic as a AgentExecutor
class MyAgentExecutor implements AgentExecutor {
  private cancelledTasks = new Set<string>();

  public cancelTask = async (
    taskId: string,
    eventBus: ExecutionEventBus
  ): Promise<void> => {
    this.cancelledTasks.add(taskId);
    // The execute loop is responsible for publishing the final state
  };

  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    const userMessage = requestContext.userMessage;
    const existingTask = requestContext.task;

    // Access the actual text content from the client message
    const messageText = userMessage.parts[0]?.kind === 'text' 
      ? userMessage.parts[0].text 
      : '';
    console.log("User message content:", messageText);

    // Determine IDs for the task and context, from requestContext.
    const taskId = requestContext.taskId;
    const contextId = requestContext.contextId;

    console.log(
      `[MyAgentExecutor] Processing message ${userMessage.messageId} for task ${taskId} (context: ${contextId})`
    );

    // 1. Publish initial Task event if it's a new task
    if (!existingTask) {
      const initialTask: Task = {
        kind: "task",
        id: taskId,
        contextId: contextId,
        status: {
          state: "submitted",
          timestamp: new Date().toISOString(),
        },
        history: [userMessage],
        metadata: userMessage.metadata,
        artifacts: [], // Initialize artifacts array
      };
      eventBus.publish(initialTask);
    }

    // 2. Publish "working" status update
    const workingStatusUpdate: TaskStatusUpdateEvent = {
      kind: "status-update",
      taskId: taskId,
      contextId: contextId,
      status: {
        state: "working",
        message: {
          kind: "message",
          role: "agent",
          messageId: uuidv4(),
          parts: [{ kind: "text", text: "Finding your movie information..." }],
          taskId: taskId,
          contextId: contextId,
        },
        timestamp: new Date().toISOString(),
      },
      final: false,
    };
    eventBus.publish(workingStatusUpdate);

    // Simulate work...
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Use fetch to call the Anthropic API with the user message, and extract the response text.
    // We'll use the Claude 3 model (e.g., claude-3-opus-20240229) for this example.
    // The API key is in process.env.ANTHROPIC_API_KEY

    // Prepare the Anthropic API request
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set.");
    }

    let prompt = basePrompt + messageText;
    // Compose the API request payload
    const anthropicPayload = {
      model: "claude-3-opus-20240229",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    };

    // Call the Anthropic API
    let anthropicResponseText = "";
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify(anthropicPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
      }

      const data = await response.json() as any;
      // The response content is in data.content, which is an array of message parts
      // We'll concatenate all text parts
      if (Array.isArray(data.content)) {
        anthropicResponseText = data.content
          .map((part: any) => (typeof part.text === "string" ? part.text : ""))
          .join("");
      } else {
        anthropicResponseText = "";
      }
    } catch (err) {
      anthropicResponseText = "Sorry, there was an error contacting the Anthropic API.";
      console.error("Anthropic API call failed:", err);
    }

    // Check for request cancellation
    if (this.cancelledTasks.has(taskId)) {
      console.log(`[MyAgentExecutor] Request cancelled for task: ${taskId}`);
      const cancelledUpdate: TaskStatusUpdateEvent = {
        kind: "status-update",
        taskId: taskId,
        contextId: contextId,
        status: {
          state: "canceled",
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(cancelledUpdate);
      eventBus.finished();
      return;
    }

    const artifactId = `artifact-${uuidv4()}`;
    const artifactName = `Generated Code ${uuidv4().substring(0, 8)}`;

    // 3. Publish artifact update
    const artifactUpdate: TaskArtifactUpdateEvent = {
      kind: "artifact-update",
      taskId: taskId,
      contextId: contextId,
      artifact: {
        artifactId,
        name: artifactName,
        parts: [{ kind: "text", text: anthropicResponseText }],
      },
      append: false, // Each emission is a complete file snapshot
      lastChunk: true, // True for this file artifact
    };
    eventBus.publish(artifactUpdate);

    // 4. Publish final status update
    const finalUpdate: TaskStatusUpdateEvent = {
      kind: "status-update",
      taskId: taskId,
      contextId: contextId,
      status: {
        state: "completed",
        message: {
          kind: "message",
          role: "agent", 
          messageId: uuidv4(),
          taskId: taskId,
          contextId: contextId,
          parts: [],
        },
        timestamp: new Date().toISOString(),
      },
      final: true,
    };
    eventBus.publish(finalUpdate);
    eventBus.finished();
  }
}

const taskStore: TaskStore = new InMemoryTaskStore();
const agentExecutor: AgentExecutor = new MyAgentExecutor();

const requestHandler = new DefaultRequestHandler(
  movieAgentCard,
  taskStore,
  agentExecutor
);

const appBuilder = new A2AExpressApp(requestHandler);
const expressApp = appBuilder.setupRoutes(express(), "");

expressApp.listen(PORT, () => {
  console.log(
    `[MyAgent] Server using new framework started on http://localhost:${PORT}`
  );
  console.log(
    `[MyAgent] Agent Card: http://localhost:${PORT}/.well-known/agent-card.json`
  );
  console.log("[MyAgent] Press Ctrl+C to stop the server");
  console.log(`[MyAgent] Environment: ${process.env.NODE_ENV || 'development'}`);
});