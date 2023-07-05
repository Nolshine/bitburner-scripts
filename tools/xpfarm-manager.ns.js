// semi-auto tool for priming and running xp farmers in a range of purchased servers


export async function main(ns){
    let start = ns.args[0];
    let stop = ns.args[1];
    let target = ns.args[2];
    for (let i = start; i < stop; i++){
        let sv = "pserv-"+i;
        ns.scp("xp-farmer.ns", sv);
        ns.scp("weaken.script", sv);
        ns.killall(sv);
        ns.exec("xp-farmer.ns", sv, 1, target, 10);
    }
}