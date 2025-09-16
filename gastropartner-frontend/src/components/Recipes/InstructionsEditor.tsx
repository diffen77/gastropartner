import React from 'react';

interface InstructionsEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function InstructionsEditor({ value, onChange, placeholder }: InstructionsEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={8}
      style={{
        width: '100%',
        padding: '12px',
        border: '1px solid var(--color-neutral-300)',
        borderRadius: '6px',
        fontSize: '14px',
        fontFamily: 'inherit',
        resize: 'vertical',
        minHeight: '120px'
      }}
    />
  );
}