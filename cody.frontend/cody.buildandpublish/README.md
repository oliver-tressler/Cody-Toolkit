# Cody Toolkit (Build and Publish)

Cody Toolkit allows performing various tasks that are frequent when customizing Dynamics CRM directly in VS Code.
The Build and Publish Module simplifies working with script WebResources dramatically. Compile Typescript, bundle and minify scripts or publish WebResource files to a Dynamics CRM 2016 On-Premise server with just a few button presses.

## Features

-   Compile a Typescript or JavaScript file and all of it's dependencies into a single deployable JavaScript bundle without worrying about webpack and build tasks
-   Bundles are automatically minified and have source maps
-   Automatic creation of fiddler rules that allow you to debug your TypeScript/JavaScript code in the browser
-   Publish WebResource files directly to the CRM (Pairs nicely with Cody Toolkit (Solution Management))

## Requirements

-   A `tsconfig.json` file must exist in the root

The extension attempts to connect to a backend service running locally. In order to do that, the backend process needs
to be permitted use the specified port (By default, that port is 8080).
If you experience issues with launching the backend run the following command and restart VS Code.

`netsh http add urlacl url=http://+:%PORT%/ user=%MACHINE%\%USER%` where `%PORT%` is the port you want to use to
host the backend service. `%MACHINE%` and `%USER%` can be found by running `whoami` in a console.

-   Cody Toolkit (Core)

## Extension Settings

-   `cody.toolkit.buildAndPublish.createFiddlerRulesWhenBuildingScripts`: Bundled and minified files are annoying to debug. If this is enabled, Fiddler rules will be generated and can be directly imported into Fiddlers' Autoresponder. This way, you can debug your local code directly inside the CRM.
-   `cody.toolkit.buildAndPublish.fiddlerRuleFolder`: An optional override for where your Fiddler rule files will be stored. If this is left empty, Fiddler rule files are placed next to their corresponding scripts. When an folder path is given, the rule files will be stored in that folder instead. Just beware, that naming clashes will not be resolved.

## Known Issues

-   The extension right now can't be bundled because webpack refuses to bundle itself. A solution might be to fetch webpack and its dependencies when booting the extension the first time, but that complicates things. It is also not possible to require stuff from the users `node_modules` folder.
-   Can't override the webpack configuration. Allowing that is pretty complicated though and it allows unexperienced users to shoot themselves in the foot.
-   Unable to build scripts outside of tsconfigs rootFolder.
-   Suboptimal build process feedback. Will be fixed within the next updates.
-   The file explorer context menu provides unfulfillable _Build_ and _Build & Publish_ tasks when they do not sit inside the workspaces tsconfigs rootDir.

## Release Notes

### 1.0.0

Initial release **Cody Toolkit (Build and Publish)**
