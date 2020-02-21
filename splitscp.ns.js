// arguments are two comma-separated arrays
// array1 = scripts
// array2 = targets
//
// TODO: requires some work to get working with no bugs.
//       might be due to some limitation in how big
//       argument strings can be in the terminal.

export async function main(ns){
    let scripts = ns.args[0].split(",");
    let targets = ns.args[1].split(",");
    for (let i = 0; i < scripts.length; i++){
        for (let j = 0; j < targets.length; j++){
            ns.scp(scripts[i], targets[j]);
        }
    }
    ns.tprint("Success!");
}