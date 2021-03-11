# Cody Toolkit (Build and Publish)

Cody Toolkit allows performing various tasks that are frequent when customizing Dynamics CRM directly in VS Code.
The Build and Publish Module simplifies working with script WebResources dramatically. Compile Typescript, bundle and minify scripts or publish WebResource files to a Dynamics CRM 2016 On-Premise server with just a few button presses.

## Features

-   Compile a Typescript or JavaScript file and all of it's dependencies into a single deployable JavaScript bundle without worrying about webpack and build tasks
-   Bundles are automatically minified and have source maps
-   Automatic creation of fiddler rules that allow you to debug your TypeScript/JavaScript code in the browser
-   Publish WebResource files directly to the CRM (Pairs nicely with Cody Toolkit (Solution Management))

## Requirements

The extension attempts to connect to a backend service running locally. In order to do that, the backend process needs
to be permitted use the specified port (By default, that port is 8080).
Run the following commands before installing the extension.

`netsh http add urlacl url=http://+:%PORT%/ user=%MACHINE%\%USER%` where `%PORT%` is the port you want to use to
host the backend service. `%MACHINE%` and `%USER%` can be found by running `whoami` in a console.

-   Cody Toolkit (Core)

## Extension Settings

-   `cody.toolkit.buildAndPublish.createFiddlerRulesWhenBuildingScripts`: Bundled and minified files are annoying to debug. If this is enabled, Fiddler rules will be generated for you and can be directly imported into Fiddlers' Autoresponder. This way, you can debug your local code directly inside the CRM.
-   `cody.toolkit.buildAndPublish.fiddlerRuleFolder`: An optional override for where your Fiddler rule files will be stored. If this is left empty, Fiddler rule files are placed next to their corresponding scripts, but this allows you to store them in a folder of your choice. Just beware, that naming clashes will not be resolved.

## Release Notes

### 1.0.0

Initial release **Cody Toolkit (Build and Publish)**
