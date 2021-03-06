<h1 align="center">GitIgnore</h1>

<p align="center">
  <i>Small command-line utility that adds new entries to your .gitignore</i>
</p>

<p align="center">
<img src=https://user-images.githubusercontent.com/72674879/139859742-215a613a-0d0d-4d22-ac04-5a595124fd61.gif alt="using the search feature"></img>
</p>

## Requirements

- [Deno](https://deno.land)

## Compatibility

- ✅ Linux
- ✅ Windows
- ❌ MacOS (not tested)

## Install

```sh
deno install --unstable --allow-env --allow-net --allow-read --allow-write https://deno.land/x/gitignore/mod.ts
```

## Usage

```sh
# add new files (if a .gitignore does not exist, it will be created)
gitignore node_modules/ "*.out" "*.o"

# list available languages/frameworks
gitignore -s

# or just get the template for a language
gitignore -l rust

# supports pipes
curl -fLw '\n' https://www.gitignore.io/api/node | gitignore -v

# see help for more
gitignore --help
```
