"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Customize code blocks
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <pre className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 overflow-x-auto my-2">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            );
          },
          // Customize headings
          h1: ({ children }: any) => <h1 className="text-2xl font-bold mt-4 mb-2">{children}</h1>,
          h2: ({ children }: any) => <h2 className="text-xl font-bold mt-3 mb-2">{children}</h2>,
          h3: ({ children }: any) => <h3 className="text-lg font-bold mt-2 mb-1">{children}</h3>,
          // Customize lists
          ul: ({ children }: any) => <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>,
          ol: ({ children }: any) => <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>,
          li: ({ children }: any) => <li className="ml-2">{children}</li>,
          // Customize links
          a: ({ href, children }: any) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
              {children}
            </a>
          ),
          // Customize blockquotes
          blockquote: ({ children }: any) => (
            <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-2 italic text-gray-600 dark:text-gray-400">
              {children}
            </blockquote>
          ),
          // Customize paragraphs
          p: ({ children }: any) => <p className="my-2">{children}</p>,
          // Customize tables
          table: ({ children }: any) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }: any) => <thead className="bg-gray-100 dark:bg-gray-800">{children}</thead>,
          tbody: ({ children }: any) => <tbody>{children}</tbody>,
          tr: ({ children }: any) => <tr className="border-b border-gray-200 dark:border-gray-700">{children}</tr>,
          th: ({ children }: any) => <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left font-semibold">{children}</th>,
          td: ({ children }: any) => <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">{children}</td>,
          // Customize horizontal rule
          hr: () => <hr className="my-4 border-gray-300 dark:border-gray-700" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

