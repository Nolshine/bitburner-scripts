export async function main(ns) {
    let target_num = ns.args[0];
    // just a quick script to print out some important data
    
    // crawl the network, store an array of all 0-5 port servers.
    // for (let i = 0; i < 6; i++) {
    //     ns.tprint(findServers(ns, i));
    // }
    ns.tprint(findServers(ns, target_num));
}

function findServers(ns, num_ports) {
    let visited = ['home'];
    let nodes = ns.scan('home');
    let results = [];
    let hacklvl = ns.getHackingLevel();
    
    while (nodes.length !== 0) {
        // while there are still nodes to crawl
        let server = nodes.pop(); // pop the last node
        if (!visited.includes(server)) { // if the node isn't visited
            visited.push(server); // mark the node as visited
            nodes = nodes.concat(ns.scan(server)); // add connected nodes to the 'nodes' array
            let req_hacklvl = ns.getServerRequiredHackingLevel(server);
            if ((ns.getServerNumPortsRequired(server) == num_ports) && (hacklvl >= req_hacklvl)) {
                // if the server has the targetted port requirement and is hackable, add it to results
                results.push(server);
            }
        }
    }
    // return appropriate servers when crawling is done
    return results;
}