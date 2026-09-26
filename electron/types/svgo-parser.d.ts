declare module "svgo/lib/parser.js" {
  export function parseSvg(data: string, from?: string): { type: string; children: Array<{ type: string; name?: string }> };
}
