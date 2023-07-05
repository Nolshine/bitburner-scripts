/** @param {NS} ns */
import { traverse } from 'util.js';

export async function main(ns) {
  // let rooted = crack(ns, traverse(ns));
  // ns.tprint(rooted);
  crack(ns, traverse(ns));
}

function crack(ns, servers) {
  // root all possible servers and return an array of ones which
  // have successfully been rooted, not including home or player-
  // bought servers.
  let warnings = [];

  let cracks = [
    ["BruteSSH.exe", ns.brutessh],
    ["FTPCrack.exe", ns.ftpcrack],
    ["relaySMTP.exe", ns.relaysmtp],
    ["HTTPWorm.exe", ns.httpworm],
    ["SQLInject.exe", ns.sqlinject],
  ];

  for (const server of servers) {
    if (server === 'home' || server.includes('pserv')) {
      // the home pc and bought servers will already be rooted
      continue;
    }
    let ports_opened = 0;
    let ports_needed = ns.getServerNumPortsRequired(server);
    if (ports_needed === 0) {
      ns.nuke(server);
      continue;
    }
    for (const crack of cracks) {
      if (ns.fileExists(crack[0], 'home')) {
        crack[1](server);
        ports_opened++;
      } else {
        if (!warnings.includes(crack[0])) {
          ns.tprint(`WARNING: ${crack[0]} doesn't exist, and can't be used to open ports.`);
          warnings.push(crack[0]);
        }
      }
      if (ports_opened === ports_needed) {
        ns.nuke(server);
        continue;
      }
    }
  }

  // return only rooted machines
  let result = servers.filter(server =>
    ns.hasRootAccess(server) == true);
  return result;
}