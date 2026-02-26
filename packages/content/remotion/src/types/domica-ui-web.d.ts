/**
 * Type declarations for @domica/ui-web components used in Remotion compositions.
 * Resolved via webpack alias in remotion.config.ts.
 */

declare module "@domica/ui-web" {
  import type { FC } from "react";

  export const DomicaWatermark: FC<{
    color?: "blue" | "white";
    opacity?: number;
  }>;

  export const Tag: FC<{
    children: React.ReactNode;
    variant?: "default" | "outline";
    className?: string;
  }>;
}
