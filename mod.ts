import Cli from "./cli.ts";
import CliError from "./error.ts";
import { parseArgs } from "./args.ts";
import { red } from "./deps.ts";

const args = await parseArgs();
const cli = new Cli(args);

try {
  await cli.run();
} catch (e) {
  if (e instanceof CliError) {
    console.error(`${red("error:")} ` + e.message);
    Deno.exit(e.exitCode);
  } else {
    console.trace(
      `${
        red("error:")
      } an unexpected error occurred. Please file an issue at https://github.com/lucasig11/gitignore/issues \n`,
      e.toString(),
    );
    Deno.exit(1);
  }
}
