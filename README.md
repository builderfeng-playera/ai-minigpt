# AI MiniGPT - ChatGPT Clone

A modern ChatGPT clone built with Next.js, TypeScript, and Tailwind CSS, powered by the AI Builder API.

## Features

- 💬 **Two-column interface**: Conversations sidebar on the left, chat interface on the right
- 🚀 **Fast AI responses**: Uses Groq's `grok-4-fast` model for quick responses
- 💾 **Local storage**: Conversations are saved locally in your browser
- 📱 **Responsive design**: Works on desktop and mobile devices
- 🌙 **Dark mode**: Automatic dark mode support
- ⚡ **Streaming responses**: Real-time streaming of AI responses

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_AI_BUILDER_API_URL=https://space.ai-builders.com/backend
   NEXT_PUBLIC_AI_BUILDER_TOKEN=your_token_here
   ```

   Get your AI Builder token from: https://space.ai-builders.com

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

- Click "New Chat" to start a new conversation
- Select a conversation from the sidebar to continue chatting
- Delete conversations by hovering over them and clicking the trash icon
- The first user message automatically becomes the conversation title

## Available Models

The app uses `grok-4-fast` by default, but you can modify the model in `app/page.tsx`. Available models from AI Builder API include:

- `grok-4-fast` - Fast Grok model (default)
- `deepseek` - Fast and cost-effective
- `supermind-agent-v1` - Multi-tool agent
- `gemini-2.5-pro` - Google Gemini
- `gemini-3-flash-preview` - Fast Gemini reasoning
- `gpt-5` - OpenAI-compatible

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **AI Builder API** - AI backend

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page component
│   └── globals.css         # Global styles
├── components/
│   ├── Sidebar.tsx         # Conversations sidebar
│   └── ChatInterface.tsx   # Chat interface
├── lib/
│   ├── api.ts              # AI Builder API client
│   └── conversations.ts    # Conversation management
└── types/
    └── index.ts            # TypeScript types
```

## License

MIT

