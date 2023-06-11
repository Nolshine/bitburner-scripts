/** @param {NS} ns */

// 1) acquire list of servers
// TODO: figure out how to make a traversal function available to all scripts?
// 2) filter for servers with money that are rooted
// 3) use the moneyMax/minSecurity metric to sort them

export async function main(ns) {
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

	let data = {};
	for (const target of sortTargets(ns, result)){
		data[target] = `Prepped: ${isPrepped(ns, target)}`;
	}
	for (const key of Object.keys(data)){
		ns.tprint(`${key}: ${isPrepped(ns, key) ? 'Prepped' : 'Not Prepped'}`);
	}
}


function isPrepped(ns, target){
	let sv = ns.getServer(target);
	return ((sv.moneyAvailable >= sv.moneyMax) && (sv.hackDifficulty <= sv.minDifficulty));
}


function sortTargets(ns, targets){
	// sort valuable targets in order of descending potential value
	targets.sort((a, b) => {
		let sv_a = ns.getServer(a);
		let sv_b = ns.getServer(b);
		
		// let weak_time_a = ns.getWeakenTime(a);
		// let weak_time_b = ns.getWeakenTime(b);
		let metric_a = sv_a.moneyMax/sv_a.minDifficulty;
		let metric_b = sv_b.moneyMax/sv_b.minDifficulty;
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