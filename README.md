# AKSO Client
This is a javascript library to interact with the AKSO API.

### Installation
This package is [available on npm](https://npmjs.com/package/@tejo/akso-client):

```
npm install @tejo/akso-client
```

### Usage Notes
- Use `UserClient` to get started with user-based authentication
- Use `AppClient` for app-based authentication (i.e. with API keys and such)
- `UEACode` provides various utilities for dealing with the new and old code format
- `generateTotp` generates TOTP secrets and is useful for applications implementing account creation
- This library also exports a `msgpackCodec` as it differs slightly from the defaults
- `util` includes miscellaneous functions (e.g. for dealing with search strings)

For more details see the [documentation](https://github.com/AksoEo/docs) or the JSDoc in this library.

### Development Notes
Build with `npm run build`, or watch with `npm run watch`.

Building will create a `dist` with three files for nodejs, nodejs ESM, and browser ESM for use with module bundlers.
