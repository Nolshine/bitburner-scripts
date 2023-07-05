// pserv autobuyer/upgrader
// main loop:
// 1) with current money, what's the largest sv I can buy?
// 2) if I can't buy, goto 1
// 3) is there a free pserv slot?
// 4) if yes, buy and goto 1, else goto 5
// 5) any servers with lower ram than I can currently buy?
// 6) if yes, delete/replace, goto 1, else goto 7
// 7) did we just check the maximum possible size?
// 8) if yes, done! if not, goto 1.

//TODO: also copy over worker/prep scripts

/** @param {NS} ns */
export async function main(ns) {
	let maxSize = Math.pow(2, 20);
	let minSize;

	if (!ns.args[0] || typeof ns.args[0] != 'number' || ns.args[0] > 20 || ns.args[0] < 1) {
		ns.tprint(`WARNING: minimum size factor must be int between 1-20. Defaulting to 2^10GB)`);
		minSize = 10;
	} else {
		minSize = Math.max(Math.floor(ns.args[0]), 1);
	}

	while (true) {
		await ns.sleep(1000);
		let canBuySize = getBuySize(ns, minSize); // 0 if not possible to buy server
		if (!canBuySize) {
			ns.print("WARNING: Script thinks a server cannot be bought.");
			continue;
		}

		let purchaseAttempted = tryPurchase(ns, canBuySize);
		if (purchaseAttempted) {
			continue;
		}

		let upgradeAttempted = tryUpgrade(ns, canBuySize);
		if (upgradeAttempted) { // will be false if no servers were replaced
			continue;
		}

		if (canBuySize === maxSize) {
			ns.tprint("Servers maximised. Quitting...");
			ns.exit();
		}
	}

}

/** @param {NS} ns */
function tryUpgrade(ns, canBuySize) {
	let pservs = getPlayerServers(ns);
	for (let sv of pservs) {
		let ram = ns.getServerMaxRam(sv);
		if (ram < canBuySize) {
			ns.upgradePurchasedServer(sv, canBuySize);
			ns.tprint(`${sv} has been upgraded. (${ns.formatRam(ram)})`);
			return true;
		}
	}
	return false;
}

/** @param {NS} ns */
function tryPurchase(ns, canBuySize) {
	let pservs = getPlayerServers(ns);
	if (pservs.length < 25) {
		let name = 'pserv-' + pservs.length;
		ns.purchaseServer(name, canBuySize);
		ns.tprint(`${name} has been purchased. (${ns.formatRam(canBuySize)})`);
		return true;
	}
	return false;
}

/** @param {NS} ns */
function getBuySize(ns, minSize) {
	let money = ns.getPlayer().money;
	// return the maximum size (in RAM) of server I can buy, or zero if I can't.
	for (let i = 20; i >= minSize; i--) { // start at highest price, going down
		let ram = Math.pow(2, i);
		let price = ns.getPurchasedServerCost(ram);
		if (price <= money) {
			// ns.tprint(`Aiming for size ${Math.pow(2, i)} at price \$${price}`);
			return ram;
		}
	}

	return 0;
}

/** @param {NS} ns */
function getPlayerServers(ns) {
	return ns.scan('home').filter((sv) => sv.includes('pserv'));
}