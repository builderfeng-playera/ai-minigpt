import { ChatCompletionRequest, ChatCompletionResponse } from "@/types";

// Use Next.js API route instead of direct API calls to avoid CORS issues
const API_BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

export async function createChatCompletion(
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let errorMessage = "Unknown error";
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.details || JSON.stringify(errorData);
    } catch {
      try {
        errorMessage = await response.text();
      } catch {
        errorMessage = `HTTP ${response.status}`;
      }
    }
    throw new Error(`API Error: ${response.status} - ${errorMessage}`);
  }

  return response.json();
}

export async function createChatCompletionStream(
  request: ChatCompletionRequest,
  onChunk: (chunk: string) => void
): Promise<void> {
  console.log("API Request:", { model: request.model, messageCount: request.messages.length });

  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...request,
      stream: true,
    }),
  });

  if (!response.ok) {
    let errorMessage = "Unknown error";
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.details || JSON.stringify(errorData);
    } catch {
      try {
        errorMessage = await response.text();
      } catch {
        errorMessage = `HTTP ${response.status}`;
      }
    }
    console.error("API Error Response:", response.status, errorMessage);
    throw new Error(`API Error: ${response.status} - ${errorMessage}`);
  }

  console.log("Stream response received, status:", response.status);
  console.log("Content-Type:", response.headers.get("content-type"));

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error("No response body");
  }

  let buffer = "";
  let hasReceivedData = false;
  let chunkCount = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log("Stream reader done, total chunks:", chunkCount);
        break;
      }

      hasReceivedData = true;
      const decoded = decoder.decode(value, { stream: true });
      buffer += decoded;
      
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        console.log("Processing line:", trimmedLine.substring(0, 100)); // Log first 100 chars

        if (trimmedLine.startsWith("data: ")) {
          const data = trimmedLine.slice(6).trim();
          if (data === "[DONE]") {
            console.log("Stream completed with [DONE]");
            return;
          }
          try {
            const parsed = JSON.parse(data);
            chunkCount++;
            // Handle OpenAI-compatible streaming format
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              console.log("Received content chunk:", content.substring(0, 50));
              onChunk(content);
            }
            // Also check for finish reason
            if (parsed.choices?.[0]?.finish_reason) {
              console.log("Finish reason:", parsed.choices[0].finish_reason);
              return;
            }
          } catch (e) {
            console.warn("Failed to parse chunk:", data.substring(0, 100), e);
          }
        } else if (trimmedLine.startsWith("{")) {
          // Try parsing as JSON directly (non-SSE format)
          try {
            const parsed = JSON.parse(trimmedLine);
            chunkCount++;
            const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content;
            if (content) {
              console.log("Received content (non-SSE):", content.substring(0, 50));
              onChunk(content);
            }
          } catch (e) {
            console.warn("Failed to parse JSON line:", trimmedLine.substring(0, 100));
          }
        }
      }
    }

    if (!hasReceivedData) {
      console.warn("No data received from stream");
    } else {
      console.log("Stream processing complete, processed chunks:", chunkCount);
    }
  } catch (error) {
    console.error("Stream error:", error);
    throw error;
  }
}

