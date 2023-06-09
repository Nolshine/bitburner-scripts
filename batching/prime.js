import {traverse} from 'util.js';

/** @param {NS} ns */
export async function main(ns) {
  let scripts = ns.ls('home', '.js');
  let servers = traverse(ns);
  for (const sv of servers){
    ns.scp(scripts, sv, 'home');
    crack(ns, sv);
  }
}

function crack(ns, sv){
  let cracks = [
    'BruteSSH.exe',
    'FTPCrack.exe',
    'relaySMTP.exe',
    'HTTPWorm.exe',
    'SQLInject.exe',
  ];
  let funcs = [
    ns.brutessh,
    ns.ftpcrack,
    ns.relaysmtp,
    ns.httpworm,
    ns.sqlinject,
  ];

  let ports = 0;
  for (let i = 0; i < 5; i++){
    if (ns.fileExists(cracks[i])){
      funcs[i](sv);
      ports++;
    }
  }
  if (ns.getServerNumPortsRequired(sv) <= ports) ns.nuke(sv);
}