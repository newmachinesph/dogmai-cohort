"use client";

import React, { useMemo } from "react";

interface FormattedMessageProps {
  content: string;
  className?: string;
}

// Simple markdown-like formatting:
// **bold** -> <strong>bold</strong>
// *italic* -> <em>italic</em>
// `code` -> <code>code</code>
// ```code block``` -> <pre><code>code block</code></pre>
// @username -> highlight mention
// URLs -> clickable links

export function FormattedMessage({ content, className = "" }: FormattedMessageProps) {
  const formattedContent = useMemo(() => {
    if (!content) return null;

    let result: (string | React.ReactElement)[] = [content];

    // Process code blocks first (```...```)
    result = processPattern(
      result,
      /```([\s\S]*?)```/g,
      (match, code) => (
        <pre key={match} className="bg-background/50 rounded p-2 my-1 overflow-x-auto text-sm font-mono">
          <code>{code}</code>
        </pre>
      )
    );

    // Process inline code (`...`)
    result = processPattern(
      result,
      /`([^`]+)`/g,
      (match, code) => (
        <code key={match} className="bg-background/50 rounded px-1 py-0.5 text-sm font-mono">
          {code}
        </code>
      )
    );

    // Process bold (**...**)
    result = processPattern(
      result,
      /\*\*(.+?)\*\*/g,
      (match, text) => <strong key={match}>{text}</strong>
    );

    // Process italic (*...*)
    result = processPattern(
      result,
      /(?<!\*)\*([^*]+)\*(?!\*)/g,
      (match, text) => <em key={match}>{text}</em>
    );

    // Process mentions (@username)
    result = processPattern(
      result,
      /@(\w+)/g,
      (match, username) => (
        <span key={match} className="text-primary font-medium">
          @{username}
        </span>
      )
    );

    // Process URLs
    result = processPattern(
      result,
      /(https?:\/\/[^\s]+)/g,
      (match, url) => (
        <a
          key={match}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:no-underline"
        >
          {url.length > 50 ? url.substring(0, 50) + "..." : url}
        </a>
      )
    );

    return result;
  }, [content]);

  return (
    <span className={`whitespace-pre-wrap break-words ${className}`}>
      {formattedContent}
    </span>
  );
}

function processPattern(
  parts: (string | React.ReactElement)[],
  pattern: RegExp,
  replacement: (match: string, ...groups: string[]) => React.ReactElement
): (string | React.ReactElement)[] {
  const result: (string | React.ReactElement)[] = [];

  for (const part of parts) {
    if (typeof part !== "string") {
      result.push(part);
      continue;
    }

    let lastIndex = 0;
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;

    while ((match = regex.exec(part)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        result.push(part.substring(lastIndex, match.index));
      }

      // Add replacement
      const groups = match.slice(1);
      result.push(replacement(match[0] + match.index, ...groups));

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < part.length) {
      result.push(part.substring(lastIndex));
    }
  }

  return result;
}
