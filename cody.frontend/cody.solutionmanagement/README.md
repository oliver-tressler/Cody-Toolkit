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
    Date based versions should not be used when working on managed solutions, since it will not be possible to create
    patches. This setting defaults to `false` to avoid accidental bad practices.
-   `cody.toolkit.core.suggestSolutionNameBasedOnGitBranch`: Suggest a solution name based on the git branch you have currently checked out. This will take the name of the branch, replace all `/` characters with `_` and strips all non-numeric and non-alphabetic characters. All words that were previously separated by these characters will have their first letter characterized. This setting defaults to `false` to avoid accidental bad practices.
-   `cody.toolkit.core.ignoreTheseBranchNamesForSolutionNameSuggestions`: Enter a string that can be parsed via the JS `RegExp` constructor. All branch names that are matched by this expression will be ignored for solution name suggestions. If `cody.toolkit.core.suggestSolutionNameBasedOnGitBranch` is set to `false`, this setting will be ignored.

## Release Notes

### 1.0.0

Initial release **Cody Toolkit (Solution Management)**
