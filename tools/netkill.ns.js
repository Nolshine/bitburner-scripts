// expected to be run on home pc, might change in the future

export async function main(ns){
    
    let visited = ['home'];
    let nodes = ns.scan('home');
    
    while (nodes.length > 0){
        let node = nodes.pop();
        if (visited.includes(node)){
            continue;
        }
        nodes = nodes.concat(ns.scan(node));
        visited.push(node);
        ns.tprint("Killing on: " + node);
        ns.killall(node);
    }
    
    ns.killall('home');
}