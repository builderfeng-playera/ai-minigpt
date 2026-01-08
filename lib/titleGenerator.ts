import { createChatCompletion } from "./api";

export async function generateConversationTitle(firstMessage: string): Promise<string> {
  try {
    // Use AI to generate a concise title from the first message
    const response = await createChatCompletion({
      model: "grok-4-fast",
      messages: [
        { role: "system", content: "not chat" },
        {
          role: "user",
          content: `Generate a concise title (maximum 5 words) for a conversation that starts with: "${firstMessage}"\n\nRespond with only the title, nothing else.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 20,
    });

    const title = response.choices[0]?.message?.content?.trim() || "";
    
    // Fallback: use first 50 chars of message if AI fails
    if (!title || title.length > 50) {
      return firstMessage.slice(0, 50).trim() || "New Conversation";
    }
    
    // Remove quotes if AI wrapped the title
    return title.replace(/^["']|["']$/g, "").trim() || firstMessage.slice(0, 50).trim() || "New Conversation";
  } catch (error) {
    console.error("Failed to generate title:", error);
    // Fallback to first 50 chars
    return firstMessage.slice(0, 50).trim() || "New Conversation";
  }
}

