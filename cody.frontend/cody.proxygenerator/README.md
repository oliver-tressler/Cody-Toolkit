# Cody Toolkit (Proxy Generator)

Cody Toolkit allows performing various tasks that are frequent when customizing Dynamics CRM directly in VS Code. The Toolkit itself is split into modules, which deal with a group of tasks (e.g. Solution Management) each.
This module allows creating early-bound entity and action proxies from within VS Code.

## Features

-   Create early bound entity and action proxies quickly
-   Typescript proxies can be used for OData WebApi interaction as well as Form Scripts
-   Global enums for light-weight imports

## Requirements

The extension attempts to connect to a backend service running locally. In order to do that, the backend process needs to be permitted use the specified port (By default, that port is 8080).
If you experience issues with launching the backend run the following command and restart VS Code.

`netsh http add urlacl url=http://+:%PORT%/ user=%MACHINE%\%USER%` where `%PORT%` is the port you want to use to
host the backend service. `%MACHINE%` and `%USER%` can be found by running `whoami` in a console.

-   Cody Toolkit (Core)

## Extension Settings

## Known Issues

-   Some built-in entities will have missing setters for certain attributes (e.g. Pricelist - transactioncurrency)
-   Base-Classes for proxies are not generated automatically

## Release Notes

### 1.0.0

Initial release **Cody Toolkit (Proxy Generator)**
