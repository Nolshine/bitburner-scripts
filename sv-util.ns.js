/** @param {NS} ns */
export async function main(ns){
    var commands = {
        "help": printHelp,
        "list": listPrices,
        "buy": tryBuy,
        "del": tryDel,
        "poll": pollPservs,
        "rn": renamePserv,
    };

    if (!ns.args[0] || !commands.hasOwnProperty(ns.args[0])){
        ns.tprint("ERROR: Empty or invalid function argument.\nUsage: `$ run sv-util.ns [function]`");
        return;
    }

    let args = ns.args.slice(1);
    commands[ns.args[0]](ns, args);
    return;
}

/** param {NS} ns */
function renamePserv(ns, args){
    let sv = args[0];
    let name = args[1];
    if (!ns.serverExists(sv)){
        ns.tprint(`ERROR: ${sv} is not a valid server.`);
    }
    if (!ns.renamePurchasedServer(sv, name)){
        ns.tprint(`ERROR: Could not rename ${sv} to ${name}.`);
    }
}

function pollPservs (ns, args){
    let prefix = 'pserv-';
    for (let i = 0; i < 25; i++) {
        let name = `${prefix}${i}`;
        if (ns.serverExists(name)){
            let ram = ns.getServerMaxRam(name);
            ns.tprint(`${name}: ${ns.formatRam(ram)}`);
        }
    }
}

function printHelp(ns, args){
    ns.tprint("Current valid cli flags are:");
    ns.tprint("  help          - displays this helpfile.");
    ns.tprint("  list          - displays server prices per ram amount (in powers of 2)");
    ns.tprint("  buy           - takes an exponent (of 2) as an argument, attempts to buy a server.");
    ns.tprint("  del           - takes a server name argument, attempts to delete an existing server.");
}

function listPrices(ns, args){
    for (let exp = 1; exp <= 20; exp++) {
        let ram = Math.pow(2, exp);
        let f_ram = ns.formatRam(ram);
        let price = ns.formatNumber(ns.getPurchasedServerCost(ram), 2);
        ns.tprint(`A server with ${f_ram} of RAM (2^${exp}) costs \$${price}.`);
    }
}

function tryBuy(ns, args){
    let ram_factor = args[0];
    let ram = Math.pow(2, ram_factor);
    let f_ram = ns.formatRam(ram);
    if (!ram) {
        ns.tprint("ERROR: Required argument RAM not found.");
        return;
    }
    for (let i = 0; i < 25; i++) {
        let sv = "pserv-" + i;
        if(!ns.serverExists(sv)){
            if (ns.getServerMoneyAvailable("home") < ns.getPurchasedServerCost(ram)){
                ns.tprint("ERROR: Not enough money to buy server with " + f_ram + " RAM.");
                return;
            }
            ns.purchaseServer(sv, ram);
            ns.tprint("Bought server named: " + sv + " with " + f_ram + " RAM.");
            return;
        }
    }
    ns.tprint("ERROR: Too many servers bought, delete one first.");
    return;
}

function tryDel(ns, args){
    let target = args[0];
    if(!target) {
        ns.tprint("ERROR: Required argument targer_server not found.");
        return;
    }
    else if(!ns.serverExists(target)){
        ns.tprint("ERROR: No such server exists.");
        return;
    }
    ns.deleteServer(target);
    ns.tprint("Deleted server: " + target);
    return;
}