/** @param {NS} ns */

// takes a target server and prepares it for farming
// 1) decrease security to minimum
// 2) increase money to maximum while maintaining minsec
export async function main(ns) {
	let target = ns.args[0];
	if (!target || !ns.serverExists(target)){
		ns.tprint("ERROR: invalid target");
		return;
	}
	await lowerSecurity(ns, target);
	await maximizeMoney(ns, target);
	let cash = ns.getServerMoneyAvailable(target);
	let max_cash = ns.getServerMaxMoney(target);
	let sec_level = ns.getServerSecurityLevel(target);
	let min_sec = ns.getServerMinSecurityLevel(target);
	ns.tprint(`SUCCESS!\n
	server: ${target}\n
	money: \$${cash}/${max_cash}\n
	security: ${sec_level}/(min:)${min_sec}`);	 
}

async function lowerSecurity(ns, target) {
	while (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target)) {
		let t = getThreads(ns);
		let wait = ns.getWeakenTime(target);
		let job = createJob(ns, wait, 'weak', target);
		ns.run('weak.js', t, job);
		await ns.sleep(wait + 1000);
	}
}

async function maximizeMoney(ns, target) {
	while (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target)) {
		let t = getThreads(ns);
		if (t < 2) {
			ns.tprint(`ERROR: ${ns.getHostname()} insufficient threads to grow ${target}.`);
			ns.exit();
		}
		let wt = Math.max(Math.ceil(t/12.5), 1);
		t = t-wt;
		let weak_wait = ns.getWeakenTime(target);
		let grow_wait = ns.getGrowTime(target);
		let weak_job = createJob(ns, weak_wait, 'weak', target);
		let grow_job = createJob(ns, grow_wait, 'grow', target);
		ns.run('weak.js', wt, weak_job);
		ns.run('grow.js', t, grow_job);
		await ns.sleep(weak_wait + 1000);
	}
}

function getThreads(ns) {
	let per_script_ram = ns.getScriptRam('weak.js', 'home');
	let host = ns.getHostname();
	let ram = ns.getServerMaxRam(host)-ns.getServerUsedRam(host);
	let t = Math.floor(ram/per_script_ram);
	if (t == 0) {
		ns.tprint(`ERROR: (${ns.getHostname()}) could not spin any threads.`);
		ns.exit();
	}
	return t;
}

function createJob(ns, time, type, target){
	return JSON.stringify({
		'target': target,
		'time': time,
		'end': Date.now() + time,
		'type': type,
		'port': 69,
	});
}
