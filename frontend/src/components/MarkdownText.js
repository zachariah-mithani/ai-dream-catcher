import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function MarkdownText({ children, style, selectable = true }) {
  const { colors } = useTheme();
  
  if (!children) return null;

  // Render inline bold/italic inside a single line
  const renderInline = (text, keyBase, baseStyle) => {
    const nodes = [];
    let remaining = text;
    let idx = 0;
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let match;
    while ((match = regex.exec(remaining)) !== null) {
      const before = remaining.slice(0, match.index);
      if (before) nodes.push(<Text key={`${keyBase}-t${idx++}`} style={baseStyle} selectable={selectable}>{before}</Text>);
      const token = match[0];
      const isBold = token.startsWith('**');
      const content = token.replace(/^\*\*|\*\*$/g, '').replace(/^\*|\*$/g, '');
      nodes.push(
        <Text key={`${keyBase}-m${idx++}`} style={[baseStyle, isBold ? { fontWeight: '700' } : { fontStyle: 'italic' }]} selectable={selectable}>
          {content}
        </Text>
      );
      remaining = remaining.slice(match.index + token.length);
      regex.lastIndex = 0;
    }
    if (remaining) nodes.push(<Text key={`${keyBase}-t${idx++}`} style={baseStyle} selectable={selectable}>{remaining}</Text>);
    return nodes;
  };

  // Pre-normalize: ensure a newline before headings or list markers if they follow text without a break (e.g., "...better:### heading")
  const normalized = String(children)
    .replace(/\r\n/g, '\n')
    .replace(/([^.\n])(#\s)/g, '$1\n$2')
    .replace(/([^\n])(\n?)([-*]|\d+\.)\s/g, (m, a, b, c) => `${a}\n${c} `);
  const lines = normalized.split('\n');
  const content = [];
  const baseStyle = { ...style, color: colors.text };
  let paragraphBuffer = [];

  const flushParagraph = (key) => {
    if (paragraphBuffer.length === 0) return;
    const text = paragraphBuffer.join(' ');
    content.push(
      <Text key={`p-${key}`} style={[baseStyle, { lineHeight: (baseStyle.fontSize || 14) * 1.4, marginBottom: 8 }]}>
        {renderInline(text, `pi-${key}`, baseStyle)}
      </Text>
    );
    paragraphBuffer = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    // Blank line separates paragraphs
    if (line.trim() === '') {
      flushParagraph(i);
      return;
    }

    // Headings
    const hMatch = line.match(/^(###|##|#)\s+(.*)$/);
    if (hMatch) {
      flushParagraph(i);
      const level = hMatch[1].length;
      const text = hMatch[2];
      const sizes = { 1: 1.8, 2: 1.5, 3: 1.3 };
      const weights = { 1: '800', 2: '700', 3: '600' };
      content.push(
        <Text key={`h-${i}`} style={[baseStyle, { fontSize: (baseStyle.fontSize || 14) * sizes[level], fontWeight: weights[level], marginTop: 12, marginBottom: 6 }]} selectable={selectable}>
          {text}
        </Text>
      );
      return;
    }

  // Unordered list
    const ulMatch = line.match(/^(\s*)([-*])\s+(.*)$/);
    if (ulMatch) {
      flushParagraph(i);
      const indent = ulMatch[1] || '';
      const level = Math.min(3, Math.floor(indent.length / 2));
      const item = ulMatch[3];
    content.push(
      <Text key={`ul-${i}`} style={baseStyle} selectable={selectable}>
        {`${'  '.repeat(level)}• `}
        {renderInline(item, `uli-${i}`, baseStyle)}
      </Text>
    );
      return;
    }

  // Ordered list
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (olMatch) {
      flushParagraph(i);
      const indent = olMatch[1] || '';
      const level = Math.min(3, Math.floor(indent.length / 2));
      const num = olMatch[2];
      const item = olMatch[3];
    content.push(
      <Text key={`ol-${i}`} style={baseStyle} selectable={selectable}>
        {`${'  '.repeat(level)}${num}. `}
        {renderInline(item, `oli-${i}`, baseStyle)}
      </Text>
    );
      return;
    }

    // Default: add to paragraph buffer
    paragraphBuffer.push(line);
  });

  flushParagraph('end');

  // Wrap in a parent Text so iOS selection flows across lines
  return (
    <Text selectable={selectable} style={baseStyle}>
      {content}
    </Text>
  );
}
