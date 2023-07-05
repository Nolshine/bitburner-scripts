/** @param {NS} ns */

// scp toolset to target server
export async function main(ns) {
  let pservs = [];
  for (let i = 0; i < 25; i++){
    let sv = "pserv-" + i;
    if (ns.serverExists(sv)){
      pservs.push(sv);
    }
  }

  let scripts = ns.ls('home', '.js');

  for (const sv of pservs) {
    ns.scp(scripts, sv, 'home');
    ns.tprint(`Files on ${sv}: ${ns.ls(sv)}`);
  }
}