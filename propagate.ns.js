export async function main(ns){
    
    let sourceFile = ns.args[0];
    if (!sourceFile){
        ns.tprint("ERROR: No source file supplied.");
        ns.tprint("Usage: `run propagate.ns [filename]`");
        return;
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
        ns.scp(sourceFile, 'home', node);
    }
    
}