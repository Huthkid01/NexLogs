/** Ambient types so Cursor/VS Code don't flag Deno edge files when the Deno LSP is warming up. */
declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  // deno-lint-ignore no-explicit-any
  export function createClient(...args: any[]): any;
}
