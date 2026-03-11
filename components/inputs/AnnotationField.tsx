import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { ConfigField } from '../../types';

interface AnnotationFieldProps {
  field: ConfigField;
}

export const AnnotationField: React.FC<AnnotationFieldProps> = ({ field }) => {
  const content = String(field.defaultValue || field.value || '');

  if (!content) return null;

  return (
    <div
      className="prose prose-sm prose-invert max-w-none break-words text-xs text-muted-foreground prose-headings:my-1 prose-li:my-0 prose-p:my-0.5 prose-ul:my-0.5"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{content}</ReactMarkdown>
    </div>
  );
};
