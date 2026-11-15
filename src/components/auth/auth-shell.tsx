import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <Card className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
        </div>
        {children}
      </Card>
      {footer ? <div className="mt-4 text-center text-sm">{footer}</div> : null}
    </div>
  );
}
