//
// a daemon to purchase progressively better servers
// 
// optional arg: start_power
// optional arg: stop_power
//
// if stop_power is provided, start_power must be provided too
//
// for every power of 2 (intially 2**1, or 2**(Math.sqrt(start_ram)))
// up to (but not including) the limit set by stop_power
// or up to (but not including) 21
// iterate from 0 to 24, waiting until enough money is available in
// player's account, then deleting previous server of same name if exists
// then buying new server, then copying over daemon.ns and hack/grow/weaken.script

let scripts = ["daemon.ns", "hack.script", "weaken.script", "grow.script", "util.ns"];

export async function main(ns) {
    let power;
    let limit;
    if(!ns.args[0]){
        power = 1;
    } else {
        power = ns.args[0];
    }
    if (!ns.args[1]){
        limit = Infinity;
    } else {
        limit = ns.args[1];
    }
    while (true) {
        // loop until target ram exceeds maximum ram possible for servers
        let target_ram = Math.pow(2, power);
        if (power > 20) {
            ns.tprint("pserv max RAM reached. Terminating...");
            return;
        } else if (power > limit) {
            ns.tprint("exponent limit exceeded. Terminating...");
            return;
        }
        for (let i=0; i < 25; i++) {
            let sv = "pserv-"+i;
            let cost = ns.getPurchasedServerCost(target_ram);
            while(ns.getServerMoneyAvailable('home') < cost){
                await ns.sleep(10000); // check if possible to buy every 10 seconds.
            }
            // does a server of this name already exist?
            if (ns.serverExists(sv)) {
                if (ns.getServerRam(sv)[0] < target_ram) {
                    ns.killall(sv);
                    await ns.sleep(1000);
                    ns.deleteServer(sv); // delete existing server
                } else {
                    // we don't want to delete servers that are already at the target RAM
                    continue;
                }
            } 
            // buy a new server
            ns.tprint("Buying server: " + sv +", target RAM: " + target_ram);
            let hostname = ns.purchaseServer(sv, target_ram);
            // copy over main tools
            for (let s = 0; s < scripts.length; s++) {
                ns.scp(scripts[s], hostname);
            }
        }
        // increase the power of 2
        power = power+1;
    }
}