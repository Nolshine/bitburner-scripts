// crawl through the entire network, calling killall() on every server except 'home'.

export async function main(ns) {
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
            // we also add it to visited, and run killall() on it.
            ns.tprint("Killing all scripts in: " + server);
            nodes = nodes.concat(ns.scan(server));
            visited.push(server);
            ns.killall(server);
        }
    }
}