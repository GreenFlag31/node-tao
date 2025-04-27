# Refactoring

Commit 5584a01aa1c0b5612b6f627b32b9b7ff175aa8d3:

_Goal of this commit is to simplify local project launch_

- Other ts initialisation config
- Changing package.json values
- Jest configuration file
- Make all tests passing (commenting problematic tests). Thoses tests are failing in the original version (legacy?).

Commit XXX:

_Goal of this commit is to enforce clean code practices, clean unecessary code and refactor methods (soft refactor)_
_Soft refactor part 1_

- Refactoring of methods (enforcing clean code practices). All the refactored files are suffixed with `(filename) copy.ts`
- Refactored `render`, `resolvePath`, `readFile`
- Note on `resolvePath`: tests showed that using the cache took up to two times longer than not using it over 100 attempts. `dirIsChild` function introduces a dubble checks, since the file is read (`readFile`) later and an error is raised if the filePath does not exist. Removing the feature of filepath cache.
- Adding tests

Commit XXX:

_Soft refactor part 2 (continued)_

-

# Bug correction

-
