import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain } from "lucide-react";
import { useAgents } from "@/lib/api";
import { WidgetIcon } from "./shared";

export function PrimaryModelCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data: agents } = useAgents();
  
  const displayAgents = mounted ? (agents || []) : [];
  const defaultAgent = displayAgents.find(a => a.isDefault);
  const model = defaultAgent?.model || "unknown";
  const agentName = defaultAgent?.name || "main";
  
  // Format model name for display (e.g., "openai-codex/gpt-5.3-codex" -> "GPT-5.3 Codex")
  const displayModel = model
    .replace(/^openai-codex\//, "")
    .replace(/^anthropic\//, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase());

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium">
              <Link href="/agents" className="hover:underline">
                Primary Model
              </Link>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Agent: {agentName}
            </p>
          </div>
          <WidgetIcon icon={Brain} />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {!defaultAgent ? (
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        ) : (
          <>
            <p className="text-base font-medium truncate" title={model}>
              {displayModel}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono truncate">
              {model}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
