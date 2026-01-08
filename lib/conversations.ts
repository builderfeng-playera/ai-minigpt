import { Conversation, Message } from "@/types";

const STORAGE_KEY = "ai-minigpt-conversations";

export function getConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (error) {
    console.error("Failed to save conversations:", error);
  }
}

export function createConversation(title?: string): Conversation {
  return {
    id: Date.now().toString(),
    title: title || "New Conversation",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function addMessageToConversation(
  conversationId: string,
  message: Message
): Conversation[] {
  const conversations = getConversations();
  const conversation = conversations.find((c) => c.id === conversationId);
  
  if (!conversation) {
    const newConversation = createConversation();
    newConversation.messages.push(message);
    newConversation.updatedAt = Date.now();
    conversations.unshift(newConversation);
  } else {
    conversation.messages.push(message);
    conversation.updatedAt = Date.now();
    // Title generation is now handled in the page component
  }
  
  saveConversations(conversations);
  return conversations;
}

export function updateConversation(
  conversationId: string,
  updates: Partial<Conversation>
): Conversation[] {
  const conversations = getConversations();
  const index = conversations.findIndex((c) => c.id === conversationId);
  
  if (index !== -1) {
    conversations[index] = { ...conversations[index], ...updates };
    conversations[index].updatedAt = Date.now();
    saveConversations(conversations);
  }
  
  return conversations;
}

export function deleteConversation(conversationId: string): Conversation[] {
  const conversations = getConversations();
  const filtered = conversations.filter((c) => c.id !== conversationId);
  saveConversations(filtered);
  return filtered;
}

