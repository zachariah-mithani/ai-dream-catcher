import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function MarkdownText({ children, style }) {
  const { colors } = useTheme();
  
  if (!children) return null;
  
  // Simple markdown parser for **bold** text
  const parseMarkdown = (text) => {
    const parts = [];
    let currentIndex = 0;
    let textIndex = 0;
    
    // Find all **bold** patterns
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    
    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the bold section
      if (match.index > currentIndex) {
        parts.push({
          text: text.substring(currentIndex, match.index),
          bold: false
        });
      }
      
      // Add the bold text
      parts.push({
        text: match[1],
        bold: true
      });
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining text after the last bold section
    if (currentIndex < text.length) {
      parts.push({
        text: text.substring(currentIndex),
        bold: false
      });
    }
    
    return parts;
  };
  
  const parsedParts = parseMarkdown(children);
  
  return (
    <Text style={style}>
      {parsedParts.map((part, index) => (
        <Text
          key={index}
          style={part.bold ? { fontWeight: 'bold' } : {}}
        >
          {part.text}
        </Text>
      ))}
    </Text>
  );
}
