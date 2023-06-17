# bitburner-scripts
just my collection of tools for the hacking game [BitBurner.](https://danielyxie.github.io/bitburner/)
Some of them are incomplete or have outstanding issues.
There are none that should cause permanent damage to a run.
Even so, use at own risk.

## Batching
In the [shotgun](https://github.com/Nolshine/bitburner-scripts/tree/master/shotgun) directory there is a WIP shotgun batcher, and its worker scripts.
It currently uses a very low hardcoded limit on the number of batches.
This is because the code is too inefficient, so on the hardware I currently use to play, it causes long hangs.
It also seems to have some other problems.
In the [batching](https://github.com/Nolshine/bitburner-scripts/tree/master/batching) folder is a protobatcher and its worker scripts, as well as a few extra tools.
It works well enough, but it's quite slow. Only 1 batch at a time. Still way better than `deamon.js`.

Note that both attacker scripts need the workers from their own folder, and both use `util.js` from the `batching` folder.

## The root folder
Contains old code and tools, some pserver management stuff, several obsolete scripts kept for posterity, as well as my old attack script, `daemon.js`.

# Older scripts I still use (some are in the batching folder):
* `netkill.js` - useful to alias. Runs through the network killing all scripts. There's a button that does this but it reloads the game.
* `pather.js` - very useful tool. Can be run from anywhere to print out a path to another server. You can input a partial name and it'll try to search for it. The printout can be copied and pasted into the terminal to isntantly connect to the destination.
* `sv-util.js` - This is an informatics and manual control tool for pservers. `run sv-util.js help` to see a list of options you can use.
* `svab.js` - This is an automatic tool for purchasing and upgrading pservers, starting with a minimum size you can set. Note that it is greedy, it'll use the largest amount of money it can spend for each operation.
* `prime.js` - Has nothing to do with maths. Runs through the network, opening ports and nuking whatever it can.
* `targ.js` - Prints out a list of targets of value, in descending order.
* `prep.js - A separate tool for minimising security and maximising money on a server. Only uses script-local ram.

# Play strategy
I will only cover the earlier part of the game, which I have greater understanding of.
This also helps prevent spoilers from ruining your experience.
## Fresh install, no home ram upgrades, no augs
Visit rothman uni, get 10-20 levels of hacking.
Switch to crime, running any that have a 20%+ chance of success. This adds a little passive income/exp stream.
Use your preferred attack method on n00dles, from my collection or otherwise. N00dles is not very profitable but it is very fast to prepare and attack.
The resulting income should quickly let you buy cracks and gain access to more of the network, and therefore more ram.
Consider running `svab.js` once you have 2-3 cracks. Use `targ.js` if you like to determine good farming targets.
Once your pserver ram is saturated, I recommend expanding home ram. It's very useful to get this done at least a couple of times before resetting for the first time.
Follow jump3r's hints to progress. :)
## Every reset thereafter
Do the exact same stuff, noting how much faster hacking level and therefore your income increase. As home ram grows you'll have more room to play with your own scripts. It should also give enough room for you to try the shotgun batcher, if you did not get a different, better one.
Your voyage has only begun... `run fl1ght.exe`
