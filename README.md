<h1 align="center">GitIgnore</h1>

Small command-line utility that adds new entries to your `.gitignore`.


## Install

```sh
deno install -f --allow-read --allow-write -n gitignore https://raw.githubusercontent.com/lucasig11/gitignore/master/mod.ts
```

## Usage

```sh
# add new files (if a .gitignore does not exist, it will be created)
gitignore node_modules/ "*.out" "*.o"

# supports pipes
curl -fLw '\n' https://www.gitignore.io/api/node | gitignore -v

# see help for more
gitignore --help
```
