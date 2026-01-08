"use client";

import { useState, useRef, useEffect } from "react";
import { Message } from "@/types";
import { createChatCompletionStream, createChatCompletion } from "@/lib/api";
import { Send, Loader2 } from "lucide-react";
import clsx from "clsx";
import MarkdownRenderer from "./MarkdownRenderer";

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string, messageId?: string) => void;
  onAddAssistantMessage: (messageId: string) => void;
  onMessageUpdate: (messageId: string, content: string) => void;
  model?: string;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  onAddAssistantMessage,
  onMessageUpdate,
  model = "grok-4-fast",
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [localUserMessage, setLocalUserMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clear local user message once it appears in the messages prop
  useEffect(() => {
    if (localUserMessage) {
      const foundInMessages = messages.find(m => m.id === localUserMessage.id);
      console.log("🔍 Checking if local message is in messages:", {
        localMessageId: localUserMessage.id,
        foundInMessages: !!foundInMessages,
        messagesCount: messages.length,
        messageIds: messages.map(m => m.id)
      });
      
      if (foundInMessages) {
        console.log("🔄 Clearing local user message, it's now in messages prop");
        setLocalUserMessage(null);
      }
    }
  }, [messages, localUserMessage]);

  // Debug: log messages to see what we're rendering
  useEffect(() => {
    console.log("📋 Messages updated:", messages.length, "messages", messages.map(m => ({ role: m.role, id: m.id, preview: m.content.substring(0, 20) })));
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) {
      console.log("❌ STEP 0: Submit blocked:", { hasInput: !!input.trim(), isLoading });
      return;
    }

    console.log("🚀 STEP 1: Starting submit");
    const userContent = input.trim();
    console.log("📝 STEP 2: User message:", userContent);
    
    // Generate a consistent message ID that will be used for both local and saved message
    const userMessageId = Date.now().toString();
    
    // Create user message immediately for display
    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      content: userContent,
      timestamp: Date.now(),
    };
    
    console.log("👤 Created user message with ID:", userMessageId);
    
    // Show user message immediately
    setLocalUserMessage(userMessage);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");

    // Save user message to conversation - pass the ID so it matches
    onSendMessage(userContent, userMessageId);

    // Create assistant message ID
    const assistantMessageId = (Date.now() + 1).toString();
    console.log("🆔 STEP 3: Created assistant message ID:", assistantMessageId);
    setStreamingMessageId(assistantMessageId);
    
    console.log("➕ STEP 4: Adding assistant message placeholder");
    onAddAssistantMessage(assistantMessageId);

    try {
      // Use messages prop (which should include the user message after onSendMessage)
      // But also include localUserMessage as fallback
      const allMessages = [...messages, userMessage];
      
      // Add "not chat" system message for better AI responses
      const messagesForAPI = [
        { role: "system" as const, content: "not chat" },
        ...allMessages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      ];
      
      console.log("📨 STEP 5: Prepared messages for API:", messagesForAPI.length, "messages (with system message)");
      let accumulatedContent = "";
      let finalContent = "";

      // Try streaming first
      try {
        console.log("🌊 STEP 6: Starting streaming request");
        await createChatCompletionStream(
          {
            model,
            messages: messagesForAPI,
            temperature: 0.7,
          },
          (chunk) => {
            accumulatedContent += chunk;
            finalContent = accumulatedContent; // Keep track of final content
            console.log("📦 STEP 7: Received chunk, total length:", accumulatedContent.length, "preview:", accumulatedContent.substring(0, 50));
            setStreamingContent(accumulatedContent);
            onMessageUpdate(assistantMessageId, accumulatedContent);
          }
        );
        console.log("✅ STEP 8: Streaming completed successfully, final length:", accumulatedContent.length);
        // Ensure final content is saved
        if (accumulatedContent && accumulatedContent !== finalContent) {
          console.log("💾 STEP 8b: Saving final content");
          onMessageUpdate(assistantMessageId, accumulatedContent);
        }
        // Clear local user message once we know it's in the messages prop
        setLocalUserMessage(null);
      } catch (streamError) {
        console.warn("⚠️ STEP 6 FAILED: Streaming failed, trying non-streaming:", streamError);
        // Fallback to non-streaming
        try {
          console.log("🔄 STEP 6b: Trying non-streaming fallback");
          const response = await createChatCompletion({
            model,
            messages: messagesForAPI,
            temperature: 0.7,
          });

          const content = response.choices[0]?.message?.content || "No response received";
          console.log("📄 STEP 6c: Non-streaming response received, length:", content.length);
          accumulatedContent = content;
          setStreamingContent(content);
          onMessageUpdate(assistantMessageId, content);
          // Clear local user message once we know it's in the messages prop
          setLocalUserMessage(null);
        } catch (nonStreamError) {
          console.error("❌ STEP 6d: Non-streaming also failed:", nonStreamError);
          // Re-throw to be caught by outer catch
          throw nonStreamError;
        }
      }
    } catch (error) {
      console.error("💥 STEP ERROR: Chat error:", error);
      const errorMessage = `Error: ${error instanceof Error ? error.message : "Failed to get response"}`;
      console.log("📝 STEP ERROR: Setting error message:", errorMessage);
      setStreamingContent(errorMessage);
      onMessageUpdate(assistantMessageId, errorMessage);
      // Clear local user message on error too
      setLocalUserMessage(null);
    } finally {
      console.log("🏁 STEP FINAL: Cleaning up");
      setIsLoading(false);
      setStreamingMessageId(null);
      // Don't clear streamingContent - keep the final message visible
      // The message should already be saved via onMessageUpdate
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter alone submits, Shift+Enter creates new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    // Shift+Enter is allowed to pass through for new lines
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <h2 className="text-2xl font-semibold mb-2">AI MiniGPT</h2>
              <p>Start a conversation by typing a message below</p>
            </div>
          </div>
        ) : (
          <>
            {/* Debug: Show message count */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-400 px-4 mb-2">
                Debug: {messages.length} messages in array ({messages.filter(m => m.role === 'user').length} user, {messages.filter(m => m.role === 'assistant').length} assistant)
              </div>
            )}
            {/* Show local user message if it exists and isn't in messages yet */}
            {localUserMessage && !messages.find(m => m.id === localUserMessage.id) && (
              <div
                key={localUserMessage.id}
                className="flex gap-4 max-w-3xl mx-auto justify-end flex-row-reverse"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-white">U</span>
                </div>
                <div className="rounded-lg px-4 py-2 max-w-[80%] bg-blue-600 text-white">
                  <div className="whitespace-pre-wrap break-words">
                    {localUserMessage.content}
                  </div>
                </div>
              </div>
            )}
            {messages.map((message, index) => {
              const isStreaming = isLoading && streamingMessageId === message.id;
              // Show streaming content if actively streaming, otherwise show saved content
              // For user messages, always use message.content (never streaming)
              const displayContent = message.role === "user" 
                ? message.content 
                : (isStreaming ? streamingContent : (message.content || streamingContent));
              
              // Debug: Log all messages being rendered (only log first few to avoid spam)
              if (index < 5) {
                console.log(`🎨 RENDERING MESSAGE ${index}/${messages.length}:`, {
                  role: message.role,
                  id: message.id,
                  content: message.content?.substring(0, 30) || "(empty)",
                  contentLength: message.content?.length || 0,
                  displayContent: displayContent?.substring(0, 30) || "(empty)",
                  displayLength: displayContent?.length || 0,
                  isStreaming
                });
              }
              
              return (
                <div
                  key={message.id}
                  className={clsx(
                    "flex gap-4 max-w-3xl mx-auto",
                    message.role === "user" ? "justify-end flex-row-reverse" : "justify-start"
                  )}
                >
                  {/* Avatar - appears first for AI, last for user (due to flex-row-reverse) */}
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold">AI</span>
                    </div>
                  )}
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-white">U</span>
                    </div>
                  )}
                  
                  {/* Message bubble */}
                  <div
                    className={clsx(
                      "rounded-lg px-4 py-2 max-w-[80%]",
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    )}
                  >
                    <div className="break-words">
                      {displayContent ? (
                        message.role === "assistant" ? (
                          <MarkdownRenderer content={displayContent} />
                        ) : (
                          <div className="whitespace-pre-wrap">{displayContent}</div>
                        )
                      ) : message.role === "user" ? (
                        // User messages should always have content - show error if empty
                        <span className="text-red-400">[Message content missing]</span>
                      ) : (
                        <span className="text-gray-400">Thinking...</span>
                      )}
                      {isStreaming && message.role === "assistant" && (
                        <span className="inline-block w-2 h-4 ml-1 bg-gray-400 dark:bg-gray-500 animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-resize textarea
                if (textareaRef.current) {
                  textareaRef.current.style.height = "auto";
                  textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Shift+Enter for new line)"
              rows={1}
              className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] max-h-32 overflow-y-auto"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

