/*
25 hack threads to every weaken thread
12.5 grow threads to every weaken thread

if waiting for a weaken call with every grow/hack call, can use a full 25 hack or 12 grow per weaken

NOTES:
    Right now the script will just decide how much ram it can work with at the start, and keep with that value.
    that could cause some problems; For one, it means that if ram is really low at runtime, it'll think it has
    less ram than it could use. Secondly, it could lead to situations where multiple daemons are running and
    one thinks it has a certain amount of ram, then another uses up some ram, and suddenly there's less ram than
    the first daemon thinks it has, which will lead to crashing out due to low ram.
    
    the fix is to check for ram every cycle in all stages. Will fix eventually.
*/

export async function main(ns) {
    let target = ns.args[0];
    let reserved_ram = ns.args[1];
    
    // target argument validation
    if (!target || !ns.serverExists(target)) {
        ns.tprint("ERROR: Invalid argument target ($ run daemon.ns <target>)");
        return;
    }
    
    else if (!ns.hasRootAccess(target)){
        ns.tprint("ERROR: No root access on target: "+target);
        return;
    }
    else if (ns.getServerRequiredHackingLevel(target) > ns.getHackingLevel()) {
        ns.tprint("ERROR: target hack level requirement too high");
        return;
    }

    // 1) minimise security level
    // 1.1) determine minimum sec level
    // 1.2) use all available threads to weaken()
    // 1.3) repeat 1.2 until minimum sec level reached
    await minimizeSecurity(ns, target, reserved_ram);

    // repeat until killed
    while (true) {
        // 2) maximise money in server
        // 2.1) determine max money
        // 2.2) determine number of thread groups
        //      (13 threads - 12 grow, 1 weaken,)
        // 2.3) use all available threads to grow and weaken
        //      at same time, using given ratio (top of the file)
        // 2.4) repeat 1.3 until money is maxed
        await maximizeCash(ns, target, reserved_ram);
        
        // 3) skim money from the server, never dropping below 90%
        //    of max money, as well as keeping sec level at minimum
        // 3.1) determine what 0.1 of max money is
        // 3.2) determine how many hack threads to skim that much money
        // 3.3) determine how many hack threads can be employed in general
        // 3.4) use the smaller of either the amount from 3.2 or 3.3
        // 3.5) use concurrent weaken threads to cover security loss from hack threads
        // 3.6) go back to step 2
        await startHack(ns, target, reserved_ram);
    }
}

async function minimizeSecurity(ns, target, reserved_ram) {
    let min_sec = ns.getServerMinSecurityLevel(target);
    while(ns.getServerSecurityLevel(target) > min_sec) {
        let threads = getThreads(ns, reserved_ram);
        let wait_time = (ns.getWeakenTime(target)*1000)+2000;
        // let's try to optimise the number of threads we use
        // this will allow running more than one daemon on systems
        // that have a lot of RAM like a mid-game home PC.
        // In this case it's pretty simple, we get the difference
        // between current sec level and min sec level, and divide
        // by 0.05.
        let diff = ns.getServerSecurityLevel(target) - min_sec;
        let t_needed = Math.ceil(diff/0.05); // we always want to round up.
        // We use the lesser of the number of threads needed or the number of threads we can utilise.
        let t_actual = Math.min(t_needed, threads);
        ns.run("weaken.script", t_actual, target);
        await ns.sleep(wait_time);
    }
    return;
}

async function maximizeCash(ns, target, reserved_ram) {
    let max_cash = ns.getServerMaxMoney(target);
    
    // try to optimise the number of grow/weaken threads used, so
    // multiple daemons can be run on high-RAM systems.
    
    while(ns.getServerMoneyAvailable(target) < max_cash) {
        let threads = getThreads(ns, reserved_ram);
        // work out how many threads it would take to raise it that amount in one go.
        // growthAnalyze() determines how many threads are needed to raise current money
        // by a decimal factor, so we need to work out which factor multiplying the current
        // money by will max out the money. That equation is: cur_cash * desired_factor = max_cash.
        // that means max_cash / cur_cash = desired_factor.
        
        // we should probably watch out for some weirdness that happens when all the cash is gone.
        // growthAnalyze will return stuff like Infinity in those cases.
        // so we can just skip all of that if money's at zero (which, ideally, it shouldn't be.)
        // mistakes happen.
        let t_weaken_actual = Math.floor(threads/13)
        let t_grow_actual = t_weaken_actual * 12;
            
        // if the needed threads for both grow and weaken are more than the threads we have,
        // we need to divvy up the threads we can use such that we use all available threads
        // while still running enough weaken() threads to keep security level down.
        // so the default values utilize all available threads.
        // then we check if we can get away with less. If we can, we do that instead.
        
        if (ns.getServerMoneyAvailable(target) > 0) {
            let factor = max_cash / ns.getServerMoneyAvailable(target);
            let t_grow_needed = Math.ceil(ns.growthAnalyze(target, factor));
            // with the current method of waiting for a weaken() cycle with every grow cycle,
            // we need 1 weaken() to every 12 grow().
            let t_weaken_needed = Math.ceil(t_grow_needed/12);
            if ((t_grow_needed + t_weaken_needed) <= threads) {
                t_grow_actual = t_grow_needed;
                t_weaken_actual = t_weaken_needed;
            }
        }
        
        let wait_time = (ns.getWeakenTime(target)*1000)+2000;
        ns.run("grow.script", t_grow_actual, target);
        ns.run("weaken.script", t_weaken_actual, target);
        await ns.sleep(wait_time);
    }
    return;
}

async function startHack(ns, target, reserved_ram) {
    let threads = getThreads(ns, reserved_ram);
    // determine how many threads can be dedicated
    let t_hack;
    let t_weaken;
    if (threads < 26) {
        t_hack = threads-1;
        t_weaken = 1;
    } else {
        t_hack = Math.floor(threads/26)*25;
        t_weaken = Math.floor(threads/26);
    }
    // determine how many threads are needed
    // 10% of max money...
    let money_to_hack = ns.getServerMaxMoney(target)*0.1;
    let t_hack_needed = Math.ceil(ns.hackAnalyzeThreads(target, money_to_hack));
    // use smaller of needed hack threads or available hack 
    let t_hack_actual = Math.min(t_hack_needed, t_hack);
    
    // we can just use as many weaken threads as we want, so proceed to hack
    // the basic premise is to either skim only 10% or as much as possible, whichever is smaller
    let wait_time = (ns.getWeakenTime(target)*1000)+2000;
    ns.run("hack.script", t_hack_actual, target);
    ns.run("weaken.script", t_weaken, target);
    await ns.sleep(wait_time);
}

function getThreads(ns, reserved_ram){
    let ram = ns.getServerRam(ns.getHostname());
    ram = ram[0]-ram[1];
    if(ns.getHostname() == "home") {
        ram = ram-reserved_ram;
    }
    let threads = Math.floor(ram/1.75);
    if ((ram < 0) || (threads < 2)) {
        ns.tprint("ERROR: Insufficient RAM to operate daemon on server: " + ns.getHostname());
        ns.exit();
    }
    return threads;
}