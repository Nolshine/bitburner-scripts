import { traverse } from 'util.js';

/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog('ALL');
	ns.tail();

	const servers = traverse(ns);
	const target = ns.args[0];
	if (!validateTarget(ns, target)) ns.exit();
	const greed = 0.4; // TODO automatic optimisation of greed level
	let ramNet = getRamNet(ns, servers);
	let port = ns.getPortHandle(ns.pid);
	port.clear();

	const TYPES = ['hack', 'weak1', 'grow', 'weak2'];
	const SCRIPTS = ['hack.js', 'weak.js', 'grow.js', 'weak.js'];

	while (true) {
		ramNet.update();
		let hackTime = ns.getHackTime(target);
		let growTime = hackTime * 3.2;
		let weakenTime = hackTime * 4;
		let timings = [weakenTime - hackTime, 0, weakenTime - growTime, 0];

		if (!isPrepped(ns, target)) {
			ns.print(`WARN: ${target} is not in a prepped state.`);
			await prepTarget(ns, target, ramNet, port);
		}

		// work out the thread calcs based on the greed
		let threads = calcThreads(ns, target, greed);
		let totalThreads = threads.reduce((a, b) => a + b, 0);
		ns.tprint(totalThreads);
		// work out how many times the batch can fit in the network
		// TODO: This is probably error prone, need a better method for deciding the limit.
		// let batchLimit = 30;
		let batchLimit = Math.min(100, Math.ceil((ramNet.totalSize/1.75)/totalThreads));
		ns.tprint(`Attempting ${batchLimit} groupings superbatch.`)
		// divvy up ram and scheduling for tasks
		let tasks = [];
		let batchNumber = 1;
		let abort = false;
		while (batchNumber <= batchLimit) {
			let currentBatch = [];

			for (let i = 0; i < 4; i++) {
				let task = {
					target: target,
					batchNumber: batchNumber,
					type: TYPES[i],
					script: SCRIPTS[i],
					threads: threads[i],
					host: ramNet.getHost(threads[i], SCRIPTS[i]),
					time: timings[i],
				};
				if (!task.host) {
					ns.print(`Batch #${batchNumber} failed to find RAM, aborting distribution.`);
					abort = true;
					break; // breaks the for loop
				}
				ns.scp(SCRIPTS[i], task.host, 'home');
				currentBatch.push(task);
			}
			if (abort) {
				batchLimit = batchNumber-1; // make sure tasks know the limit has changed.
				break; // breaks out of while loop without adding latest batch
			}
			tasks.push(...currentBatch);
			batchNumber++;
			if (batchNumber % 250 === 0) {
				await ns.sleep(1);
			}
			// await ns.sleep(1);
		}
		if (tasks.length === 0) {
			ns.print("ERROR: Could not schedule any jobs!");
			ns.exit(); // ungraceful crash to the rescue /s
		}
		ns.tprint("Launching.")
		// and now to actually launch said tasks.
		let counter = 0;
		for (const task of tasks) {
			let job = JSON.stringify({
				target: task.target,
				batchNumber: task.batchNumber,
				batchLimit: batchLimit,
				type: task.type,
				time: task.time,
				end: Date.now() + task.time,
				port: ns.pid,
			});
			ns.exec(task.script, task.host, task.threads, job);
			counter++;
			if (counter % 250 === 0) await ns.sleep(1);
		}

		await port.nextWrite();
		port.read();
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
	port.clear();
	let minSec = ns.getServerMinSecurityLevel(target);
	let maxMoney = ns.getServerMaxMoney(target);
	while (ns.getServerSecurityLevel(target) > minSec){
		ramNet.update();
		let time = ns.getWeakenTime(target);
		let tDesired = Math.ceil((ns.getServerSecurityLevel(target) - minSec)/ns.weakenAnalyze(1));
		let t = Math.min(tDesired, Math.floor(ramNet.maxHostSize/ns.getScriptRam('weak.js')));
		let host = ramNet.getHost(t, 'weak.js');
		ns.scp('weak.js', host, 'home');
		let job = JSON.stringify({
				target: target,
				batchNumber: 0,
				batchLimit: 0,
				type: 'pWeak',
				time: time,
				end: Date.now() + time,
				port: ns.pid,
			});
		ns.exec('weak.js', host, t, job);
		await port.nextWrite();
		port.read();
	}

	while (ns.getServerMoneyAvailable(target) < maxMoney) {
		ramNet.update();
		let weakenTime = ns.getWeakenTime(target);
		let growTime = ns.getGrowTime(target);

		let mult = maxMoney / ns.getServerMoneyAvailable(target);
		let tGrowDesired = Math.ceil(ns.growthAnalyze(target, mult));
		let tGrow = Math.min(tGrowDesired, Math.floor(ramNet.maxHostSize/ns.getScriptRam('grow.js')));
		let ratio = ns.weakenAnalyze(1)/ns.growthAnalyzeSecurity(1);
		let tWeaken = Math.ceil(tGrow/ratio);
		let hostGrow = ramNet.getHost(tGrow, 'grow.js');
		let hostWeaken = ramNet.getHost(tWeaken, 'weak.js');

		ns.scp('grow.js', hostGrow, 'home');
		ns.scp('weak.js', hostWeaken, 'home');

		let jobGrow = JSON.stringify({
				target: target,
				batchNumber: 0,
				batchLimit: 0,
				type: 'pGrow',
				time: growTime,
				end: Date.now() + growTime,
				port: ns.pid,
			});
		let jobWeaken = JSON.stringify({
				target: target,
				batchNumber: 0,
				batchLimit: 0,
				type: 'pWeak',
				time: weakenTime,
				end: Date.now() + weakenTime,
				port: ns.pid,
			});
		ns.exec('grow.js', hostGrow, tGrow, jobGrow);
		ns.exec('weak.js', hostWeaken, tWeaken, jobWeaken);
		await port.nextWrite();
		port.read();
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
	let maxMoney = ns.getServerMaxMoney(target);
	let tHack = Math.max(1, Math.round(ns.hackAnalyzeThreads(target, maxMoney*greed)));
	let hackAmount = ns.hackAnalyze(target)*tHack;
	// TODO: add formulas implementation later
	let tGrow = Math.ceil(ns.growthAnalyze(target, maxMoney/(maxMoney-hackAmount)));
	let hRatio = ns.weakenAnalyze(1)/ns.hackAnalyzeSecurity(1, target);
	let gRatio = ns.weakenAnalyze(1)/ns.growthAnalyzeSecurity(1, target);
	let tWeakenHack = Math.ceil(Math.max(1, tHack/hRatio));
	let tWeakenGrow = Math.ceil(Math.max(1, tGrow/gRatio));
	return [tHack, tWeakenHack, tGrow, tWeakenGrow];
}


/** @param {NS} ns */
function getRamNet(ns, servers) {
	let ramNet = {};
	ramNet.maxHostSize = 0;
	ramNet.minHostSize = Infinity;
	ramNet.totalSize = 0;
	
	ramNet.ns = ns;

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

	ramNet.hosts = [];
	for (const sv of filtered) {
		let size = ns.getServerMaxRam(sv);
		ramNet.totalSize += size;
		if (size > ramNet.maxHostSize) ramNet.maxHostSize = size;
		if (size < ramNet.minHostSize) ramNet.minHostSize = size;
		let host = {
			id: sv,
			ram: size,
			maxRam: size,
		};
		ramNet.hosts.push(host);
	}

	ramNet.update = function () {
		let ns = this.ns;
		let newTotalSize = 0;
		for (let host of this.hosts) {
			host.ram = ns.getServerMaxRam(host.id) - ns.getServerUsedRam(host.id);
			newTotalSize += host.ram;
		}
		this.totalSize = newTotalSize;
	};

	ramNet.getHost = function(numThreads, fn) {
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

	return ramNet;
}