import GitIgnoreCli from "./cli.ts";
import CliError from "./shared/error.ts";
import { parseArgs } from "./shared/args.ts";
import { container, red } from "./deps.ts";

import "./shared/container/mod.ts";

try {
  const args = await parseArgs();
  const cli = container.resolve(GitIgnoreCli);
  await cli.run(args);
} catch (e) {
  if (e instanceof CliError) {
    console.error(`${red("error:")} ` + e.message);
    Deno.exit(e.exitCode);
  } else {
    console.error(
      `${
        red("error:")
      } an unexpected error occurred. Please file an issue at https://github.com/lucasig11/gitignore/issues \n`,
      red(e.toString()),
    );
    Deno.exit(1);
  }
}
