import { container } from "../../deps.ts";

import JsonCacheProvider from "./providers/CacheProvider/implementations/JsonCacheProvider.ts";
import ICacheProvider from "./providers/CacheProvider/models/ICacheProvider.ts";

import GitIgnoreTemplateProvider from "./providers/TemplateProvider/implementations/GitIgnoreTemplateProvider.ts";
import ITemplateProvider from "./providers/TemplateProvider/models/ITemplateProvider.ts";

container.registerSingleton<ICacheProvider>(
  "CacheProvider",
  JsonCacheProvider,
);

container.registerInstance<ITemplateProvider>(
  "TemplateProvider",
  container.resolve(GitIgnoreTemplateProvider),
);
