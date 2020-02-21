// target weak server and fire off as many threads of weaken at it as possible continusously
// needs some adjustment to figure out the magic spooling/unspooling time of .script files
// alternatively, make it wait until it has enough ram before running another batch.

// NOTE - alternative solution implemented for now.

export async function main(ns) {
    let target = ns.args[0];
    let reserve_ram = ns.args[1];
    if (!target || !ns.serverExists(target)) {
        ns.tprint("ERROR: Invalid target specified.");
        return;
    }
    while (true) {
        let ram = ns.getServerRam(ns.getHostname());
        ram = ram[0]-ram[1];
        ram = ram-reserve_ram;
        let t = Math.floor(ram/1.75);
        if (t < 1 || t == Infinity || t === undefined) {
            await ns.sleep(1000);
            continue;
        }
        // do until killed
        let sleep_time = (ns.getWeakenTime(target)*1000)+3000;
        ns.run("weaken.script", t, target);
        await ns.sleep(sleep_time);
    }
}