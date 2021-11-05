import {
  assert,
  assertArrayIncludes,
  assertEquals,
} from "https://deno.land/std@0.113.0/testing/asserts.ts";
import { Spy, spy } from "https://deno.land/x/mock@0.10.1/spy.ts";
import { test, TestSuite } from "https://deno.land/x/test_suite@0.9.0/mod.ts";
import { Stub, stub } from "https://deno.land/x/mock@0.10.1/stub.ts";
import { Writer } from "../shared/util.ts";
import { Arguments } from "../shared/args.ts";
import FakeCacheProvider from "../shared/container/providers/CacheProvider/fakes/FakeCacheProvider.ts";
import FakeTemplateProvider from "../shared/container/providers/TemplateProvider/fakes/FakeTemplateProvider.ts";
import GitIgnoreCli from "../cli.ts";

interface CliSuiteContext {
  fakeCacheProvider: FakeCacheProvider;
  fakeTemplateProvider: FakeTemplateProvider;
  cli: GitIgnoreCli;
  mocks: Stub<unknown>[];
}

const defaultCliArgs: Arguments = {
  lang: "",
  entries: [],
  clearCache: false,
  search: false,
  dryRun: false,
  overwrite: false,
  confirm: false,
  verbose: false,
  version: false,
  help: false,
};

const cliSuite: TestSuite<CliSuiteContext> = new TestSuite({
  name: "[cli]",
  beforeEach: (ctx: CliSuiteContext) => {
    const fakeCacheProvider = new FakeCacheProvider();
    const fakeTemplateProvider = new FakeTemplateProvider(fakeCacheProvider);
    const cli = new GitIgnoreCli(fakeCacheProvider, fakeTemplateProvider);
    // Mock I/O functions
    const stubWriter = stub(Writer, "writeAllSync");
    const stubWriteAllSync = stub(Deno, "writeAllSync", () => undefined);
    const stubReadFile = stub(
      Deno,
      "readTextFile",
      () => Promise.resolve(""),
    );
    Object.assign(ctx, {
      cli,
      fakeCacheProvider,
      fakeTemplateProvider,
      mocks: [stubWriter, stubWriteAllSync, stubReadFile],
    });
  },
  afterEach: ({ mocks }: CliSuiteContext) => {
    for (const stub of mocks) {
      stub.restore();
    }
  },
});

test(
  cliSuite,
  "adds entries to .gitignore",
  async ({ cli }: CliSuiteContext) => {
    const writerSpy = spy(Writer, "writeTextFileSync");

    try {
      await cli.run({
        ...defaultCliArgs,
        entries: ["test.out", "test.file", "test/"],
      });
      assertEquals(writerSpy.calls, [{
        args: [".gitignore", "test.out\ntest.file\ntest/\n", { append: true }],
        self: Writer,
        returned: undefined,
      }]);
    } finally {
      writerSpy.restore();
    }
  },
);

test(cliSuite, "overwrites .gitignore", async ({ cli }: CliSuiteContext) => {
  const writerSpy = spy(Writer, "writeTextFileSync");

  try {
    await cli.run({
      ...defaultCliArgs,
      entries: ["test.out", "test.file", "test/"],
      overwrite: true,
    });
    assertEquals(writerSpy.calls, [{
      args: [".gitignore", "test.out\ntest.file\ntest/\n", { append: false }],
      self: Writer,
      returned: undefined,
    }]);
  } finally {
    writerSpy.restore();
  }
});

test(
  cliSuite,
  "saves fetched template in cache",
  async ({ cli, fakeCacheProvider }: CliSuiteContext) => {
    const cacheSpy: Spy<FakeCacheProvider> = spy(fakeCacheProvider, "set");

    try {
      await cli.run({ ...defaultCliArgs, lang: "test" });

      assertEquals(cacheSpy.calls, [{
        args: ["test", "*.out\nnode_modules/\n*.o\ntmp/\n!tmp/.gitkeep"],
        self: fakeCacheProvider,
        returned: Promise.resolve(),
      }]);

      assert(fakeCacheProvider.has("test"));

      assertArrayIncludes(
        fakeCacheProvider.get("test"),
        "*.out\nnode_modules/\n*.o\ntmp/\n!tmp/.gitkeep",
      );
    } finally {
      cacheSpy.restore();
    }
  },
);

test(
  cliSuite,
  "clears cache",
  async ({ cli, fakeCacheProvider }: CliSuiteContext) => {
    const clearCacheSpy = spy(fakeCacheProvider, "clear");

    try {
      await cli.run({
        ...defaultCliArgs,
        clearCache: true,
      });
      assertEquals(clearCacheSpy.calls.length, 1);
    } finally {
      clearCacheSpy.restore();
    }
  },
);
