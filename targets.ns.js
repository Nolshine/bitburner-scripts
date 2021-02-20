export async function main(ns) {
    
    let numPortsArg = ns.args[0];
    
    if (typeof(numPortsArg) != "number" || numPortsArg < 0 || numPortsArg > 5){
        ns.tprint("ERROR: argument [num_ports] must be a numeric value between 0 and 5, inclusively.");
        ns.tprint("Usage: `run targets.ns [num_ports]`");
        ns.exit();
    }
    
    let visited = ['home'];
    let nodes = ns.scan('home');
    
    while (nodes.length > 0){
        let node = nodes.pop();
        if (visited.includes(node)){
            continue;
        }
        nodes = nodes.concat(ns.scan(node));
        visited.push(node);
    }
    
    let matches = [];
    
    for (let i = 0; i < visited.length; i++){
        let node = visited[i];
        if (ns.getServerNumPortsRequired(node) == numPortsArg && ns.getServerMaxMoney(node) > 0){
            matches.push(node);
        }
    }
    ns.tprint(matches);
}