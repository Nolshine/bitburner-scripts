/** @param {NS} ns */
export async function main(ns) {
  ns.tprint("This is just a library~");
  ns.tprint(traverse(ns));
}

export function traverse(ns, visited=[], node='home'){
  if (visited.includes(node)) return;
  visited.push(node);
  const nodes = ns.scan(node);
  if (node !== 'home') nodes.shift();
  for (const node of nodes) traverse(ns, visited, node);
  return visited;
} 