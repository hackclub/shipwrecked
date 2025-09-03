import React from 'react';

interface LinkifiedTextProps {
  text: string;
  className?: string;
}

export default function LinkifiedText({ text, className = '' }: LinkifiedTextProps) {
  //url detection regex - matches http/https/www URLs
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;
  
  //split text into parts and identify URLs
  const parts: (string | { type: 'url'; url: string })[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = urlRegex.exec(text)) !== null) {
    //add text before the URL
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    //add the URL
    let url = match[0];
    //add protocol if missing for www URLs
    const href = url.startsWith('www.') ? `https://${url}` : url;
    parts.push({ type: 'url', url: href });
    
    lastIndex = match.index + match[0].length;
  }
  
  //add remaining text after last URL
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  //if no URLs found, return plain text
  if (parts.length === 0) {
    return <p className={className}>{text}</p>;
  }
  
  return (
    <p className={className}>
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          return <span key={index}>{part}</span>;
        } else {
          //render URL as link
          return (
            <a
              key={index}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline break-all"
            >
              {part.url}
            </a>
          );
        }
      })}
    </p>
  );
}