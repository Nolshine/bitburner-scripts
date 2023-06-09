/** @param {NS} ns */

// 1) acquire list of servers
// TODO: figure out how to make a traversal function available to all scripts?
// 2) filter for servers with money that are rooted
// 3) use the moneyMax/minSecurity metric to sort them
// 4) present best... 10 targets?

export async function main(ns) {
	ns.tprint(traverse(ns));
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
		if (
			target === 'home' ||
			ns.getServerMaxMoney(target) === 0 ||
			!ns.hasRootAccess(target) ||
			ns.getHackingLevel()/2 < ns.getServerRequiredHackingLevel(target)
		) {
			return false;
		}
		return true;
	})

	return sortTargets(ns, result);
}

function sortTargets(ns, targets){
	// sort valuable targets in order of descending potential value
	targets.sort((a, b) => {
		let max_cash_a = ns.getServerMaxMoney(a);
		let max_cash_b = ns.getServerMaxMoney(b);
		let min_sec_a = ns.getServerMinSecurityLevel(a);
		let min_sec_b = ns.getServerMinSecurityLevel(b);
		// let weak_time_a = ns.getWeakenTime(a);
		// let weak_time_b = ns.getWeakenTime(b);
		let metric_a = max_cash_a/min_sec_a;
		let metric_b = max_cash_b/min_sec_b;
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