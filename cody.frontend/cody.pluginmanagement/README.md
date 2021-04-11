# Cody Toolkit (Plugin Management)

Cody Toolkit allows performing various tasks that are frequent when customizing Dynamics CRM directly in VS Code.
Plugin Management enables you to manage your Assemblies, Plugins, Steps and Images from within VS Code.

## Features

-   Browser all of your Assemblies, Plugins, Steps and Images
-   Create, Update and Remove Assemblies (and it actually remembers where your DLLs are ...)
-   Tells you which Plugins are missing from an assembly, which Plugins will be added and if the Assembly Metadata (e.g. Assembly Version) changed
-   Add, Update, Remove and Disable Steps
-   Add, Update and Remove Images
-   A more guided workflow compared to the Plugin Registration Tool. All of the settings have descriptions that tell you what will change and it only shows options that you actually can set.

## Requirements

The extension attempts to connect to a backend service running locally. In order to do that, the backend process needs
to be permitted use the specified port (By default, that port is 8080).
If you experience issues with launching the backend run the following command and restart VS Code.

`netsh http add urlacl url=http://+:%PORT%/ user=%MACHINE%\%USER%` where `%PORT%` is the port you want to use to
host the backend service. `%MACHINE%` and `%USER%` can be found by running `whoami` in a console.

-   Cody Toolkit (Core)

## Extension Settings

## Known Issues

-   Code is still very raw. Refactoring with the next updates.
-   Unable to deal with workflows yet
-   Not well-adjusted to theming

## Release Notes

### 1.0.0

Initial release **Cody Toolkit (Plugin Management)**
