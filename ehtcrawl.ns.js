// crawl the network for servers, utilising any with root access

export async function main(ns) {
    // an array to store visited nodes, so we don't keep scanning them forever.
    let visited = ['home']; // 'home' is added in because it's our starting point.
    // an array to store nodes that we discovered that have yet to be scanned AKA visited.
    // this array will be initialized to have all servers reachable from 'home' in it.
    let nodes = ns.scan('home');
    // name of hack script
    let script = "EHT.script";
    // target from args
    let targ = ns.args[0];
    
    // loop while there are nodes left in in the 'nodes' array,
    // which would mean its 'length' property isn't zero
    while (nodes.length !== 0){
        // remove the last server from 'nodes' and store it separately
        let server = nodes.pop();
        // is the node visited?
        if (!visited.includes(server)) {
            ns.tprint("Checking server: " + server);
            // node not visited, so we scan it and add the results to 'nodes'.
            // we also add it to visited, and crack it if possible.
            nodes = nodes.concat(ns.scan(server));
            visited.push(server);
            // if root access is available, check for instances of EHT.script
            let busy = true;
            if (ns.hasRootAccess(server)) {
                busy = ns.scriptRunning(script, server);
            } else {
                ns.tprint("No root: " + server);
                // otherwise, continue to next iteration
                continue;
            }
            // if script isn't already running, run it with current target
            if (busy === false) {
                ns.tprint("Found unbusy, rooted server: " + server);
                ns.scp(script, server);
                // work out how many threads we can use
                let ram = ns.getServerRam(server)[0];
                let t = Math.floor(ram/ns.getScriptRam(script));
                if(t <= 0){
                    // skip servers with too little/no ram
                    ns.tprint("Insufficient RAM: " + server);
                    continue;
                }
                // run the script
                ns.exec(script, server, t, targ);
            }
        }
    }
}