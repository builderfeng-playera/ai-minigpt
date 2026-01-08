"use client";

import { useState, useEffect } from "react";
import { Conversation, Message } from "@/types";
import {
  getConversations,
  createConversation,
  addMessageToConversation,
  updateConversation,
  deleteConversation as deleteConv,
  saveConversations,
} from "@/lib/conversations";

// Import getConversations for useEffect
const { getConversations: getConvs } = require("@/lib/conversations");
import { generateConversationTitle } from "@/lib/titleGenerator";
import Sidebar from "@/components/Sidebar";
import ChatInterface from "@/components/ChatInterface";
import ModelSelector from "@/components/ModelSelector";

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("grok-4-fast");

  useEffect(() => {
    const convs = getConversations();
    setConversations(convs);
    
    // Load saved model preference
    if (typeof window !== "undefined") {
      const savedModel = localStorage.getItem("ai-minigpt-selected-model");
      if (savedModel) {
        setSelectedModel(savedModel);
      }
    }
    
    // Select first conversation if available
    if (convs.length > 0 && !currentConversationId) {
      setCurrentConversationId(convs[0].id);
      setCurrentMessages(convs[0].messages);
    }
  }, []);

  // Save model preference when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ai-minigpt-selected-model", selectedModel);
    }
  }, [selectedModel]);

  useEffect(() => {
    if (currentConversationId) {
      const conv = conversations.find((c) => c.id === currentConversationId);
      if (conv) {
        console.log("🔄 Updating currentMessages from conversation:", conv.messages.length, "messages");
        console.log("📋 Messages:", conv.messages.map(m => ({ role: m.role, id: m.id, preview: m.content.substring(0, 30) })));
        // Create a new array to ensure React detects the change
        setCurrentMessages([...conv.messages]);
      } else {
        setCurrentMessages([]);
      }
    } else {
      setCurrentMessages([]);
    }
  }, [currentConversationId, conversations]);

  const handleNewConversation = () => {
    console.log("🆕 Creating new conversation");
    const newConv = createConversation();
    const allConvs = getConversations();
    const updated = [newConv, ...allConvs];
    
    // Save to localStorage immediately
    saveConversations(updated);
    
    setConversations(updated);
    setCurrentConversationId(newConv.id);
    setCurrentMessages([]);
    console.log("✅ New conversation created with ID:", newConv.id, "Total conversations:", updated.length);
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
  };

  const handleDeleteConversation = (id: string) => {
    const updated = deleteConv(id);
    setConversations(updated);
    if (currentConversationId === id) {
      if (updated.length > 0) {
        setCurrentConversationId(updated[0].id);
      } else {
        setCurrentConversationId(null);
        setCurrentMessages([]);
      }
    }
  };

  const handleSendMessage = async (content: string, messageId?: string) => {
    let conversationId = currentConversationId;
    
    if (!conversationId) {
      // Create new conversation if none exists
      console.log("🆕 No conversation ID, creating new conversation in handleSendMessage");
      const newConv = createConversation();
      const allConvs = getConversations();
      const updated = [newConv, ...allConvs];
      
      // Save to localStorage immediately
      saveConversations(updated);
      
      setConversations(updated);
      setCurrentConversationId(newConv.id);
      conversationId = newConv.id;
      console.log("✅ Created new conversation with ID:", conversationId);
    }

    const userMessage: Message = {
      id: messageId || Date.now().toString(),
      role: "user",
      content,
      timestamp: Date.now(),
    };
    
    console.log("💾 handleSendMessage: Saving user message with ID:", userMessage.id, "content:", content, "to conversation:", conversationId);

    // Add message to conversation synchronously first
    const updated = addMessageToConversation(conversationId!, userMessage);
    console.log("💾 Saving user message to conversation:", userMessage.content);
    
    // IMPORTANT: Update conversations state first, then messages
    setConversations(updated);
    
    const conv = updated.find((c) => c.id === conversationId);
    if (conv) {
      // Update messages immediately so user message shows up right away
      console.log("📝 Setting currentMessages with:", conv.messages.length, "messages");
      console.log("📋 Message details:", conv.messages.map(m => ({ role: m.role, id: m.id, content: m.content.substring(0, 30) })));
      // Force a new array reference to ensure React re-renders - create completely new array
      const newMessages = conv.messages.map(m => ({ 
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      }));
      setCurrentMessages(newMessages);
      console.log("✅ User message added to conversation, total messages:", conv.messages.length);
      console.log("🔍 Current messages state will have:", newMessages.length, "messages");
      console.log("📋 All message IDs:", newMessages.map(m => m.id));
      
      // Generate title from first message if this is the first user message (async, non-blocking)
      if (conv.messages.length === 1 && userMessage.role === "user") {
        console.log("📝 Generating conversation title from first message");
        // Don't await - let it run in background
        generateConversationTitle(content)
          .then((title) => {
            console.log("✨ Generated title:", title);
            const updatedWithTitle = updateConversation(conversationId!, { title });
            setConversations(updatedWithTitle);
          })
          .catch((error) => {
            console.error("Failed to generate title:", error);
            // Fallback: use first 50 chars
            const fallbackTitle = content.slice(0, 50).trim() || "New Conversation";
            const updatedWithTitle = updateConversation(conversationId!, { title: fallbackTitle });
            setConversations(updatedWithTitle);
          });
      }
    }
  };

  const handleAddAssistantMessage = (messageId: string) => {
    console.log("🔧 PAGE: handleAddAssistantMessage called", { messageId, currentConversationId });
    if (!currentConversationId) {
      console.log("❌ PAGE: No current conversation ID");
      return;
    }

    const assistantMessage: Message = {
      id: messageId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };

    // Read fresh from localStorage to avoid stale state
    const allConvs = getConversations();
    const conv = allConvs.find((c) => c.id === currentConversationId);
    if (!conv) {
      console.log("❌ PAGE: Conversation not found:", currentConversationId);
      return;
    }

    console.log("📊 PAGE: Current messages before add:", conv.messages.length);
    console.log("📋 Current message IDs:", conv.messages.map(m => ({ role: m.role, id: m.id, content: m.content.substring(0, 20) })));
    const updatedMessages = [...conv.messages, assistantMessage];
    console.log("📊 PAGE: Updated messages after add:", updatedMessages.length);
    const updatedConv = { ...conv, messages: updatedMessages };
    const updatedConvs = allConvs.map((c) =>
      c.id === currentConversationId ? updatedConv : c
    );

    updateConversation(currentConversationId, updatedConv);
    setConversations(updatedConvs);
    // Create new array reference
    const newMessages = updatedMessages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp
    }));
    setCurrentMessages(newMessages);
    console.log("✅ PAGE: Assistant message added, currentMessages:", newMessages.length);
  };

  const handleMessageUpdate = (messageId: string, content: string) => {
    console.log("🔄 PAGE: handleMessageUpdate called", { messageId, contentLength: content.length, preview: content.substring(0, 50) });
    if (!currentConversationId) {
      console.log("❌ PAGE: No current conversation ID in handleMessageUpdate");
      return;
    }

    // Use functional update to ensure we have the latest state
    setConversations((prevConvs) => {
      const conv = prevConvs.find((c) => c.id === currentConversationId);
      if (!conv) {
        console.log("❌ PAGE: Conversation not found in handleMessageUpdate:", currentConversationId);
        return prevConvs;
      }

      const messageExists = conv.messages.find((m) => m.id === messageId);
      console.log("🔍 PAGE: Message exists?", !!messageExists, "Total messages:", conv.messages.length);
      console.log("📋 Current messages in conversation:", conv.messages.map(m => ({ role: m.role, id: m.id, content: m.content.substring(0, 20) })));

      // If message doesn't exist, add it
      let updatedMessages;
      if (!messageExists) {
        console.log("➕ PAGE: Message not found, adding it");
        updatedMessages = [...conv.messages, { id: messageId, role: "assistant" as const, content, timestamp: Date.now() }];
      } else {
        updatedMessages = conv.messages.map((m) =>
          m.id === messageId ? { ...m, content } : m
        );
      }

      const updatedConv = { ...conv, messages: updatedMessages };
      updateConversation(currentConversationId, updatedConv);
      
      // Update currentMessages with a new array reference
      const newMessages = updatedMessages.map(m => ({ ...m })); // Deep copy to ensure React detects change
      setCurrentMessages(newMessages);
      console.log("✅ PAGE: Message updated, new content length:", content.length, "total messages:", newMessages.length);
      console.log("📋 Updated messages:", newMessages.map(m => ({ role: m.role, id: m.id, content: m.content.substring(0, 20) })));

      return prevConvs.map((c) =>
        c.id === currentConversationId ? updatedConv : c
      );
    });
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Model Selector Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Model:</span>
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
          </div>
        </div>
        
        <ChatInterface
          messages={currentMessages}
          onSendMessage={handleSendMessage}
          onAddAssistantMessage={handleAddAssistantMessage}
          onMessageUpdate={handleMessageUpdate}
          model={selectedModel}
        />
      </main>
    </div>
  );
}

