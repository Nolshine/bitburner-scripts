// propagate daemon.ns and associated tool scripts to all rooted server

export async function main(ns) {
    let visited = ["home"];
    let ignore = [];
    for (let i = 0; i < 25; i++){
        ignore.push("pserv-"+i);
    }
    
    let nodes = ns.scan("home");
    
    while (nodes.length > 0){
        let node = nodes.pop();
        if (visited.includes(node) || ignore.includes(node)){
            continue;
        }
        visited.push(node);
        if(ns.hasRootAccess(node)) {
            ns.scp("daemon.ns", node);
            ns.scp("util.ns", node);
            ns.scp("hack.script", node);
            ns.scp("grow.script", node);
            ns.scp("weaken.script", node);
        }
        nodes = nodes.concat(ns.scan(node));
    }
}