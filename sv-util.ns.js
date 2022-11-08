/** @param {NS} ns */
export async function main(ns){
    var commands = {
        "help": printHelp,
        "list": listPrices,
        "buy": tryBuy,
        "del": tryDel,
    };

    if (!ns.args[0] || !commands.hasOwnProperty(ns.args[0])){
        ns.tprint("ERROR: Empty or invalid function argument.\nUsage: `$ run sv-util.ns [function]`");
        return;
    }

    let args = ns.args.slice(1);
    commands[ns.args[0]](ns, args);
    return;
}

function printHelp(ns, args){
    ns.tprint("Current valid cli flags are:");
    ns.tprint("  help          - displays this helpfile.");
    ns.tprint("  list          - displays server prices per ram amount (in powers of 2)");
    ns.tprint("  buy           - takes a num argument, attempts to buy a server.");
    ns.tprint("  del           - takes a str argument, attempts to delete an existing server.");
}

function listPrices(ns, args){
    var formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    for (let exp = 1; exp <= 20; exp++) {
        let ram = Math.pow(2, exp);
        let price = ns.getPurchasedServerCost(ram);
        ns.tprint("A server with " + ram + "GB of RAM (2<sup>"+exp+"</sup>) costs "+formatter.format(price));
    }
}

function tryBuy(ns, args){
    let ram = args[0];
    if (!ram) {
        ns.tprint("ERROR: Required argument RAM not found.");
        return;
    }
    for (let i = 0; i < 25; i++) {
        let sv = "pserv-" + i;
        if(!ns.serverExists(sv)){
            if (ns.getServerMoneyAvailable("home") < ns.getPurchasedServerCost(ram)){
                ns.tprint("ERROR: Not enough money to buy server with " + ram + "GB RAM.");
                return;
            }
            ns.purchaseServer(sv, ram);
            ns.tprint("Bought server named: " + sv + " with " + ram + "GB RAM.");
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
