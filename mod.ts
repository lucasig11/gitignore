//! Small command-line utility for adding new entries to `.gitignore`
///
/// # Install:
/// deno install --allow-read --allow-write mod.ts

import * as ink from 'https://deno.land/x/ink@1.3/mod.ts'

const args = Deno.args;

if (args.length == 0) {
    printUsage();
    Deno.exit(1);
}

function printUsage() {
    console.log("gitignore v1.0.0");
    console.log(ink.colorize("\n\t<yellow>USAGE:</yellow> gitignore [PATHS]..."));
    console.log(ink.colorize("\n\t<yellow>EXAMPLE:</yellow> gitignore node_modules/ \"*.out\""));
    console.log(ink.colorize("\n\t<yellow>NOTE:</yellow> <green>gitignore</green> will not add paths that already exist in .gitignore"));
}

const encoder = new TextEncoder();
const ignoredFiles = await getIgnoredFiles();

const dedup = args.filter(file => {
    if (ignoredFiles.some(ignoredFile => file === ignoredFile)) {
        console.log(ink.colorize(`    <yellow><b>${file}</b></yellow> is already ignored, skipping...`));
        return false;
    }
    return true;
});

for (const file of dedup) {
    console.log(ink.colorize(`    <green>Adding</green> <yellow><b>${file}</b></yellow> to .gitignore`));
    await Deno.writeFile(".gitignore", encoder.encode(file + "\n"), { append: true });
}

async function getIgnoredFiles(): Promise<string[]> {
    try {
        const content = await Deno.readFile(".gitignore");
        const lines = new TextDecoder().decode(content).split("\n");
        return lines;
    } catch (e) {
        if (e instanceof Deno.errors.NotFound) {
            return [];
        }
        throw e;
    }
}

