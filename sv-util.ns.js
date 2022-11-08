// a collection of utilities for interacting with
// and managing purchased servers manually.
//
// the main purpose of this library is to help with
// the early game, where you want to be strategic
// with server purchases.
//
// it can be completely ignored, especially if how you decide
// to buy servers is by starting from a very generous amount of ram...
// but you can also find out pricing using this library, which may
// better inform you about how much ram to aim for early-game.

let sv_library = {
    "help" : printHelp,
    "list" : listPrices,
    "buy" : attemptPurchase,
    "del" : attemptDelete,
};

export async function main(ns){
    if (!ns.args[0] || !sv_library.hasOwnProperty(ns.args[0])){
        ns.tprint("ERROR: Empty or invalid function argument.\nUsage: `$ run sv-util.ns [function]`");
        return;
    }
    let args = ns.args.slice(1);
    sv_library[ns.args[0]](ns, args);
    return;
}

function listPrices(ns, args) {
    var formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    for (let exp = 1; exp <= 20; exp++) {
        let ram = Math.pow(2, exp);
        let price = ns.getPurchasedServerCost(ram);
        ns.tprint("A server with " + ram + "GB of RAM (2<sup>"+exp+"</sup>) costs "+formatter.format(price));
    }
}

function attemptPurchase(ns, args) {
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
            return;
        }
    }
    ns.tprint("ERROR: Too many servers bought, delete one first.");
    return;
}

function attemptDelete(ns, args) {
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
    return;
}

function printHelp(ns, args) {
    ns.tprint("Current valid cli flags are:");
    ns.tprint("  help          - displays this helpfile.");
    ns.tprint("  list          - displays server prices per ram amount (in powers of 2)");
    ns.tprint("  buy           - takes a num argument, attempts to buy a server.");
    ns.tprint("  del           - takes a str argument, attempts to delete an existing server.");
}
