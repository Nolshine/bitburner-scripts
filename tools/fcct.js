import {traverse} from 'util.js';

// find servers on the network holding .cct files
// return list of servers and files they have that fit the bill
/** @param {NS} ns */
export async function main(ns) {
  let servers = traverse(ns);
  result = locateContracts(ns, servers);
  ns.tprint(result);
}

export function locateContracts(ns, servers) {
  let result = servers.filter((sv) => {
    let files = ns.ls(sv, '.cct');
    if (files.length > 0){
      return true;
    }
    return false;
  });
  return result;
}