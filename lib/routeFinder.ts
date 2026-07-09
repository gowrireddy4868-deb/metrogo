export interface LineLike {
  id: string;
  name: string;
  colorHex: string;
  stations: { stationId: string; sequence: number }[];
}

interface Graph {
  [stationId: string]: { to: string; lineId: string }[];
}

function buildGraph(lines: LineLike[]): Graph {
  const graph: Graph = {};
  for (const line of lines) {
    const ordered = [...line.stations].sort((a, b) => a.sequence - b.sequence);
    for (let i = 0; i < ordered.length - 1; i++) {
      const a = ordered[i].stationId;
      const b = ordered[i + 1].stationId;
      graph[a] = graph[a] || [];
      graph[b] = graph[b] || [];
      graph[a].push({ to: b, lineId: line.id });
      graph[b].push({ to: a, lineId: line.id });
    }
  }
  return graph;
}

export interface RouteResult {
  stationIds: string[];
  lineSegments: { lineId: string; lineName: string; colorHex: string; stationIds: string[] }[];
  interchanges: string[];
  stopCount: number;
}

export function findRoute(lines: LineLike[], fromId: string, toId: string): RouteResult | null {
  if (fromId === toId) {
    return { stationIds: [fromId], lineSegments: [], interchanges: [], stopCount: 0 };
  }
  const graph = buildGraph(lines);
  const visited = new Set<string>([fromId]);
  const prev: Record<string, { from: string; lineId: string }> = {};
  const queue: string[] = [fromId];

  while (queue.length) {
    const current = queue.shift()!;
    if (current === toId) break;
    for (const edge of graph[current] || []) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        prev[edge.to] = { from: current, lineId: edge.lineId };
        queue.push(edge.to);
      }
    }
  }

  if (!visited.has(toId)) return null;

  const pathStations: string[] = [toId];
  const pathLines: string[] = [];
  let cur = toId;
  while (cur !== fromId) {
    const p = prev[cur];
    pathLines.unshift(p.lineId);
    pathStations.unshift(p.from);
    cur = p.from;
  }

  const lineSegments: RouteResult["lineSegments"] = [];
  const interchanges: string[] = [];
  let segStart = 0;
  for (let i = 0; i < pathLines.length; i++) {
    const isLast = i === pathLines.length - 1;
    if (isLast || pathLines[i + 1] !== pathLines[i]) {
      const line = lines.find((l) => l.id === pathLines[i])!;
      const segStations = pathStations.slice(segStart, i + 2);
      lineSegments.push({
        lineId: line.id,
        lineName: line.name,
        colorHex: line.colorHex,
        stationIds: segStations,
      });
      if (!isLast) interchanges.push(pathStations[i + 1]);
      segStart = i + 1;
    }
  }

  return {
    stationIds: pathStations,
    lineSegments,
    interchanges,
    stopCount: pathStations.length - 1,
  };
}
