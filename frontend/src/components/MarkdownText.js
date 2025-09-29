import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function MarkdownText({ children, style }) {
  const { colors } = useTheme();
  
  if (!children) return null;
  
  // Enhanced markdown parser for headings, bold, italic, and lists
  const parseMarkdown = (text) => {
    const parts = [];
    let currentIndex = 0;
    
    // Combined regex for all markdown patterns
    const patterns = [
      { regex: /^### (.*$)/gm, type: 'h3' },
      { regex: /^## (.*$)/gm, type: 'h2' },
      { regex: /^# (.*$)/gm, type: 'h1' },
      { regex: /\*\*(.*?)\*\*/g, type: 'bold' },
      { regex: /\*(.*?)\*/g, type: 'italic' },
      { regex: /^- (.*$)/gm, type: 'list' },
      { regex: /^\d+\. (.*$)/gm, type: 'orderedList' }
    ];
    
    // Find all matches
    const allMatches = [];
    patterns.forEach(({ regex, type }) => {
      let match;
      const regexCopy = new RegExp(regex.source, regex.flags);
      while ((match = regexCopy.exec(text)) !== null) {
        allMatches.push({
          type,
          content: match[1] || match[0],
          start: match.index,
          end: match.index + match[0].length,
          fullMatch: match[0]
        });
      }
    });
    
    // Sort matches by position
    allMatches.sort((a, b) => a.start - b.start);
    
    // Remove overlapping matches (keep the first one)
    const filteredMatches = [];
    let lastEnd = 0;
    allMatches.forEach(match => {
      if (match.start >= lastEnd) {
        filteredMatches.push(match);
        lastEnd = match.end;
      }
    });
    
    // Build parts array
    filteredMatches.forEach(match => {
      // Add text before the match
      if (match.start > currentIndex) {
        const beforeText = text.substring(currentIndex, match.start);
        if (beforeText.trim()) {
          parts.push({
            text: beforeText,
            type: 'text'
          });
        }
      }
      
      // Add the match
      parts.push({
        text: match.content,
        type: match.type
      });
      
      currentIndex = match.end;
    });
    
    // Add remaining text
    if (currentIndex < text.length) {
      const remainingText = text.substring(currentIndex);
      if (remainingText.trim()) {
        parts.push({
          text: remainingText,
          type: 'text'
        });
      }
    }
    
    // If no matches found, return the original text
    if (parts.length === 0) {
      parts.push({ text, type: 'text' });
    }
    
    return parts;
  };
  
  const parsedParts = parseMarkdown(children);
  
  const renderPart = (part, index) => {
    const baseStyle = { ...style };
    
    switch (part.type) {
      case 'h1':
        return (
          <Text key={index} style={[baseStyle, { 
            fontSize: (baseStyle.fontSize || 14) * 1.8, 
            fontWeight: '800', 
            marginTop: 16, 
            marginBottom: 8,
            color: colors.text
          }]}>
            {part.text}
          </Text>
        );
      case 'h2':
        return (
          <Text key={index} style={[baseStyle, { 
            fontSize: (baseStyle.fontSize || 14) * 1.5, 
            fontWeight: '700', 
            marginTop: 14, 
            marginBottom: 6,
            color: colors.text
          }]}>
            {part.text}
          </Text>
        );
      case 'h3':
        return (
          <Text key={index} style={[baseStyle, { 
            fontSize: (baseStyle.fontSize || 14) * 1.3, 
            fontWeight: '600', 
            marginTop: 12, 
            marginBottom: 4,
            color: colors.text
          }]}>
            {part.text}
          </Text>
        );
      case 'bold':
        return (
          <Text key={index} style={[baseStyle, { fontWeight: 'bold' }]}>
            {part.text}
          </Text>
        );
      case 'italic':
        return (
          <Text key={index} style={[baseStyle, { fontStyle: 'italic' }]}>
            {part.text}
          </Text>
        );
      case 'list':
        return (
          <View key={index} style={{ flexDirection: 'row', marginVertical: 2 }}>
            <Text style={[baseStyle, { marginRight: 8 }]}>•</Text>
            <View style={{ flex: 1 }}>
              <MarkdownText style={baseStyle}>{part.text}</MarkdownText>
            </View>
          </View>
        );
      case 'orderedList':
        return (
          <View key={index} style={{ flexDirection: 'row', marginVertical: 2 }}>
            <Text style={[baseStyle, { marginRight: 8, fontWeight: 'bold' }]}>
              {part.text.match(/^\d+\./)?.[0] || '•'}
            </Text>
            <View style={{ flex: 1 }}>
              <MarkdownText style={baseStyle}>
                {part.text.replace(/^\d+\.\s*/, '')}
              </MarkdownText>
            </View>
          </View>
        );
      default:
        return (
          <Text key={index} style={baseStyle}>
            {part.text}
          </Text>
        );
    }
  };
  
  return (
    <View>
      {parsedParts.map((part, index) => renderPart(part, index))}
    </View>
  );
}
