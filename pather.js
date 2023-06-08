/** @param {NS} ns */
// find path to specific server
export async function main(ns) {
    if (!ns.args[0]) {
        ns.tprint("ERROR: Missing required argument \"target\".\n(USAGE: `$ run pather.ns [target]");
        return;
    }
    let target = ns.args[0];
    if (!ns.serverExists(target)){
        ns.tprint("ERROR: Cannot resolve hostname: " + target);
        return;
    }
    ns.tprint("Starting at origin: " + ns.getHostname());
    let path = traverse(ns, ns.getHostname(), target);
		path[0] = 'connect '+path[0];
		ns.tprint(path.join('; connect '));
}


function traverse(ns, origin, target, cur_path=[]) {
    // traverse from 'origin' up to 'target', return the traverse path leading to 'target'.
    // only traverse each node once.
    //
    // alg is depth-first because the moment target is reached the function can finish
    // and in the majority of cases the target isn't likely to be at the very last path
    // attempted.
    //
    // 'path' isn't necessary to pass in from outside of the function, it is for use with
    // recursive function calls within 'traverse()'.
    
    // each time the function is called we make a local, shallow copy of 'cur_path',
    // because javascript closures make it so the argument refers to the same value
    // as long as it's used in the lexical environment of the original traverse() call.
    //
    // At least I think that's what's going on...
    let path = cur_path.slice();
    path.push(origin);
    // if 'origin' is equal to 'target', we're done! return the path
    ns.print(path);
    if (origin == target){
        return path.slice(1);
    }
    
    let nodes = ns.scan(origin); // first, scan all connections from 'origin'.
    if (nodes.length === 0){ // fail if there's nowhere to go.
        ns.print("failing because there is no possible path.");
        return -1;
    }
    
    while (nodes.length !== 0) {
        let node = nodes.pop();
        if (path.includes(node)){
            continue;
        } else {
            let new_path = traverse(ns, node, target, path);
            if (new_path != -1) {
                // if new_path isn't a fail, we succeeded! return it.
                return new_path;
            }
        }
    }
    ns.print("failing because current tree failed.");
    // if we couldn't find the target in any connection from origin, fail.
    return -1;
}
