# Cody Toolkit (Core)

Cody Toolkit allows performing various tasks that are frequent when customizing Dynamics CRM directly in VS Code. The Toolkit itself is split into modules, which deal with a group of tasks (e.g. Solution Management) each. This module provides the ability to connect to Dynamics CRM 2016 On-Premise instances as well as some behind the scenes infrastructure required for other modules.

## Features

-   Connect to Dynamics CRM 2016 On-Premise instances
-   Caches connections to organizations (that share the same instance)
-   Manages the Cody Toolkit Backend

## Installation

The extension requires the Cody Toolkit Backend which is provided at [Cody Toolkit GitHub](https://github.com/oliver-tressler/Cody-Toolkit/releases). Download and run the installer before installing the extension. Cody Toolkit will ask for configuration after launching the extension for the first time or if it detects incorrect settings. Simply click the `Configure` button to initiate the configuration wizard.
If you chose a different installation path than what was provided as a default, Cody Toolkit will ask you for the location of the `cody.backend.api` executable.
If you have not yet specified a port yet, you will be prompted to chose a valid port. The default port will be `8080`. When the server starts, it checks for an existing port reservation. If it does not exist for the current user, it will try to create one automatically. This will most likely require administrative privileges.

## Requirements

-   Cody Toolkit Backend ([Cody Toolkit GitHub](https://github.com/oliver-tressler/Cody-Toolkit/releases))

The extension attempts to connect to a backend service running locally. In order to do that, the backend process needs to be permitted use the specified port (By default, that port is 8080). If you experience issues with launching the backend run the following command and restart VS Code.

`netsh http add urlacl url=http://+:%PORT%/ user=%MACHINE%\%USER%` where `%PORT%` is the port you want to use to
host the backend service. `%MACHINE%` and `%USER%` can be found by running `whoami` in a console.

## Extension Settings

-   `cody.toolkit.core.backendServerLocation`: Location to the executable of the backend server (forward slash notation)
-   `cody.toolkit.core.backendServerPort`: Port to use when communicating with backend server

## Known Issues

-   The backend server is not yet included in the extension to reduce bundle size.
-   Organization Service expiration is currently not communicated to the user.
-   Since there always is just one backend instance, the output logs will be forwarded to the VS Code instance that started the process. In future releases, the communication between the server and the extension will be switched to gRPC over IPC, which will address this issue. A backend instance will not be shared between extensions then. If that is explicitly required, it might be possible to provide the user with an option to use gRPC over TCP instead.

## Release Notes

### 1.0.0

Initial release **Cody Toolkit (Core)**
