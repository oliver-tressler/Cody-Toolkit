# Cody Toolkit (Core)

Cody Toolkit allows performing various tasks that are frequent when customizing Dynamics CRM directly in VS Code.
The Toolkit itself is split into modules, which deal with a group of tasks (e.g. Solution Management) each.

## Features

-   

## Requirements

The extension attempts to connect to a backend service running locally. In order to do that, the backend process needs
to be permitted use the specified port (By default, that port is 8080).
Run the following commands before installing the extension.

`netsh http add urlacl url=http://+:%PORT%/ user=%MACHINE%\%USER%` where `%PORT%` is the port you want to use to
host the backend service. `%MACHINE%` and `%USER%` can be found by running `whoami` in a console.

-   Cody Toolkit (Core)

## Extension Settings

## Known Issues

-   Credential Files still need to be created manually. A wizard will be provided in future versions.
-   The backend server is not yet included in the extension to reduce bundle size.
-   Organization Service expiration is currently not communicated to the user.
-   Since there always is just one backend instance, the output logs will be forwarded to the VS Code instance that
    started the process. In future releases, the communication between the server and the extension will be switched to
    gRPC over IPC, which will address this issue. A backend instance will not be shared between extensions then. If that
    is explicitly required, it might be possible to provide the user with an option to use gRPC over TCP instead.

## Release Notes

### 1.0.0

Initial release **Cody Toolkit (Proxy Generator)**