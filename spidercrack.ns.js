// crawl the network for servers, cracking them open if possible.
// can be used every time a new crack is available, automatable
// via running periodically from a scheduler.

export async function main(ns) {
    // crack names
    let crack_names = ["BruteSSH.exe", "FTPCrack.exe", "RelaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe"];
    // crack functions
    let crack_funcs = [ns.brutessh, ns.ftpcrack, ns.relaysmtp, ns.httpworm, ns.sqlinject];
    
    // determine the crack level possible with available cracks
    let cracks_available = 0;
    for (let i = 0; i < 5; i++){
        if(ns.fileExists(crack_names[i], "home")){
            cracks_available += 1;
        }
    }
    
    // an array to store visited nodes, so we don't keep scanning them forever.
    let visited = ['home']; // 'home' is added in because it's our starting point.
    // an array to store nodes that we discovered that have yet to be scanned AKA visited.
    // this array will be initialized to have all servers reachable from 'home' in it.
    let nodes = ns.scan('home');
    
    // loop while there are nodes left in in the 'nodes' array,
    // which would mean its 'length' property isn't zero
    while (nodes.length !== 0){
        // remove the last server from 'nodes' and store it separately
        let server = nodes.pop();
        // is the node visited?
        if (!visited.includes(server)) {
            // node not visited, so we scan it and add the results to 'nodes'.
            // we also add it to visited, and crack it if possible.
            nodes = nodes.concat(ns.scan(server));
            visited.push(server);
            // figure out how many ports are needed open
            let cracks_needed = ns.getServerNumPortsRequired(server);
            // if we have enough cracks, crack the server
            if(cracks_needed <= cracks_available) {
                ns.tprint("Possible to root server: " + server);
                // use as many cracks as needed, utilising the function array
                for (let i = 0; i < cracks_needed; i++){
                    crack_funcs[i](server);
                }
                // now nuke the server
                ns.nuke(server);
                // check nuking worked
                if (ns.hasRootAccess(server)){
                    ns.tprint("Root success: " + server);
                } else {
                    ns.tprint("Failed to root: " + server);
                }
            }
        }
    }
}