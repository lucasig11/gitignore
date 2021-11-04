import GitIgnoreCli from "./src/cli.ts";
import CliError from "./src/error.ts";
import { parseArgs } from "./src/args.ts";
import { container, red } from "./src/deps.ts";

import "./src/container/mod.ts";

try {
  const args = await parseArgs();
  const cli = container.resolve(GitIgnoreCli);
  await cli.run(args);
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
