/** @param {NS} ns */
export async function main(ns) {
    const job = JSON.parse(ns.args[0]);
    let delay = job.end - job.time - Date.now();
    if (delay < 0) {
        ns.tprint(`WARN: Batch ${job.type} was ${-delay}ms late. (${job.end})\n`);
        delay = 0;
    }
    await ns.hack(job.target, { additionalMsec: delay });
    const end = Date.now();
}