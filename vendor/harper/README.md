Harper (harper.js 2.10.0), https://github.com/Automattic/harper, Apache-2.0 (see LICENSE).
Copied unmodified from the npm package `harper.js/dist` so the grammar engine runs locally with no third-party requests.

`harper_wasm_slim_bg.wasm` is an intentionally empty placeholder. Harper's loader first tries to initialise a "slim" build and ignores any failure; an empty file makes that attempt fail quietly instead of logging a 404, and avoids downloading a second 16 MB binary.
