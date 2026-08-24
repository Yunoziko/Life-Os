import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code key={`${keyPrefix}-c-${i}`} className="rounded-md bg-muted px-1 py-0.5 font-mono text-[0.8em]">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={`${keyPrefix}-b-${i}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={`${keyPrefix}-i-${i}`}>{token.slice(1, -1)}</em>);
    } else {
      const link = token.match(/^\[([^\]]+)\]\((https?:[^)]+)\)$/);
      if (link) {
        nodes.push(
          <a
            key={`${keyPrefix}-a-${i}`}
            href={link[2]}
            className="underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            {link[1]}
          </a>
        );
      } else {
        nodes.push(token);
      }
    }
    i += 1;
    last = match.index + token.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function AIMarkdown({ content, className }: { content: string; className?: string }) {
  const blocks = content.split(/```/);

  return (
    <div className={cn("space-y-3 text-sm leading-6", className)}>
      {blocks.map((block, index) => {
        if (index % 2 === 1) {
          const newline = block.indexOf("\n");
          const language = newline === -1 ? "" : block.slice(0, newline).trim();
          const code = newline === -1 ? block : block.slice(newline + 1);
          return (
            <pre
              key={`code-${index}`}
              className="overflow-x-auto rounded-xl bg-muted/80 p-3 font-mono text-[13px] leading-5 text-foreground"
            >
              <code data-language={language || undefined}>{code.replace(/\n$/, "")}</code>
            </pre>
          );
        }

        const paragraphs = block.split(/\n{2,}/);
        return paragraphs.map((paragraph, pIndex) => {
          const lines = paragraph.split("\n");
          const heading = lines[0]?.match(/^(#{1,3})\s+(.*)$/);
          if (heading && lines.length === 1) {
            const Tag = heading[1].length === 1 ? "h3" : "h4";
            return (
              <Tag key={`h-${index}-${pIndex}`} className="font-medium tracking-tight text-foreground">
                {inline(heading[2], `h-${index}-${pIndex}`)}
              </Tag>
            );
          }

          const isList = lines.every((line) => /^\s*([-*]|\d+\.)\s+/.test(line));
          if (isList && lines.some(Boolean)) {
            return (
              <ul key={`ul-${index}-${pIndex}`} className="list-disc space-y-1 pl-4">
                {lines.map((line, lIndex) => (
                  <li key={lIndex}>{inline(line.replace(/^\s*([-*]|\d+\.)\s+/, ""), `li-${index}-${pIndex}-${lIndex}`)}</li>
                ))}
              </ul>
            );
          }

          if (!paragraph.trim()) return null;
          return (
            <p key={`p-${index}-${pIndex}`} className="whitespace-pre-wrap">
              {inline(paragraph, `p-${index}-${pIndex}`)}
            </p>
          );
        });
      })}
    </div>
  );
}
