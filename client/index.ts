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

const client = new A2AClient("http://localhost:41243"); // Replace with your server URL

async function run() {
  const messageId = uuidv4();
  let taskId: string | undefined;

  try {
    // 1. Send a message to the agent.
    const sendParams: MessageSendParams = {
      message: {
        messageId: messageId,
        role: "user",
        parts: [{ kind: "text", text: "who is Sydney Sweeney?" }],
        kind: "message",
      },
      configuration: {
        blocking: true,
        acceptedOutputModes: ["text/plain"],
      },
    };

    const sendResponse: SendMessageResponse =
      await client.sendMessage(sendParams);

    // Check if the response has an error (it's a JSONRPCErrorResponse)
    if ('error' in sendResponse) {
      console.error("Error sending message:", sendResponse.error);
      return;
    }

    // On success, the result can be a Task or a Message. Check which one it is.
    const result = sendResponse.result;

    if (result.kind === "task") {
      // The agent created a task.
      const taskResult = result as Task;
      console.log("Send Message Result (Task):", taskResult);
      taskId = taskResult.id; // Save the task ID for the next call
    } else if (result.kind === "message") {
      // The agent responded with a direct message.
      const messageResult = result as Message;
      console.log("Send Message Result (Direct Message):", messageResult);
      // No task was created, so we can't get task status.
    }

    // 2. If a task was created, get its status.
    if (taskId) {
      const getParams: TaskQueryParams = { id: taskId };
      const getResponse: GetTaskResponse = await client.getTask(getParams);

      if ('error' in getResponse) {
        console.error(`Error getting task ${taskId}:`, getResponse.error);
        return;
      }

      const getTaskResult = getResponse.result;
      console.log("Get Task Result:", getTaskResult);
      console.log("Get Task message:", getTaskResult.artifacts?.[0]);
    }
  } catch (error) {
    console.error("A2A Client Communication Error:", error);
  }
}

run();
