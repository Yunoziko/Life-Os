"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { appCommands } from "@/lib/commands/registry";
import { useWorkspace } from "@/components/workspace-provider";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

const groups = ["Create", "Search", "Navigate"] as const;

export function CommandPalette() {
  const router = useRouter();
  const { commandOpen, setCommandOpen, setSearchOpen, openCreate } = useWorkspace();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCommandOpen(!commandOpen);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandOpen, setCommandOpen]);

  return (
    <CommandDialog
      open={commandOpen}
      onOpenChange={setCommandOpen}
      title="Command palette"
      description="Create, search, or jump to a page."
    >
      <CommandInput placeholder="Type a command…" />
      <CommandList>
        <CommandEmpty>No matching commands.</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group} heading={group}>
            {appCommands
              .filter((command) => command.group === group)
              .map((command) => {
                const Icon = command.icon;
                return (
                  <CommandItem
                    key={command.id}
                    value={`${command.label} ${command.keywords.join(" ")}`}
                    onSelect={() => {
                      if (command.action.kind === "create") {
                        openCreate(command.action.type);
                        return;
                      }
                      if (command.action.kind === "search") {
                        setCommandOpen(false);
                        setSearchOpen(true);
                        return;
                      }
                      setCommandOpen(false);
                      router.push(command.action.href);
                    }}
                  >
                    <Icon />
                    {command.label}
                    {command.shortcut ? <CommandShortcut>{command.shortcut}</CommandShortcut> : null}
                  </CommandItem>
                );
              })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
