/** @param {NS} ns */
export async function main(ns) {
  let host = ns.getHostname();
  let reserve = 10;
  let ram = ns.getServerMaxRam(host)-ns.getServerUsedRam(host)-reserve;
  let t = Math.floor(ram/ns.getScriptRam('share.js'));
  ns.run('share.js', t);
}