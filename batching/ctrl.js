// proto-batch controller.
// synchronize a single cycle of HWGW

/** @param {NS} ns */
export async function main(ns) {
  // TODO put all variable declarations at the top for readability
  
  let port = ns.getPortHandle(ns.pid);
  let target = ns.args[0];
  let theft_percent = ns.args[1] ? ns.args[1] : 0.1;
  let max_cash = ns.getServerMaxMoney(target);
  let hack_amount = max_cash * theft_percent;

  if (!validateTarget(ns, target)) return;

  port.clear();

  while (true){
    if(!isPrepped(ns, target)) {
      ns.tprint(`WARN: ${target} is not in prepped state.`);
      await prepTarget(ns, target);
      continue;
    };
    let t_hack = Math.floor(ns.hackAnalyzeThreads(target, hack_amount));
    let hack_percent = t_hack * ns.hackAnalyze(target);
    let t_grow;
    let post_hack_amount = max_cash * (1-hack_percent);
    if (ns.fileExists('Formulas.exe', 'home')){
      let mock = ns.getServer(target);
      mock.moneyAvailable = post_hack_amount;
      t_grow = Math.ceil(ns.formulas.hacking.growThreads(mock, ns.getPlayer(), max_cash))
    }
    else {
      let factor = max_cash / post_hack_amount;
      t_grow = Math.ceil(ns.growthAnalyze(target, factor));
    }
    let tw_hack = Math.ceil(t_hack/25); // # of weaken threads for hack task
    let tw_grow = Math.ceil(t_grow/12.5); // # of weaken threads for grow task
    ns.print(`
    Theft %: ${theft_percent*100}%
    Hack threads required: ${t_hack}
    Grow threads required: ${t_grow}
    Weaken threads for hack: ${tw_hack}
    Weaken threads for grow: ${tw_grow}`);

    let servers = getServers(ns);
    let hack_sv;
    let grow_sv;
    let weak1_sv;
    let weak2_sv;
    hack_sv = findRam(t_hack, servers);
    weak1_sv = findRam(tw_hack, servers);
    grow_sv = findRam(t_grow, servers);
    weak2_sv = findRam(tw_grow, servers);

    // make sure we found room for all tasks
    if (!hack_sv || !grow_sv || !weak1_sv || !weak2_sv){
      ns.tprint("WARN: Not enough available RAM on the network for all tasks.");
      await ns.sleep(600000);
      continue;
    }

    // synchronization
    let spacer = 20 //20ms spacing
    let hack_time = ns.getHackTime(target);
    let grow_time = hack_time * 3.2;
    let weak_time = hack_time * 4;
    let now = Date.now()
    let weak2_end = now + weak_time + (spacer*3);
    let grow_end = weak2_end - spacer;
    let weak1_end = grow_end - spacer;
    let hack_end = weak1_end - spacer;
    
    // make sure the worker scripts are available on the hosts
    ns.scp('hack.js', hack_sv, 'home');
    ns.scp('weak.js', weak1_sv, 'home');
    ns.scp('grow.js', grow_sv, 'home');
    ns.scp('weak.js', weak2_sv, 'home');
    // TODO: maybe just have a different tool propagate all the worker
    // scripts to every server on the network or something for
    // convenience?
    let hack_job = JSON.stringify(getJob(ns, target, hack_time, hack_end, 'hack'));
    ns.exec('hack.js', hack_sv, t_hack, hack_job);
    let weak1_job = JSON.stringify(getJob(ns, target, weak_time, weak1_end, 'weak1'));
    ns.exec('weak.js', weak1_sv, tw_hack, weak1_job);
    let grow_job = JSON.stringify(getJob(ns, target, grow_time, grow_end, 'grow'));
    ns.exec('grow.js', grow_sv, t_grow, grow_job);
    let weak2_job = JSON.stringify(getJob(ns, target, weak_time, weak2_end, 'weak2'));
    ns.exec('weak.js', weak2_sv, tw_grow, weak2_job);

    await port.nextWrite();
    port.read();
    
    ns.print(`
    target server status:
    Server: ${target}
    Prepped: ${validateTarget(ns, target)}`);
  }
  
}

/** @param {NS} ns */
function getJob(ns, target, time, end, type){
  return {
    port: ns.pid,
    target: target,
    time: time,
    end: end,
    type: type,
  };
}

/** @param {NS} ns */
function validateTarget(ns, target) {
  // make sure the target can have money and has been prepped.
  let sv = ns.getServer(target);
  if (!ns.serverExists(target) || sv.moneyMax <= 0 || !sv.hasAdminRights){
    // invalid target
    ns.tprint(`ERROR: ${target} is not a valid target.`);
    return false;
  }
  return true;
}

/** @param {NS} ns */
function isPrepped(ns, target){
  let sv = ns.getServer(target);
  return (
    sv.moneyAvailable === sv.moneyMax &&
    sv.hackDifficulty === sv.minDifficulty
    );
}

/** @param {NS} ns */
async function prepTarget(ns, target) {
  let standby = false;
  while (true) {
    if (standby) {
      standby = !standby;
      await ns.sleep(1000);
    }

    let time = ns.getWeakenTime(target);
    let target_state = ns.getServer(target);

    if (target_state.hackDifficulty > target_state.minDifficulty){
      let t = Math.ceil((target_state.hackDifficulty - target_state.minDifficulty)/0.05);
      let sv = findRam(t, getServers(ns));
      if (!sv) {
        standby = true;
        continue;
      }
      let job = JSON.stringify(getJob(ns, target, time, Date.now()+time, 'weak'));
      await ns.sleep(time + 100);
      ns.exec('weak.js', sv, t, job);
    } else if (target_state.moneyAvailable < target_state.moneyMax) {
      let mult = target_state.moneyMax / target_state.moneyAvailable;
      let tg = Math.ceil(ns.growthAnalyze(target, mult));
      let tw = Math.ceil(tg/12.5);
      let network = getServers(ns);
      let grow_sv = findRam(tg, network);
      let weak_sv = findRam(tw, network);
      if (!grow_sv || !weak_sv) {
        standby = true;
        continue;
      }
      let grow_time = ns.getGrowTime(target);
      let grow_job = JSON.stringify(getJob(ns, target, grow_time, Date.now() + grow_time, 'grow'));
      let weak_time = ns.getWeakenTime(target);
      let weak_job = JSON.stringify(getJob(ns, target, weak_time, Date.now()+weak_time, 'weak'));
      ns.exec('grow.js', grow_sv, tg, grow_job);
      ns.exec('weak.js', weak_sv, tw, weak_job);
      await ns.sleep(weak_time + 100);
    } else {
      // target is prepped
      return;
    }
  }
}

/** @param {NS} ns */
function getServers(ns){
  // return an array of servers and threads available on them
  // traverse first
  let visited = ['home'];
  let nodes = ns.scan('home');
  while (nodes.length > 0) {
    let node = nodes.pop();
    if (visited.includes(node)){
      continue;
    }
    nodes = nodes.concat(ns.scan(node));
    visited.push(node);
  }
  let valid = visited.filter((sv) => ns.getServerMaxRam(sv) > 0 &&
  ns.hasRootAccess(sv) === true);
  let result = [];
  let per_script_ram = ns.getScriptRam('weak.js', 'home');
  for (const sv of valid) {
    let sv_pair = [sv];
    let ram = ns.getServerMaxRam(sv);
    if (sv === 'home') {
      ram -= Math.max(8, ram*0.2);
    }
    ram = ram-ns.getServerUsedRam(sv);
    let t = Math.floor(ram/per_script_ram);
    sv_pair.push(t);
    if (t > 0) {
      result.push(sv_pair);
    }
  }
  return result;
}

function findRam(t_needed, servers) {
  let sv;
  for (const pair of servers) {
    if (pair[1] >= t_needed){
      sv = pair[0];
      pair[1] -= t_needed;
      break;
    }
  }
  return sv;
}