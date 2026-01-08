import { NextRequest, NextResponse } from "next/server";

const AI_BUILDER_API_URL = process.env.NEXT_PUBLIC_AI_BUILDER_API_URL || "https://space.ai-builders.com/backend";
const AI_BUILDER_TOKEN = process.env.NEXT_PUBLIC_AI_BUILDER_TOKEN || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log("API Route: Received request", { 
      model: body.model, 
      messageCount: body.messages?.length,
      stream: body.stream 
    });
    
    // Validate token
    if (!AI_BUILDER_TOKEN || AI_BUILDER_TOKEN === "your_token_here") {
      console.error("API Route: Token not configured");
      return NextResponse.json(
        { error: "AI Builder token not configured. Please set NEXT_PUBLIC_AI_BUILDER_TOKEN in .env.local" },
        { status: 500 }
      );
    }

    // Forward request to AI Builder API
    const apiUrl = `${AI_BUILDER_API_URL}/v1/chat/completions`;
    console.log("API Route: Calling AI Builder API", { url: apiUrl, hasToken: !!AI_BUILDER_TOKEN });
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_BUILDER_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    console.log("API Route: AI Builder response status", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Builder API Error:", response.status, errorText);
      return NextResponse.json(
        { error: `API Error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    // Check if streaming
    if (body.stream) {
      console.log("API Route: Starting stream");
      // Return streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        console.error("API Route: No response body reader");
        return NextResponse.json({ error: "No response body" }, { status: 500 });
      }

      const stream = new ReadableStream({
        async start(controller) {
          const decoder = new TextDecoder();
          let buffer = "";
          let chunkCount = 0;

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                console.log("API Route: Stream done, chunks received:", chunkCount);
                controller.close();
                break;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;
                
                if (trimmedLine.startsWith("data: ")) {
                  const data = trimmedLine.slice(6);
                  if (data === "[DONE]") {
                    console.log("API Route: Received [DONE]");
                    controller.close();
                    return;
                  }
                  chunkCount++;
                  // Forward the data line as-is (including "data: " prefix)
                  controller.enqueue(new TextEncoder().encode(trimmedLine + "\n"));
                } else if (trimmedLine.startsWith("{")) {
                  // Some APIs send JSON without "data: " prefix
                  chunkCount++;
                  controller.enqueue(new TextEncoder().encode("data: " + trimmedLine + "\n"));
                }
              }
            }
          } catch (error) {
            console.error("API Route: Stream error:", error);
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no", // Disable buffering for nginx
        },
      });
    } else {
      // Return JSON response
      console.log("API Route: Returning JSON response");
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

