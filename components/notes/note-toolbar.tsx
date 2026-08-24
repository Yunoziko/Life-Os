"use client";

import { Button } from "@/components/ui/button";

const actions = [
  { id: "h2", label: "H", title: "Heading", before: "## ", after: "" },
  { id: "bold", label: "B", title: "Bold", before: "**", after: "**" },
  { id: "italic", label: "I", title: "Italic", before: "_", after: "_" },
  { id: "quote", label: "“", title: "Quote", before: "> ", after: "" },
  { id: "ul", label: "•", title: "Bullet list", before: "- ", after: "" },
  { id: "ol", label: "1.", title: "Numbered list", before: "1. ", after: "" },
  { id: "code", label: "</>", title: "Code block", before: "```\n", after: "\n```" },
  { id: "link", label: "↗", title: "Link", before: "[", after: "](https://)" },
] as const;

export function NoteToolbar({
  textareaRef,
  onChange,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
}) {
  function wrap(before: string, after: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selected = value.slice(start, end) || "text";
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + before.length + selected.length + after.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Formatting">
      {actions.map((action) => (
        <Button
          key={action.id}
          type="button"
          size="sm"
          variant="ghost"
          title={action.title}
          aria-label={action.title}
          onClick={() => wrap(action.before, action.after)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
