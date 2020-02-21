// building a script gradually to figure out an optimal way to hack/grow/weaken a server.

// current plan:
//
// 1) weaken to minimum security level.
// 2) grow to max money
// 3) only hack enough to steal 10% of max
// 4) CONCURRENTLY keep sec level at minimum by running weaken in parallel
// 5) repeat from (2)
// ad infinitum

// note: For now, we will use only RAM on the home PC.
// in the future, we might communicate with another script
// which will be responsible for managing RAM across multiple
// separate servers, and try to use all computing power at
// our disposal for these goals.
//
// Note that this script assumes a significant amount of ram on the home PC... at least 64GB.
// In the future may we will write it to account better for very low home RAM.
// Alternatively, it can be run on a hacked/purchased server with significant RAM.
//
// Caveat: script breaks if all the money accidentally disappears from the target.
// gets stuck in a growing loop.

// abstracted money-maxing into its own function.
function maximize_cash(target, threads) {
    tprint("Maximising money.");
    // First, what is the target's max money?
    var max_cash = getServerMaxMoney(target);
    // And how much does it have right now?
    var cur_cash = getServerMoneyAvailable(target);
    if (cur_cash < max_cash) {
        tprint("Cash available/max cash: " + cur_cash + "/" + max_cash);
        // Work out the difference...
        var cash_diff = max_cash-cur_cash;
        // Which is what fraction of the current money?...
        var cash_decimal = 1 + (cash_diff/cur_cash); // 100% + %growth needed
        tprint("Growth needed: %" + ((cash_decimal-1)*100).toFixed(2));
        
        // grow() and weaken() scripts both take the same amount of RAM, so we already know how many threads we have to spare.
        // this value is still stored in 'threads'.
        // use growthAnalyze() to figure out how many threads it would take to grow by that fraction...
        var t_needed = growthAnalyze(target, cash_decimal);
        tprint("Number of grow() calls needed: " + Math.ceil(t_needed));
        // even with a really high hack skill, growth happens in small percentages.
        // that means t_needed is probably higher than threads/2, and we want to be able to run equal parts grow() and weaken().
        // if that's the case we just use as many threads as we can, divided by half. The other half will be used for weaken().
        // we cycle this until money is maxed.
        var wait = 0;
        if (t_needed > Math.floor(threads/2)) {
            // work out how many cycles are needed...
            var cycles = Math.ceil(t_needed/Math.floor(threads/2));
            var t_alloted = Math.floor(threads/2); // threads to allot to each of grow() and weaken() scripts.
            // weaken() takes slightly longer so we just wait for weaken() to finish.
            for (var i = 0; i < cycles; i++) {
                wait = (getWeakenTime(target)*1000)+3000;
                run("grow.script", t_alloted, target);
                run("weaken.script", t_alloted, target);
                sleep(wait); // wait is calculated in miliseconds.
            }
        } else {
                wait = (getWeakenTime(target)*1000)+3000;
                run("grow.script", t_needed, target);
                run("weaken.script", t_needed, target);
                sleep(wait); // wait is calculated in miliseconds.
        }
        return true;
    } else {
        tprint("Money already maximised!");
        return false;
    }
}


// to test, we will study foodnstuff, at hacking level 100~
var target = args[0]; // get a target from arguments
// Make sure the target actually exists
if (serverExists(target) === false) {
    tprint("ERROR: Cannot resolve hostname. Please check your spelling.");
    exit();
}

///////////////////////////////////////
//
// step 1: weaken to minimum sec level.
//
///////////////////////////////////////

tprint("Minimising security.");
// what's the target's minimum security level?
var min_sec = getServerMinSecurityLevel(target);
// to optimise, we will only use as many threads as we need.
var ram_needed = getScriptRam("weaken.script");
var ram_available = getServerRam(getHostname());
// getServerRam returns both total RAM and used RAM, total-used = available RAM.
ram_available = ram_available[0]-ram_available[1];
// subtract about 20GB of RAM for utility scripts, since we're running at home.
ram_available = ram_available-20;
// let's make sure we can actually run anything else
if (ram_available < ram_needed){
    tprint("Not enough RAM to proceed! Terminating...");
    exit();
}
// we have ram_available/ram_needed threads to work with. Rounded down.
var threads = Math.floor(ram_available/ram_needed);

// workout how much we need to lower the security level
var sec_level = getServerSecurityLevel(target);
var sec_diff = sec_level-min_sec;
if (sec_diff > 1) {
    var t_needed = sec_diff/0.05;
    tprint("Difference in security level from minimum: " + sec_diff);
    tprint("Number of threads of weaken.script that can be run: " + threads);
    tprint("Number of weaken() calls needed: " + t_needed);
    var cycles = Math.ceil(t_needed/threads);
    
    for (var i = 0; i < cycles; i++) {
        run("weaken.script", threads, target);
        sleep(Math.ceil((getWeakenTime(target)*1000)+3000));
    }
} else {
    tprint("Sec level already minimised! Target min/current sec levels: " +min_sec+"/"+sec_level);
}

///////////////////////////////////////
//
// step 2: Grow to max money.
//
///////////////////////////////////////

// this step needs to be done while keeping sec level to minimum

// every grow() call will raise security by 0.004.
// 250 threads will raise security by 1 point.
// 40 weaken() calls will lower security by 1 point.
// therefore, the amount of weaken() calls needed to counteract one cycle is equal to:
// (grow() threads per cycle / 250) * 40
//
// if we just grow as much as we can in one cycle, we might end up with a really high security level,
// which will make both subsequent grow() AND weaken() calls slower.
// however, calling weaken() will lower more security per call than calling grow() will raise it.
// Therefore, if equal numbers of both grow() and weaken() are called, and we wait until each
// weaken() call is finished, security will remain at or near minimum the entire time.
//
// Let's test this theory.
//
// NOTE: money maxing is now a function.
// NOTE: since grow raises security by 0.004 and weaken lowers it by 0.05, one weaken call can counteract
//       SEVERAL grow calls, 12.5 specifically, which can be rounded to 12.
//       So even though the timing is quite similar, there's room for optimisation
//       based on the security differences. Right now grow() and weaken() are being run
//       in a 1/1 ratio.
tprint("Calling money-max function...");
maximize_cash(target, threads);

///////////////////////////////////////
//
// step 3: Hack 10% of cash out of the server
//
///////////////////////////////////////

// In order to efficiently farm a server with minimal time spent performing actions which don't earn money,
// such as grow() and weaken(), we don't want to steal too much at once, as growing a percentage of 90% of
// server's max money is much more than growing a percentage of 10% of server's max money.
// Secondly, both hacking and growing will take longer if security level is higher.
// Therefore, we want to keep security level minimal at all times, and we only want to hack a small amount each cycle.
// MANY more hacks can be performed in the time it takes to perform one weak() or grow(), so it may not be possible
// to run them all simultaneously without some pretty complicated math. As it stands, each hack raises security
// by 0.002, each grow raises it by 0.004, and each weaken lowers by 0.05. That means one weaken() call is more
// than sufficient to cover a single hack() call. Specifically, 25 hacks can be covered with one weaken() call.
//
// Let's test the simpler method for now: start a hack while simulatenously starting enough weaken() calls to
// counteract its effect on security, then start a grow while doing the same.


tprint("Beginning hack loop...");
// Before developing the loop, let's see how much money we can hack at once with a single call.
// We have a VERY high hack level compared to the server's level, so it'll be good to know if it's very likely
// we would hack more than 10% in a single hack() call.
var per_hack_percent = hackAnalyzePercent(target);
tprint("% money stolen per hack(): %" + (per_hack_percent).toFixed(2));

// if it's much higher than 10, meaning we steal more than 10%, it might be time to move to a better server.
if (per_hack_percent > 10) {
    tprint("WARNING: hack calls too effective, which might harm time-efficiency.");
    // right now it seems this scenario is unlikely, so I won't develop it, YET.
} else {
    // Do we have at least 2 threads available?
    if (threads < 2) { // If not...
        tprint("ERROR: Insufficient RAM for hack loop!");
        exit(); // terminate immediately.
    }
    else if (threads < 26) {
        var cycle_units = 1;
        var weak_per_cycle = 1;
        var hack_per_cycle = threads-1;
    } else {
        var cycle_units = Math.floor(threads/26);
        var weak_per_cycle = cycle_units;
        var hack_per_cycle = cycle_units*25;
    }
    
    // Eveything past this point is affected by hack skill level, and so must be inside the loop body.
    // This is because we want accurate numbers each time we iterate.
    while (true) {
        tprint("Hacking...");
        // how many cycle units needed to get 10% of total cash?
        var cash_to_hack = getServerMaxMoney(target)*0.1; // 10% of max cash
        var units_needed = Math.ceil(hackAnalyzeThreads(target, cash_to_hack)/25);
        
        // if we only need one unit, but we can process more units per cycle, we only run enough for one unit
        if (units_needed == 1 && cycle_units > 1) {
            var wait = (getWeakenTime(target)*1000)+3000;
            run("hack.script", 25, target);
            run("weaken.script", 1, target);
            sleep(wait);
        }
        // otherwise, if the amount of units we need is less than the units we can process per cycle,
        // we only process one cycle with only as many units as we need
        else if (units_needed < cycle_units) {
            var wait = (getWeakenTime(target)*1000)+3000;
            var hack_threads = units_needed * 25;
            var weak_threads = units_needed;
            run("hack.script", hack_threads, target);
            run("weaken.script", weak_threads, target);
            sleep(wait);
        }
        // or we simply run as many cycles as we need to process enough units
        else {
            // unfortunately we have to repeat the wait calc in order to get an accurate time in every case
            var cycles = units_needed/cycle_units;
            for (var i = 0; i < cycles; i++){
                var wait = (getWeakenTime(target)*1000)+3000;
                run("hack.script", hack_per_cycle, target);
                run("weaken.script", weak_per_cycle, target);
                sleep(wait);
            }
        }
        
        maximize_cash(target, threads);
    }
}