// crack all servers possible on the net


export async function main(ns){
    
    let crackedServers = [];
    
    let cracks = ["brutessh","ftpcrack","relaysmtp","httpworm","sqlinject"];
    let crackFuncs = [ns.brutessh, ns.ftpcrack, ns.relaysmtp, ns.httpworm, ns.sqlinject];
    let crackFuncsToUse = [];
    
    let available = 0;
    let availMsg = "Cracks available: ";
    for (let i = 0; i < cracks.length; i++){
        if (ns.fileExists(cracks[i]+".exe", 'home')){
            available += 1;
            crackFuncsToUse.push(crackFuncs[i]);
            availMsg = availMsg + cracks[i] + " ";
        }
    }
    ns.tprint(availMsg);
    
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
    
    for (let i = visited.length; i > 0; i--){
        let node = visited.pop();
        if (node === 'home' || ns.getServerRam[0] < 8 || node.substring(0,6) == "pserv"){
            continue;
        }
        let portsNeeded = ns.getServerNumPortsRequired(node);
        if (portsNeeded > available){
            continue;
        }
        for (let i = 0; i < available; i++){
            crackFuncsToUse[i](node);
        }
        ns.nuke(node);
        if (!ns.hasRootAccess(node)) {
            ns.tprint("ERROR: " + node + " should have had root access but doesn't. Please review code");
            return;
        }
        crackedServers.push(node);
    }
    ns.tprint("Successfully cracked: " + crackedServers);
    
}
