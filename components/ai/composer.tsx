"use client";

import { useEffect, useRef } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function AIComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Ask AZIO…",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
  }, [value]);

  return (
    <form
      className="rounded-2xl border border-border/80 bg-background p-2 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        if (!value.trim() || disabled) return;
        onSubmit();
      }}
    >
      <Textarea
        ref={ref}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className="min-h-11 resize-none border-0 bg-transparent px-3 py-2 shadow-none focus-visible:ring-0 dark:bg-transparent"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (!value.trim() || disabled) return;
            onSubmit();
          }
        }}
      />
      <div className="flex items-center justify-between px-1 pb-0.5">
        <p className="px-2 text-[11px] text-muted-foreground">Enter to send · Shift+Enter for a new line</p>
        <Button type="submit" size="icon-sm" disabled={disabled || !value.trim()} aria-label="Send">
          <ArrowUp />
        </Button>
      </div>
    </form>
  );
}
