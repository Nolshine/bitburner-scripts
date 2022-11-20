/** @param {NS} ns */

// TODO: enable toggling whether to use 'home' RAM or not
// TODO: enable setting aside RAM on 'home' for other scripts


export async function main(ns) {
	var target = ns.args[0];
	var percentToSteal = ns.args[1];
	if ((!target) || (!ns.serverExists(target)) || (!ns.hasRootAccess(target))){
		ns.print("ERROR: invalid or unrooted target server.");
		return -1;
	}

	var zombies = getZombieServers(ns);
	if (zombies.length == 0){
		ns.print("ERROR: No possible servers to enslave.");
		return -1;
	}

	while(true){
		zombies = getZombieServers(ns);
		propagateTools(ns, zombies);
		if (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target)){
			await weakenCycle(ns, target, zombies);
		}
		else if (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target)){
			await growCycle(ns, target, zombies);
		}
		else {
			await hackCycle(ns, target, zombies, percentToSteal);
		}
		await ns.sleep(1000); // safety net for hard freeze
	}
}

function getZombieServers(ns) {
	var nodes = ['home'].concat(ns.scan('home'));
	var visited = ['home'];
	var zombies = {};

	while(nodes.length > 0){
		let node = nodes.pop();
		if (visited.includes(node)){
			continue;
		}
		visited.push(node);
		nodes = nodes.concat(ns.scan(node));
		if (getUsableRam(ns, node) < 1.75){
			// needs a minimum of 1.75GB to provide a usable thread to the overseer.
			continue;
		} else if (!ns.hasRootAccess(node)){
			// exec needs root access, so we can't use unrooted servers.
			continue;
		}
		ns.print(`${node} is a useful server.`);
		let possThreads = Math.floor(getUsableRam(ns, node)/1.75);
		zombies[node] = possThreads; // TODO: assigned by val or ref?
	}

	let homeRam = getUsableRam(ns, 'home');
	if (homeRam >= 1.75){
		zombies['home'] = Math.floor(getUsableRam(ns, 'home')/1.75);
	}

	return zombies;
}

function getUsableRam(ns, sv){
	var maxRam = ns.getServerMaxRam(sv);
	var usedRam = ns.getServerUsedRam(sv);
	return maxRam-usedRam;
}

function propagateTools(ns, zombies){
	var tools = [
		"hack.js",
		"grow.js",
		"weak.js",
	];
	for (const [sv, t] of Object.entries(zombies)){
		tools.forEach((tool) => {
			ns.scp(tool, sv);
		})
	}
}

async function weakenCycle(ns, target, zombies){
	ns.print(`weakening ${target}`);
	let timeToWait = 5000 + ns.getWeakenTime(target);

	let targetSecLevel = ns.getServerSecurityLevel(target);
	let targetMinSec = ns.getServerMinSecurityLevel(target);
	let securityToLower = targetSecLevel-targetMinSec;
	let weakThreadsDesired = Math.ceil(securityToLower/0.05);

	let weakThreads = 0;
	for (const [sv, t] of Object.entries(zombies)){
		weakThreads += t;
	}
	if (weakThreads < 1){
		ns.print("WARNING: No threads available for weaken batching, waiting 1min.")
		await ns.sleep(60000);
		return;
	}
	if (weakThreads > weakThreadsDesired){
		weakThreads = weakThreadsDesired;
	}

	for (const [sv, t] of Object.entries(zombies)){
		if (weakThreads < t){
			ns.exec('weak.js', sv, weakThreads, target);
			break;
		} else {
			ns.exec('weak.js', sv, t, target);
			weakThreads -= t;
		}
	}

	await ns.sleep(timeToWait);
}

async function growCycle(ns, target, zombies){
	ns.print(`growing ${target}`);

	let timeToWait = 5000 + ns.getWeakenTime(target);
	let totalThreads = 0;
	let batches = 0;
	for (const [sv, t] of Object.entries(zombies)){
		totalThreads += t;
	}
	if (totalThreads < 2){
		ns.print("WARNING: not enough threads in network for batching grow cycle.");
		ns.print("Sleeping 1min before next cycle.")
		await ns.sleep(60000);
		return;
	}
	batches = Math.floor(totalThreads/13);
	let growThreads;
	let weakThreads;
	if(batches < 1){
		weakThreads = 1;
		growThreads = totalThreads - 1;
	}
	else {
		weakThreads = batches;
		growThreads = batches * 12;
	}

	let targetMaxCash = ns.getServerMaxMoney(target);
	let targetCash = ns.getServerMoneyAvailable(target);
	let desiredPercent = targetMaxCash/targetCash;
	let growThreadsDesired = Math.ceil(ns.growthAnalyze(target, desiredPercent));

	if (growThreads > growThreadsDesired){
		growThreads = growThreadsDesired;
		weakThreads = Math.ceil(growThreads/12);
	}	

	ns.print(`batches: ${batches}\n
	grow threads needed: ${growThreads}\n
	weaken threads needed: ${weakThreads}`);

	for (const [sv, t] of Object.entries(zombies)){
		let remainingThreads = 0;
		// deplete grow threads first
		if (growThreads > 0){
			ns.print(`Current grow threads needed: ${growThreads}`);
			if (growThreads > t){
				ns.exec('grow.js', sv, t, target);
				growThreads -= t;
				ns.print(`Grow threads reduced by ${t} (now ${growThreads})`);
				continue;
			} else {
				ns.exec('grow.js', sv, growThreads, target);
				remainingThreads = t - growThreads;
				growThreads -= growThreads;
				ns.print("Grow threads depleted, moving to weaken.");
				ns.print(`(Remaining threads on ${sv}: ${remainingThreads})`);
			}
		}
		// then deplete weaken threads
		if (weakThreads > 0){
			ns.print(`Current weaken threads needed: ${weakThreads}`);
			// first see if there are remaining threads.
			if (remainingThreads > 0){
				ns.print(`Working through remaining threads on ${sv}`);
				if (remainingThreads > weakThreads){
					ns.exec('weak.js', sv, weakThreads, target);
					break;
				} else {
					ns.exec('weak.js', sv, remainingThreads, target);
					weakThreads -= remainingThreads;
				}
				continue;
			} else if (weakThreads > t){
				ns.exec('weak.js', sv, t, target);
				weakThreads -= t;
				ns.print(`weaken threads reduced by ${t} (now ${weakThreads})`);
				continue;
			} else {
				ns.exec('weak.js', sv, weakThreads, target);
				weakThreads -= weakThreads;
				ns.print(`Completed ${batches} batches.
				weaken threads: ${weakThreads}
				grow threads: ${growThreads}`)
				break;
			}
		}
	}
	// wait for alotted time to finish
	await ns.sleep(timeToWait);
}

async function hackCycle(ns, target, zombies, percentToSteal){
	ns.print(`hacking ${target}`);

	let timeToWait = 5000 + ns.getWeakenTime(target);
	let totalThreads = 0;
	let batches = 0;
	
	for (const [sv, t] of Object.entries(zombies)){
		totalThreads += t;
	}
	if (totalThreads < 2) {
		ns.print("WARNING: not enough threads in network for batching hack cycle.");
		ns.print("Waiting 1min before next cycle.")
		await ns.sleep(60000);
		return;
	}
	batches = Math.floor(totalThreads/26);
	let hackThreads;
	let weakThreads;
	if(batches < 1){
		weakThreads = 1;
		hackThreads = totalThreads - 1;
	} else {
		weakThreads = batches;
		hackThreads = batches * 25;
	}
	let moneyPercentDesired = ns.getServerMaxMoney(target) * percentToSteal;
	let hackThreadsDesired = Math.round(ns.hackAnalyzeThreads(target, moneyPercentDesired));
	if (hackThreadsDesired < 1){
		hackThreadsDesired = 1;
	} else if (hackThreadsDesired < hackThreads){
		hackThreads = hackThreadsDesired;
		weakThreads = Math.ceil(hackThreadsDesired/25);
	}
	ns.print(`batches: ${batches}\n
	hack threads needed: ${hackThreads} (desired: ${hackThreadsDesired})\n
	weaken threads needed: ${weakThreads}`);
	
	for (const [sv, t] of Object.entries(zombies)){
		let remainingThreads = 0;
		// deplete grow threads first
		if (hackThreads > 0){
			ns.print(`Current hack threads needed: ${hackThreads}`);
			if (hackThreads > t){
				ns.exec('hack.js', sv, t, target);
				hackThreads -= t;
				ns.print(`hack threads reduced by ${t} (now ${hackThreads})`);
				continue;
			} else {
				ns.exec('hack.js', sv, hackThreads, target);
				remainingThreads = t - hackThreads;
				hackThreads -= hackThreads;
				ns.print("Hack threads depleted, moving to weaken.");
				ns.print(`(Remaining threads on ${sv}: ${remainingThreads})`);
			}
		}
		// then deplete weaken threads
		if (weakThreads > 0){
			ns.print(`Current weaken threads needed: ${weakThreads}`);
			// first see if there are remaining threads.
			if (remainingThreads > 0){
				ns.print(`Working through remaining threads on ${sv}`);
				if (remainingThreads > weakThreads){
					ns.exec('weak.js', sv, weakThreads, target);
					break;
				} else {
					ns.exec('weak.js', sv, remainingThreads, target);
					weakThreads -= remainingThreads;
					continue;
				}
			} else if (weakThreads > t){
				ns.exec('weak.js', sv, t, target);
				weakThreads -= t;
				ns.print(`weaken threads reduced by ${t} (now ${weakThreads})`);
				continue;
			} else {
				ns.exec('weak.js', sv, weakThreads, target);
				weakThreads -= weakThreads;
				ns.print(`Completed ${batches} batches.
				weaken threads: ${weakThreads}
				hack threads: ${hackThreads}`)
				break;
			}
		}
	}
	// wait for alotted time to finish
	await ns.sleep(timeToWait);
}
