// TODO: update to use `traverse` from util.js

/** @param {NS} ns */
export async function main(ns) {
  let player = ns.getPlayer();
  let title = `Optimal targets est. at hacking level ${player.skills.hacking}:`
  ns.tprint(title);
  ns.tprint("=".repeat(title.length));
  traverse(ns);
}

function traverse(ns) {
  let visited = ['home'];
  let nodes = ns.scan('home');
  let result = [];

  while (nodes.length > 0) {
    let node = nodes.pop();
    if (visited.includes(node)){
      continue;
    }
    nodes = nodes.concat(ns.scan(node));
    visited.push(node);
  }

  result = visited.filter((target) => {
    let hackLevelDivisor = ns.fileExists('Formulas.exe') ? 1 : 2;
    if (
      target === 'home' ||
      ns.getServerMaxMoney(target) === 0 ||
      !ns.hasRootAccess(target) ||
      ns.getHackingLevel()/hackLevelDivisor < ns.getServerRequiredHackingLevel(target)
    ) {
      return false;
    }
    return true;
  })

  for (const target of sortTargets(ns, result)){
    ns.tprint(`${target} : ${isPrepped(ns, target) ? 'Prepped' : 'Not Prepped'}`);
  }
}


function isPrepped(ns, target){
  let sv = ns.getServer(target);
  return ((sv.moneyAvailable >= sv.moneyMax) && (sv.hackDifficulty <= sv.minDifficulty));
}

/** @param {NS} ns */
function sortTargets(ns, targets){
  // sort valuable targets in order of descending potential value
  targets.sort((a, b) => {
    let sv_a = ns.getServer(a);
    let sv_b = ns.getServer(b);
    let metric_a;
    let metric_b;
    
    if (ns.fileExists('Formulas.exe', 'home')){
      let player = ns.getPlayer();
      sv_a.hackDifficulty = sv_a.minDifficulty;
      sv_b.hackDifficulty = sv_b.minDifficulty;
      let weak_time_a = ns.formulas.hacking.weakenTime(sv_a, player);
      let weak_time_b = ns.formulas.hacking.weakenTime(sv_b, player);
      let hack_chance_a = ns.formulas.hacking.hackChance(sv_a, player);
      let hack_chance_b = ns.formulas.hacking.hackChance(sv_b, player);
      metric_a = hack_chance_a*sv_a.moneyMax/weak_time_a;
      metric_b = hack_chance_b*sv_b.moneyMax/weak_time_b;
    } else {
      metric_a = sv_a.moneyMax/sv_a.minDifficulty;
      metric_b = sv_b.moneyMax/sv_b.minDifficulty;
    }
    
    if (metric_a > metric_b){
      return -1;
    }
    if (metric_b > metric_a){
      return 1;
    }
    return 0;
  })

  return targets;
}