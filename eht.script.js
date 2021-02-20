// Defines the "target server", which is the server
// that we're going to hack. In this case, it's "foodnstuff"
var target = args[0];

if (!hasRootAccess(target)){
    tprint("ERROR: No root access at target: " + target);
    exit();
}

// Defines how much money a server should have before we hack it
// In this case, it is set to 75% of the server's max money
var moneyThresh = getServerMaxMoney(target) * 0.75;

// Defines the maximum security level the target server can
// have. If the target's security level is higher than this,
// we'll weaken it before doing anything else
var securityThresh = getServerMinSecurityLevel(target) + 5;

// Infinite loop that continously hacks/grows/weakens the target server
while(true) {
    if (getServerSecurityLevel(target) > securityThresh) {
        // If the server's security level is above our threshold, weaken it
        weaken(target);
    } else if (getServerMoneyAvailable(target) < moneyThresh) {
        // If the server's money is less than our threshold, grow it
        grow(target);
    } else {
        // Otherwise, hack it
        hack(target);
    }
}