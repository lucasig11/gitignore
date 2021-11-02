import * as ink from "https://deno.land/x/ink@1.3/mod.ts";
import { readLines } from "https://deno.land/std@0.113.0/io/buffer.ts";
import { parse } from "https://deno.land/std@0.113.0/flags/mod.ts";
import { wait } from "https://deno.land/x/wait@0.1.12/mod.ts";
import { Input } from "https://deno.land/x/cliffy@v0.20.1/prompt/input.ts";
import { Toggle } from "https://deno.land/x/cliffy@v0.20.1/prompt/toggle.ts";

export { ink, Input, parse, readLines, Toggle, wait };
