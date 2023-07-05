import { traverse } from 'util.js';

/** @param {NS} ns */
export async function main(ns) {
  const TYPES = ['hack', 'weak1', 'grow', 'weak2'];
  const SCRIPTS = ['hack.js', 'weak.js', 'grow.js', 'weak.js'];
  ns.disableLog('ALL');
  const target = ns.args[0];
  let ramNet = getRamNet(ns);
  let port = ns.getPortHandle(ns.pid);
  let maxBatches = 30000;
  port.clear();
  if (!validateTarget(ns, target)) ns.exit();
  await prepTarget(ns, target, ramNet, port);
  let runFlags = ns.flags([
    ['greed', ns.hackAnalyze(target)], // default to a single hack thread's worth
  ]);
  const greed = runFlags.greed; // TODO automatic optimisation of greed level
  ns.print(`Greed level is set to ${greed*100}%.)`);

  while (true) {
    ramNet.update();

    if (!isPrepped(ns, target)) {
      ns.print(`WARN: ${target} is not in a prepped state.`);
      await prepTarget(ns, target, ramNet, port);
      ramNet.update();
      await ns.sleep(5000) // maybe this works??
    }

    let hackTime = ns.getHackTime(target);
    let growTime = hackTime * 3.2;
    let weakenTime = hackTime * 4;
    let timings = [hackTime, weakenTime, growTime, weakenTime];
    let ends = [0, 5, 10, 15];

    // work out the thread calcs based on the greed
    let threads = calcThreads(ns, target, greed);
    let totalThreads = threads.reduce((a, b) => a + b, 0);
    // work out how many times the batch can fit in the network
    // TODO: This is probably error prone, need a better method for deciding the limit.
    // let batchLimit = 30;
    let batchLimit = Math.min(maxBatches, Math.ceil((ramNet.totalSize / 1.75) / totalThreads));
    ns.print(`Attempting ${batchLimit} batches.`)
    // divvy up ram and scheduling for tasks
    let tasks = [];
    let batchNumber = 1;
    let abort = false;
    ns.print('Creating schedule...');
    while (batchNumber <= batchLimit) {
      let currentBatch = [];
      for (let i = 0; i < 4; i++) {
        let task = {
          target: target,
          batchNumber: batchNumber,
          type: TYPES[i],
          script: SCRIPTS[i],
          threads: threads[i],
          host: ramNet.findHost(threads[i], SCRIPTS[i]),
          time: timings[i],
          end: ends[i],
        };
        if (!task.host) {
          ns.print(`Batch #${batchNumber} failed to find RAM, aborting distribution.`);
          ns.print(`=========================`);
          ns.print(`Failed Task:`);
          Object.keys(task).forEach((key) => ns.print(`  | ${key}: ${task[key]}`));
          ns.print(`  | Required RAM: ${ns.formatRam(ns.getScriptRam(task.script)*task.threads)}`);
          abort = true;
          break; // breaks the for loop
        }
        if (!ns.fileExists(SCRIPTS[i], task.host))
          ns.scp(SCRIPTS[i], task.host, 'home');
        currentBatch.push(task);
      }
      if (abort) {
        batchLimit = batchNumber - 1; // make sure tasks know the limit has changed.
        break; // breaks out of while loop without adding latest batch
      }
      tasks.push(...currentBatch);
      batchNumber++;
      if (batchNumber % 1000 === 0) {
        await ns.sleep(1);
      }
      // await ns.sleep(1);
    }
    if (tasks.length === 0) {
      ns.print("ERROR: Could not schedule any jobs!");
      ns.exit(); // ungraceful crash to the rescue /s
    }
    ns.print("Launching...")
    // and now to actually launch said tasks.
    let counter = 0;
    for (const task of tasks) {
      let job = JSON.stringify({
        target: task.target,
        batchNumber: task.batchNumber,
        batchLimit: batchLimit,
        type: task.type,
        time: task.time,
        end: Date.now() + weakenTime + task.end + task.batchNumber,
        port: ns.pid,
      });
      ns.exec(task.script, task.host, task.threads, job);
      counter++;
      if (counter % 1000 === 0) await ns.sleep(1);
    }

    await port.nextWrite();
    port.read();
    await ns.sleep(2000); //safety margin
  }
}

/**
 * Confirms that a target is valid for attack.
 * That means it can have money, and is rooted.
 * 
 * @param {NS} ns The NS interface.
 * @param {string} target The target to validate.
 * @return {boolean} Whether the target is valid.
 */
function validateTarget(ns, target) {
  if (!ns.serverExists(target)) {
    ns.tprint(`ERROR: ${target} doesn't exist!`);
    return false;
  }
  let hasMoney = ns.getServerMaxMoney(target) > 0;
  let hasRoot = ns.hasRootAccess(target);
  if (!hasMoney) {
    ns.tprint(`ERROR: ${target} should be a growable server, but cannot have money.`);
  } else if (!hasRoot) {
    ns.tprint(`ERROR: ${target} should be rooted and isn't.`);
  }
  return hasMoney && hasRoot;
}

/** @param {NS} ns */
function isPrepped(ns, target) {
  return (
    ns.getServerMoneyAvailable(target) >= ns.getServerMaxMoney(target) &&
    ns.getServerSecurityLevel(target) <= ns.getServerMinSecurityLevel(target)
  );
}

/** @param {NS} ns */
async function prepTarget(ns, target, ramNet, port) {
  ns.print(`Prepping ${target}.`)
  port.clear();
  let minSec = ns.getServerMinSecurityLevel(target);
  let maxMoney = ns.getServerMaxMoney(target);

  while (ns.getServerSecurityLevel(target) > minSec) {
    ramNet.update();
    let weakenTime = ns.getWeakenTime(target);
    let scriptRam = Math.max(ns.getScriptRam('weak.js'), ns.getScriptRam('grow.js'));

    let minBatchRam = 2*scriptRam;
    let batchLimit = Infinity;
    let batchNumber = 0;
    let tasks = [];

    ns.print("Scheduling pWeak workers.");
    for (const host of ramNet.hosts) {
      if (host.ram <minBatchRam) {
        continue;
      }
      if (!ns.fileExists('weak.js', host.id)) ns.scp('weak.js', host.id, 'home');
      batchNumber++;
      let t = Math.floor(host.ram/scriptRam);
      let end = Date.now() + weakenTime;
      tasks.push({
        script: 'weak.js',
        host: host.id,
        target: target,
        batchNumber: batchNumber,
        type: 'pWeak',
        time: weakenTime,
        end: end,
        port: ns.pid,
        t: t,
      });
      host.ram -= (t)*scriptRam;
      await ns.sleep(1);
    }
    if (tasks === []){
      ns.print("ERROR: Could not find RAM for minimizing security")
      ns.exit();
    }
    ns.print("Launching pWeak workers.");
    batchLimit = batchNumber;
    for (const task of tasks){
      task.batchLimit = batchLimit;
      ns.exec(task.script, task.host, task.t, JSON.stringify(task))
    }
    await port.nextWrite();
    port.read();
    await ns.sleep(2000);
  }

  while (ns.getServerMoneyAvailable(target) < maxMoney) {
    ramNet.update();
    let weakenTime = ns.getWeakenTime(target);
    let growTime = ns.getGrowTime(target);
    let scriptRam = Math.max(ns.getScriptRam('weak.js'), ns.getScriptRam('grow.js'));

    let minBatchRam = 2*scriptRam;
    let batchLimit = Infinity;
    let batchNumber = 0;
    let tasks = [];

    ns.print("Scheduling pWeak/pGrow workers.");
    for (const host of ramNet.hosts) {
      if (host.ram <minBatchRam) {
        continue;
      }
      if (!ns.fileExists('weak.js', host.id)) ns.scp('weak.js', host.id, 'home');
      if (!ns.fileExists('grow.js', host.id)) ns.scp('grow.js', host.id, 'home');
      batchNumber++;
      let capacity = Math.floor(host.ram/scriptRam/13);
      let tGrow;
      let tWeaken;
      if (capacity < 1){
        tGrow = Math.floor(host.ram/scriptRam)-1;
        tWeaken = 1;
      } else {
        tGrow = 12*capacity;
        tWeaken = capacity;
      }
      let end = Date.now() + weakenTime;
      tasks.push({
        script: 'weak.js',
        host: host.id,
        target: target,
        batchNumber: batchNumber,
        type: 'pWeak',
        time: weakenTime,
        end: end,
        port: ns.pid,
        t: tWeaken,
      });
      tasks.push({
        script: 'grow.js',
        host: host.id,
        target: target,
        batchNumber: batchNumber,
        type: 'pGrow',
        time: growTime,
        end: end-1,
        port: ns.pid,
        t: tGrow,
      });
      host.ram -= (tGrow+tWeaken)*scriptRam;
      await ns.sleep(1);
    }
    if (tasks === []){
      ns.print("ERROR: Could not find RAM for maximising money")
      ns.exit();
    }
    ns.print("Launching pWeak/pGrow workers.");
    batchLimit = batchNumber;
    for (const task of tasks){
      task.batchLimit = batchLimit;
      ns.exec(task.script, task.host, task.t, JSON.stringify(task))
    }
    await port.nextWrite();
    port.read();
    await ns.sleep(2000);
  }
}

/**
 * Calculates the threads for each part of a batch and returns them in an object.
 * 
 * @param {NS} ns The NS interface.
 * @param {string} target The target to calculate against.
 * @param {number} greed The level of greed to operate with.
 * @return {{ tHack: number, tGrow: number, tWeakenHack: number, tWeakenGrow: number,}} The data object.
 */
function calcThreads(ns, target, greed) {
  let sv = ns.getServer(target);
  let p = ns.getPlayer();
  let tHack = Math.max(1, Math.round(ns.hackAnalyzeThreads(target, sv.moneyMax * greed)));
  let tGrow;
  if (ns.fileExists('Formulas.exe', 'home')){
    let hackAmount = ns.formulas.hacking.hackPercent(sv, p) * tHack;
    sv.moneyAvailable = sv.moneyMax * (1-hackAmount);
    tGrow = ns.formulas.hacking.growThreads(sv, p, sv.moneyMax, 1);
    // TODO: implement per-system threads which take cores into account
  } else {
    let hackAmount = ns.hackAnalyze(target) * tHack;
    let postHackAmount = sv.moneyMax * (1-hackAmount);
    tGrow = Math.ceil(ns.growthAnalyze(target, sv.moneyMax / postHackAmount));
  }
  let hRatio = ns.weakenAnalyze(1) / ns.hackAnalyzeSecurity(1);
  let gRatio = ns.weakenAnalyze(1) / ns.growthAnalyzeSecurity(1);
  let tWeakenHack = Math.ceil(tHack / hRatio);
  let tWeakenGrow = Math.ceil(tGrow / gRatio);
  return [tHack, tWeakenHack, tGrow, tWeakenGrow];
}


/** @param {NS} ns */
function getRamNet(ns, servers) {
  ns.print('Building ramNet...');
  let ramNet = {};

  ramNet.ns = ns;



  ramNet.update = function () {
    let ns = this.ns;
    this.maxHostSize = 0;
    this.minHostSize = Infinity;
    this.totalSize = 0;
    this.hosts = [];
    let servers = traverse(ns);
    let filtered = servers.filter((sv) => ns.getServerMaxRam(sv) > 0 && ns.hasRootAccess(sv));
    filtered.sort((a, b) => {
      if (a === 'home') {
        return 1;
      }
      if (b === 'home') {
        return -1;
      }
      return ns.getServerMaxRam(a) - ns.getServerMaxRam(b);
    });
    for (const sv of filtered) {
      let maxRam = ns.getServerMaxRam(sv);
      if (sv === 'home') {
        maxRam -= Math.max(8, maxRam * 0.2);
      }
      let size = maxRam - ns.getServerUsedRam(sv);
      if (size < 0) size = 0;
      this.totalSize += size;
      if (size > this.maxHostSize) this.maxHostSize = size;
      if (size < this.minHostSize) this.minHostSize = size;
      let host = {
        id: sv,
        ram: size,
        maxRam: size,
      };
      this.hosts.push(host);
    }
  };

  ramNet.findHost = function (numThreads, fn) {
    let ns = this.ns;
    let scriptSize = ns.getScriptRam(fn);
    let ramReq = numThreads * scriptSize;
    for (let host of this.hosts) {
      if (host.ram < ramReq) {
        continue;
      }
      host.ram -= ramReq;
      return host.id;
    }
  }
  
  ramNet.update();
  ns.print('ramNet build complete.');
  ns.print(`Total available ram: ${ns.formatRam(ramNet.totalSize)}`);
  return ramNet;
}

export function autocomplete(data, args) {
    return data.servers;
}