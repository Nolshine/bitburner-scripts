export async function main(ns){
    let script = ns.args[0];
    let scriptArgs = ns.args.slice(1);
    if (!script){
        ns.tprint("ERROR: No script supplied.");
        ns.tprint("Usage: `run netrun.ns [scriptname]( arg0, arg1... )`");
        return;
    }
    let scriptRam = ns.getScriptRam(script);
    
    let visited = ['home'];
    let nodes = ns.scan('home');
    
    while (nodes.length > 0){
        let node = nodes.pop();
        if (visited.includes(node)){
            continue;
        }
        nodes = nodes.concat(ns.scan(node));
        visited.push(node);
        
        if (!ns.hasRootAccess(node)){
            continue;
        }
        let [ramTotal, ramUsed] = ns.getServerRam(node);
        let ramAvailable = ramTotal-ramUsed;
        if(ramAvailable < scriptRam){
            continue;
        }
        let threads = Math.floor(ramAvailable/scriptRam);
        ns.exec(script, node, threads, scriptArgs);
        await ns.sleep(1000);
    }
}