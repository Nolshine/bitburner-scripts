export async function main(ns) {
    if (ns.args.length < 2) {
        ns.tprint("ERROR: Incorrect number of arguments");
        return;
    }
    let reserve_ram = ns.args[0]
    let target_list = ns.args[1];
    let host = ns.getHostname();
    
    move_scripts(ns, host);
    
    ns.tprint(target_list);
    let targets = target_list.split(',');
    
    targets.forEach(element => run_daemon(ns, element, reserve_ram));
}

function run_daemon(ns, target, reserve_ram) {
    ns.tprint("Running daemon: " + target);
    ns.run("daemon.ns", 1, target, reserve_ram);
}

function move_scripts(ns, host) {
    let scripts = ["daemon.ns", "hack.script", "grow.script", "weaken.script"];
    ns.scp(scripts, "home", host);
}