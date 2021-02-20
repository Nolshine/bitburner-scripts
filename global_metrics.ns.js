// Script for comparing the metrics of different servers
// and returning the best current target.
// Atm it just uses max money, I was attempting to use
// more clever metrics before but there seems to be little point
// when comparing effort to result

export async function main(ns){
    
    let visited = ['home'];
    let nodes = ns.scan('home');
    
    let bestTarget = createMetric(ns, 'foodnstuff');
    
    while (nodes.length > 0){
        let node = nodes.pop();
        if (visited.includes(node)){
            continue;
        }
        
        let metric = createMetric(ns, node);
        
        if (compareMetrics(ns, metric, bestTarget)){
            bestTarget = metric;
        }
        visited.push(node);
        nodes = nodes.concat(ns.scan(node));
    }
    
    if (bestTarget === null){
        ns.tprint("Could not find target, please check for bugs");
        return;
    }
    ns.tprint(bestTarget.name);
    ns.tprint("min Sec: "+bestTarget.minSecLevel);
    ns.tprint("Max cash: $"+bestTarget.maxCash);
    ns.tprint("Growth factor: "+bestTarget.growthFactor);
    ns.tprint("Level requirement: "+bestTarget.requiredLevel);
}


function createMetric(ns, hostname){
    
    return {
        name: hostname,
        minSecLevel: ns.getServerMinSecurityLevel(hostname),
        maxCash: ns.getServerMaxMoney(hostname),
        growthFactor: ns.getServerGrowth(hostname),
        requiredLevel: ns.getServerRequiredHackingLevel(hostname)
    }
}

function compareMetrics(ns, a, b){
    ns.tprint("Comparing: " + a.name + ", " + b.name);
    // returns true is A is 'better' than B
    
    ns.tprint(a.requiredLevel);
    if (!a || !a.maxCash || !ns.hasRootAccess(a.name) || a.requiredLevel > ns.getHackingLevel()){
        return false;
    }
    
    return a.maxCash > b.maxCash;
}