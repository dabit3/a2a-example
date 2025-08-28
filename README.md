# Movie Agent - A2A Protocol Example

A specialized AI agent that answers questions about movies, actors, and directors using the A2A (Agent-to-Agent) protocol. This agent demonstrates how to build conversational AI services that can interact with other agents in a standardized way.

## What It Does

This server implements an A2A-compliant agent that:
- **Answers movie questions** - Ask about plots, actors, directors, recommendations, and more
- **Provides film insights** - Get detailed information about movies, trivia, and industry knowledge
- **Streams responses** - Supports real-time streaming of AI-generated responses
- **Handles task management** - Tracks conversation contexts and manages multiple tasks

The agent uses Claude to generate intelligent responses about movies and refuses to answer non-movie related questions.

This client folder includes an A2A client that:
- **Connects to agents** - Communicates with A2A-compliant agents via HTTP
- **Sends messages** - Submits user queries with configurable output modes
- **Manages tasks** - Creates tasks and retrieves their status asynchronously
- **Handles responses** - Processes both direct messages and task-based responses

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- An Anthropic API key for Claude

### Setup & Run

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**
Create or update `.env` file with your Anthropic API key:
```env
ANTHROPIC_API_KEY=your_api_key_here
PORT=41243  # Optional, defaults to 41243
```

3. **Run the server:**

Development mode (with hot reload):
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

4. **Verify it's running:**
The server will start on `http://localhost:41243`

Check the agent card at:
```
http://localhost:41243/.well-known/agent-card.json
```

## How It Works

The agent follows the A2A protocol:
1. **Receives requests** via HTTP endpoints following A2A spec
2. **Processes messages** using Claude AI with movie-specific prompts
3. **Streams responses** back with task status updates and artifacts
4. **Manages state** through an in-memory task store

Example interactions:
- "Tell me about the plot of Inception"
- "Who directed The Matrix?"
- "Recommend a good sci-fi movie"
- "What movies has Scarlett Johansson been in?"

## Project Structure

```
server/
├── index.ts          # Main server and agent executor
├── basePrompt.ts     # Movie agent system prompt
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript configuration
└── .env             # Environment variables (create this)
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production server
- `npm run watch` - Watch TypeScript files for changes
- `npm run clean` - Clean build directory

## Technologies

- **A2A SDK** - Agent-to-Agent protocol implementation
- **Express** - Web server framework
- **TypeScript** - Type-safe JavaScript
- **Claude API** - Anthropic's AI for generating responses
- **UUID** - Unique identifier generation

## Notes

- The agent only responds to movie-related questions
- Requires valid Anthropic API key to function
- Supports streaming responses for real-time interaction
- Implements A2A protocol v0.3.0