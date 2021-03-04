# Cody Toolkit (Solution Management)

Cody Toolkit allows performing various tasks that are frequent when customizing Dynamics CRM directly in VS Code.
With the Solution Management Module, you can create unmanaged solutions or add common development components to them
directly from within VS Code. Right now, Cody supports Assemblies, Steps and WebResources.

## Features

-   Create new unmanaged solutions
-   Add WebResources to existing solutions
-   Add Assemblies to existing solutions
-   Add Steps to existing solutions

## Requirements

The extension attempts to connect to a backend service running locally. In order to do that, the backend process needs
to be permitted use the specified port (By default, that port is 8080).
Run the following commands before executing the extension.

`netsh http add urlacl url=http://+:%PORT%/ user=%MACHINE%\%USER%` where `%PORT%` is the port you want to use to
host the backend service. `%MACHINE%` and `%USER%` can be found by running `whoami` in a console.

-   Cody Toolkit (Core)

## Extension Settings

-   `cody.toolkit.core.suggestDateBasedSolutionVersions`: Suggest date-based solution versions when creating solutions.

## Release Notes

### 1.0.0

Initial release **Cody Toolkit (Solution Management)**
