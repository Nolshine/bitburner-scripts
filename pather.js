/** @param {NS} ns */
// find path to specific server
export async function main(ns) {
    if (!ns.args[0]) {
        ns.tprint("ERROR: Missing required argument \"target\".\n(USAGE: `$ run pather.ns [target]");
        return;
    }
    let target = ns.args[0];
    // if (!ns.serverExists(target)){
    //     ns.tprint("ERROR: Cannot resolve hostname: " + target);
    //     return;
    // }
    ns.tprint("Starting at origin: " + ns.getHostname());
    let path = traverse(ns, ns.getHostname(), target);
    if (path == -1){
        ns.tprint(`ERROR: Could not find host with ${target} in the name.`);
        return;
    }
    path[0] = 'connect '+path[0];
    ns.tprint(path.join('; connect '));
}


function traverse(ns, origin, substring, cur_path=[]) {
    let regex = RegExp(substring, "i");
    let path = cur_path.slice();
    path.push(origin);
    // if 'origin' is equal to 'target', we're done! return the path
    ns.print(path);
    if (regex.test(origin)){
        return path.slice(1);
    }
    
    let nodes = ns.scan(origin);
    if (nodes.length === 0){ 
        ns.print("failing because there is no possible path.");
        return -1;
    }
    
    while (nodes.length !== 0) {
        let node = nodes.pop();
        if (path.includes(node)){
            continue;
        } else {
            let new_path = traverse(ns, node, substring, path);
            if (new_path != -1) {
                return new_path;
            }
        }
    }
    ns.print("failing because current tree failed.");
    return -1;
}
