export interface Point {
  x: number;
  y: number;
}

type CmdType = "M" | "L" | "C" | "Q" | "Z";

interface Command {
  type: CmdType;
  absolute: boolean;
  args: number[];
}

/**
 * Parse SVG path `d` attribute menjadi daftar perintah.
 * Mendukung absolute & relative untuk M/L/C/Q/Z.
 */
export function parseSvgPath(d: string): Command[] {
  const commands: Command[] = [];
  const re = /([MmLlCcQqZz])([^MmLlCcQqZz]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) {
    const type = m[1];
    const numStr = m[2];
    const args = (numStr.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(Number);
    const upper = type.toUpperCase() as CmdType;
    if (upper === "Z") {
      commands.push({ type: "Z", absolute: true, args: [] });
      continue;
    }
    // Kelompokkan args sesuai arity perintah
    const arity = upper === "M" || upper === "L" ? 2 : upper === "Q" ? 4 : 6;
    for (let i = 0; i + arity <= args.length; i += arity) {
      commands.push({
        type: upper,
        absolute: type === upper,
        args: args.slice(i, i + arity),
      });
      // Setelah M pertama, M berikutnya (implicit) diperlakukan sebagai L
      // (dengan type M tetap — samplePathPoints menanganinya sebagai line)
    }
  }
  return commands;
}

function cubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  };
}

function quadPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

/**
 * Sample titik-titik dari SVG path d attribute.
 * Ambil titik dari setiap perintah M, L, C, Q; kurva di-sample tiap 1/sampleDensity.
 */
export function samplePathPoints(d: string, sampleDensity = 20): Point[] {
  const points: Point[] = [];
  const commands = parseSvgPath(d);
  let curX = 0;
  let curY = 0;
  let startX = 0;
  let startY = 0;

  for (const cmd of commands) {
    const [x1, y1, x2, y2, x3, y3] = cmd.args;
    const rel = (v: number, base: number) => (cmd.absolute ? v : base + v);

    switch (cmd.type) {
      case "M": {
        curX = rel(x1, curX);
        curY = rel(y1, curY);
        startX = curX;
        startY = curY;
        points.push({ x: curX, y: curY });
        break;
      }
      case "L": {
        curX = rel(x1, curX);
        curY = rel(y1, curY);
        points.push({ x: curX, y: curY });
        break;
      }
      case "C": {
        const p0 = { x: curX, y: curY };
        const p1 = { x: rel(x1, curX), y: rel(y1, curY) };
        const p2 = { x: rel(x2, curX), y: rel(y2, curY) };
        const p3 = { x: rel(x3, curX), y: rel(y3, curY) };
        for (let t = 1 / sampleDensity; t <= 1; t += 1 / sampleDensity) {
          points.push(cubicPoint(p0, p1, p2, p3, t));
        }
        curX = p3.x;
        curY = p3.y;
        break;
      }
      case "Q": {
        const p0 = { x: curX, y: curY };
        const p1 = { x: rel(x1, curX), y: rel(y1, curY) };
        const p2 = { x: rel(x2, curX), y: rel(y2, curY) };
        for (let t = 1 / sampleDensity; t <= 1; t += 1 / sampleDensity) {
          points.push(quadPoint(p0, p1, p2, t));
        }
        curX = p2.x;
        curY = p2.y;
        break;
      }
      case "Z": {
        curX = startX;
        curY = startY;
        break;
      }
    }
  }

  return points;
}
