/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/JS/";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./TS/assembly_script.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./TS/ExtensionInterface.ts":
/*!**********************************!*\
  !*** ./TS/ExtensionInterface.ts ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nexports.AsyncCompletionSource = exports.ExtensionInterface = void 0;\r\nclass ExtensionInterface {\r\n    constructor(api) {\r\n        this.api = api;\r\n        this.pendingRequests = {};\r\n        this.messageHandlers = {};\r\n        window.addEventListener(\"message\", (evt) => {\r\n            const message = evt.data;\r\n            if (this.pendingRequests[message.id] != null) {\r\n                const completionSource = this.pendingRequests[message.id];\r\n                if (message.payload instanceof Error)\r\n                    completionSource.setError(message.payload);\r\n                else\r\n                    completionSource.setResult(message.payload);\r\n            }\r\n            else if (message.command && this.messageHandlers[message.command] != null) {\r\n                for (const handler of this.messageHandlers[message.command]) {\r\n                    handler.handler(message);\r\n                }\r\n            }\r\n        });\r\n    }\r\n    async sendRequest(request) {\r\n        const requestObject = { id: request.id, command: request.command, payload: request.payload };\r\n        this.api.postMessage(requestObject);\r\n        const completionSource = new AsyncCompletionSource();\r\n        this.pendingRequests[requestObject.id] = completionSource;\r\n        return (await completionSource.awaiter);\r\n    }\r\n    on(command, handlerId, handler) {\r\n        if (this.messageHandlers[command] == null)\r\n            this.messageHandlers[command] = [];\r\n        this.messageHandlers[command].push({\r\n            id: handlerId,\r\n            handler: (message) => {\r\n                handler(message)\r\n                    .then((response) => {\r\n                    this.api.postMessage({\r\n                        id: message.id,\r\n                        success: true,\r\n                        payload: response,\r\n                    });\r\n                })\r\n                    .catch((error) => {\r\n                    this.api.postMessage({\r\n                        id: message.id,\r\n                        success: false,\r\n                        payload: error,\r\n                    });\r\n                });\r\n            },\r\n        });\r\n    }\r\n}\r\nexports.ExtensionInterface = ExtensionInterface;\r\nclass AsyncCompletionSource {\r\n    constructor() {\r\n        this.awaiter = new Promise((resolve, reject) => {\r\n            this.setResult = function (result) {\r\n                resolve(result);\r\n            };\r\n            this.setError = function (error) {\r\n                reject(error);\r\n            };\r\n        });\r\n    }\r\n}\r\nexports.AsyncCompletionSource = AsyncCompletionSource;\r\n\n\n//# sourceURL=webpack:///./TS/ExtensionInterface.ts?");

/***/ }),

/***/ "./TS/assembly_script.ts":
/*!*******************************!*\
  !*** ./TS/assembly_script.ts ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nexports.postData = exports.updateFileName = void 0;\r\nconst ExtensionInterface_1 = __webpack_require__(/*! ./ExtensionInterface */ \"./TS/ExtensionInterface.ts\");\r\nconst api = acquireVsCodeApi();\r\nconst extensionInterface = new ExtensionInterface_1.ExtensionInterface(api);\r\nconst form = document.getElementById(\"assembly_form\");\r\nconst assemblyHeading = document.getElementById(\"heading_assembly_name\");\r\nconst assemblyNameElement = document.getElementById(\"input_assembly_name\");\r\nconst assemblyMetadataNameElement = document.getElementById(\"input_assembly_metadata_name\");\r\nconst assemblyMetadataVersionElement = document.getElementById(\"input_assembly_metadata_version\");\r\nconst assemblyMetadataCultureElement = document.getElementById(\"input_assembly_metadata_culture\");\r\nconst assemblyMetadataKeyElement = document.getElementById(\"input_assembly_metadata_key\");\r\nconst isSandboxedElement = document.getElementById(\"input_assembly_sandboxed\");\r\nconst deploymentModeElement = document.getElementById(\"input_assembly_deployment\");\r\nconst assemblyLocationElement = document.getElementById(\"input_assembly_file_location\");\r\nconst submitButton = document.getElementById(\"input_assembly_submit\");\r\nconst state = api.getState();\r\nif (state) {\r\n    assemblyLocationElement.value = state.location;\r\n    assemblyNameElement.value = state.name;\r\n    isSandboxedElement.checked = state.sandboxed;\r\n    deploymentModeElement.value = state.deployment;\r\n    assemblyMetadataNameElement.value = state.metadata.name;\r\n    assemblyMetadataVersionElement.value = state.metadata.version;\r\n    assemblyMetadataCultureElement.value = state.metadata.culture;\r\n    assemblyMetadataKeyElement.value = state.metadata.key;\r\n    assemblyHeading.textContent = state.name;\r\n}\r\nasync function updateFileName(path = \"\") {\r\n    var _a, _b, _c, _d, _e, _f, _g, _h, _j;\r\n    const response = await extensionInterface.sendRequest({\r\n        command: \"plugineditor_pickfile\",\r\n        id: \"assemblyfilechooser\",\r\n        payload: { fileType: \"dll\", path: path || null },\r\n    });\r\n    assemblyLocationElement.value = (_a = response.path) !== null && _a !== void 0 ? _a : \"\";\r\n    if (!response.path) {\r\n        persistState();\r\n        return;\r\n    }\r\n    assemblyNameElement.value = response.metadata.AssemblyName;\r\n    assemblyMetadataNameElement.value = [\r\n        ...new Set([\r\n            assemblyMetadataNameElement.value.replace(new RegExp(/\\s+🡲 .+/), \"\"),\r\n            (_c = (_b = response.metadata) === null || _b === void 0 ? void 0 : _b.AssemblyName) !== null && _c !== void 0 ? _c : \"\",\r\n        ]),\r\n    ]\r\n        .filter((val) => !!val)\r\n        .join(\" 🡲 \");\r\n    assemblyMetadataVersionElement.value = [\r\n        ...new Set([\r\n            assemblyMetadataVersionElement.value.replace(new RegExp(/\\s+🡲 .+/), \"\"),\r\n            (_e = (_d = response.metadata) === null || _d === void 0 ? void 0 : _d.Version) !== null && _e !== void 0 ? _e : \"\",\r\n        ]),\r\n    ]\r\n        .filter((val) => !!val)\r\n        .join(\" 🡲 \");\r\n    assemblyMetadataCultureElement.value = [\r\n        ...new Set([\r\n            assemblyMetadataCultureElement.value.replace(new RegExp(/\\s+🡲 .+/), \"\"),\r\n            (_g = (_f = response.metadata) === null || _f === void 0 ? void 0 : _f.Culture) !== null && _g !== void 0 ? _g : \"\",\r\n        ]),\r\n    ]\r\n        .filter((val) => !!val)\r\n        .join(\" 🡲 \");\r\n    assemblyMetadataKeyElement.value = [\r\n        ...new Set([\r\n            assemblyMetadataKeyElement.value.replace(new RegExp(/\\s+🡲 .+/), \"\"),\r\n            (_j = (_h = response.metadata) === null || _h === void 0 ? void 0 : _h.PublicKeyToken) !== null && _j !== void 0 ? _j : \"\",\r\n        ]),\r\n    ]\r\n        .filter((val) => !!val)\r\n        .join(\" 🡲 \");\r\n    persistState();\r\n    const remotePlugins = Array.from(document.querySelectorAll(\"#plugin_types p\"));\r\n    remotePlugins.forEach((plugin) => {\r\n        if (plugin.classList.contains(\"added\"))\r\n            plugin.remove();\r\n        plugin.classList.remove(\"deleted\");\r\n    });\r\n    const localPlugins = response.metadata.DetectedPluginTypes;\r\n    // Check which are missing\r\n    remotePlugins\r\n        .filter((node) => !localPlugins.some((plugin) => plugin.Name == node.textContent.trim()))\r\n        .forEach((node) => {\r\n        for (let i = 0; i < node.childNodes.length; i++) {\r\n            if (node.childNodes[i].nodeType != Node.TEXT_NODE) {\r\n                node.removeChild(node.childNodes[i--]);\r\n            }\r\n        }\r\n        node.classList.remove(\"added\");\r\n        node.classList.add(\"deleted\");\r\n    });\r\n    // Check which will be added\r\n    localPlugins\r\n        .filter((plugin) => !remotePlugins.some((node) => node.textContent.trim() == plugin.Name))\r\n        .sort()\r\n        .forEach((missingPlugin) => {\r\n        const p = document.createElement(\"p\");\r\n        p.textContent = missingPlugin.Name;\r\n        p.classList.add(\"added\");\r\n        document.getElementById(\"plugin_types\").prepend(p);\r\n    });\r\n}\r\nexports.updateFileName = updateFileName;\r\nasync function postData() {\r\n    if (!form.reportValidity())\r\n        return;\r\n    try {\r\n        submitButton.setAttribute(\"disabled\", \"true\");\r\n        const response = await extensionInterface.sendRequest({\r\n            command: \"plugineditor_saveassembly\",\r\n            id: \"assemblysave\",\r\n            payload: {\r\n                IsSandboxed: isSandboxedElement.checked,\r\n                DeploymentMode: parseInt(deploymentModeElement.value),\r\n                FilePath: assemblyLocationElement.value,\r\n            },\r\n        });\r\n        assemblyHeading.textContent = response.AssemblyName;\r\n    }\r\n    finally {\r\n        submitButton.removeAttribute(\"disabled\");\r\n    }\r\n}\r\nexports.postData = postData;\r\ndocument.getElementById(\"input_assembly_file_chooser\").onclick = () => updateFileName();\r\nsubmitButton.onclick = () => postData();\r\nif (!!(assemblyLocationElement === null || assemblyLocationElement === void 0 ? void 0 : assemblyLocationElement.value)) {\r\n    updateFileName(assemblyLocationElement === null || assemblyLocationElement === void 0 ? void 0 : assemblyLocationElement.value);\r\n}\r\nassemblyNameElement.onchange = persistState;\r\nisSandboxedElement.onchange = persistState;\r\ndeploymentModeElement.onchange = persistState;\r\nassemblyLocationElement.onchange = persistState;\r\nassemblyMetadataNameElement.onchange = persistState;\r\nassemblyMetadataVersionElement.onchange = persistState;\r\nassemblyMetadataKeyElement.onchange = persistState;\r\nassemblyMetadataCultureElement.onchange = persistState;\r\nfunction persistState() {\r\n    const state = {\r\n        name: assemblyNameElement.value,\r\n        sandboxed: isSandboxedElement.checked,\r\n        location: assemblyLocationElement.value,\r\n        deployment: deploymentModeElement.value,\r\n        metadata: {\r\n            name: assemblyMetadataNameElement.value,\r\n            version: assemblyMetadataVersionElement.value,\r\n            culture: assemblyMetadataCultureElement.value,\r\n            key: assemblyMetadataKeyElement.value,\r\n        },\r\n    };\r\n    api.setState(state);\r\n}\r\n\n\n//# sourceURL=webpack:///./TS/assembly_script.ts?");

/***/ })

/******/ });