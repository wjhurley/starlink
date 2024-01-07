# Starlink API Tooling

This package is not affiliated with or acting on behalf of Starlink™️

## Features

* Device API
  * Dishy
    * `fetch_diagnostics()`
    * `fetch_history()`
    * `fetch_location()`
    * `fetch_obstruction_map()`
    * `fetch_status()`
    * `reboot()`
    * `stow()`
    * `unstow()`
  * Router
    * `fetch_diagnostics()`
* [Enterprise API](https://starlink-enterprise-guide.readme.io/docs/account-management-tools) (***Enterprise API Access Required***)
  * Management
  * Telemetry

## Special Notice

* The package build process (before publishing) generates the Typescript code for the `*.proto` definitions. The generated code is placed into `./src/protobuf/spacex`
  * The `protoc` binary is required to build the Typescript files
    * Ubuntu: `apt install protobuf-compiler`
    * Mac OSX: `brew install protobuf`
    * Windows: `choco install protoc`
  * If you are working on this package, or load this package from git, you will need to manually run `yarn build:protobuf` to generate the protobufs code


* The Device API calls listed above were tested as working against the following software versions, for all other versions, your mileage may vary:
  * Dishy
    * `186897dc-8910-40f9-bb84-c53a5e8404c9.uterm_manifest.release`

## Documentation

[https://gibme-npm.github.io/starlink/](https://gibme-npm.github.io/starlink/)

## Sample Code

### Dishy

```typescript
import { Dishy } from '@gibme/starlink';

(async () => {
    const dishy = new Dishy();
    
    const diagnostics = await dishy.fetch_diagnostics();
    
    console.log(diagnostics);
})();
```

### Router

```typescript
import { WiFiRouter } from '@gibme/starlink';

(async () => {
    const router = new WiFiRouter();
    
    const diagnostics = await router.fetch_diagnostics();
    
    console.log(diagnostics);
})();
```

### Enterprise API

```typescript
import { StarlinkAPI } from '@gibme/starlink';

(async () => {
    const api = new StarlinkAPI('<client_id>', '<client_secret>');
    
    const accounts = await api.fetch_accounts();
    
    const data = await accounts[0].fetch_realtime_data_tracking();
    
    console.log(data);
})();
```

## Thanks

Many thanks go to [starlink-rs](https://github.com/ewilken/starlink-rs) for the older version of the base Protocol Buffers definitions for the GRPC server.
