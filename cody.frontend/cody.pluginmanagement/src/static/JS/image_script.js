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
/******/ 	return __webpack_require__(__webpack_require__.s = "./TS/image_script.ts");
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

/***/ "./TS/image_script.ts":
/*!****************************!*\
  !*** ./TS/image_script.ts ***!
  \****************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nexports.postData = exports.searchAttributes = exports.selectAttributes = void 0;\r\nconst ExtensionInterface_1 = __webpack_require__(/*! ./ExtensionInterface */ \"./TS/ExtensionInterface.ts\");\r\nconst availablePost = document.getElementById(\"input_image_post_image\");\r\nconst availablePre = document.getElementById(\"input_image_pre_image\");\r\nconst nameElement = document.getElementById(\"input_image_name\");\r\nconst entityAliasElement = document.getElementById(\"input_image_entity_alias\");\r\nconst api = acquireVsCodeApi();\r\nconst extensionInterface = new ExtensionInterface_1.ExtensionInterface(api);\r\nconst state = api.getState();\r\nif (state) {\r\n    availablePre.checked = state.pre;\r\n    availablePost.checked = state.post;\r\n    nameElement.value = state.name;\r\n    entityAliasElement.value = state.alias;\r\n    document.getElementById(\"heading_image_name\").textContent = state.name;\r\n    document.querySelectorAll(\"input[type=checkbox][data-logicalname]\").forEach((cb) => {\r\n        cb.checked = state.attributes[cb.getAttribute(\"data-logicalname\")];\r\n    });\r\n}\r\nfunction selectAttributes(select) {\r\n    document\r\n        .getElementById(\"attribute_container\")\r\n        .querySelectorAll(\"tr:not(.hidden) input[type=checkbox]\")\r\n        .forEach((cb) => {\r\n        cb.checked = select;\r\n    });\r\n    persistState();\r\n}\r\nexports.selectAttributes = selectAttributes;\r\nfunction searchAttributes(value) {\r\n    const table = document.getElementById(\"attribute_container\");\r\n    if (value == null || value == \"\") {\r\n        table.querySelectorAll(\"tr.hidden\").forEach((row) => {\r\n            row.classList.remove(\"hidden\");\r\n        });\r\n        return;\r\n    }\r\n    const shouldBeHidden = table.querySelectorAll(`tr:not([data-logicalname*=\\\"${value}\\\"]):not([data-displayname*=\\\"${value}\\\"])`);\r\n    const shouldNotBeHidden = table.querySelectorAll(`tr[data-logicalname*=\\\"${value}\\\"], tr[data-displayname*=\\\"${value}\\\"]`);\r\n    shouldNotBeHidden.forEach((unhide) => {\r\n        unhide.classList.remove(\"hidden\");\r\n    });\r\n    shouldBeHidden.forEach((hide) => {\r\n        hide.classList.add(\"hidden\");\r\n    });\r\n}\r\nexports.searchAttributes = searchAttributes;\r\nasync function postData() {\r\n    validatePreAndPostImage();\r\n    if (!document.getElementById(\"image_form\").reportValidity())\r\n        return;\r\n    const selectedAttributes = [];\r\n    document.querySelectorAll(\"input[type=checkbox][data-logicalname][checked]\").forEach((el) => {\r\n        selectedAttributes.push({\r\n            LogicalName: el.getAttribute(\"data-logicalname\"),\r\n            DisplayName: el.getAttribute(\"data-displayname\"),\r\n            Available: el.checked,\r\n        });\r\n    });\r\n    try {\r\n        document.getElementById(\"input_image_submit\").setAttribute(\"disabled\", \"true\");\r\n        const response = await extensionInterface.sendRequest({\r\n            command: \"plugineditor_saveimage\",\r\n            id: \"imagesave\",\r\n            payload: {\r\n                Name: nameElement.value,\r\n                EntityAlias: entityAliasElement.value,\r\n                AvailablePre: availablePre.checked,\r\n                AvailablePost: availablePost.checked,\r\n                ImageAttributes: selectedAttributes,\r\n            },\r\n        });\r\n        document.getElementById(\"heading_image_name\").textContent = response.ImageName;\r\n    }\r\n    finally {\r\n        document.getElementById(\"input_image_submit\").removeAttribute(\"disabled\");\r\n    }\r\n}\r\nexports.postData = postData;\r\nfunction validatePreAndPostImage() {\r\n    const checkAvailablePre = availablePre.closest(\".setting\").style.display != \"none\";\r\n    const checkAvailablePost = availablePost.closest(\".setting\").style.display != \"none\";\r\n    if ((checkAvailablePre && availablePre.checked) || (checkAvailablePost && availablePost.checked)) {\r\n        availablePre.setCustomValidity(\"\");\r\n        availablePost.setCustomValidity(\"\");\r\n    }\r\n    else {\r\n        if (checkAvailablePre)\r\n            availablePre.setCustomValidity(\"You must select at least one Image Type\");\r\n        else if (checkAvailablePost)\r\n            availablePost.setCustomValidity(\"You must select at least one Image Type\");\r\n    }\r\n}\r\nfunction persistState() {\r\n    const attributes = Array.from(document.querySelectorAll(\"input[type=checkbox][data-logicalname]\"));\r\n    const state = {\r\n        name: nameElement.value,\r\n        alias: entityAliasElement.value,\r\n        pre: availablePre.checked,\r\n        post: availablePost.checked,\r\n        attributes: attributes.reduce((agg, curr) => {\r\n            agg[curr.getAttribute(\"data-logicalname\")] = curr.checked;\r\n            return agg;\r\n        }, {}),\r\n    };\r\n    api.setState(state);\r\n}\r\navailablePre.onchange = validatePreAndPostImage;\r\navailablePost.onchange = validatePreAndPostImage;\r\navailablePre.onchange = persistState;\r\navailablePost.onchange = persistState;\r\nnameElement.onchange = persistState;\r\nentityAliasElement.onchange = persistState;\r\ndocument.querySelectorAll(\"input[type=checkbox][data-logicalname]\").forEach((cb) => {\r\n    cb.onchange = persistState;\r\n});\r\ndocument.querySelector(\"button[type=submit]\").onclick = postData;\r\ndocument.getElementById(\"select_all_attributes\").onclick = () => selectAttributes(true);\r\ndocument.getElementById(\"deselect_all_attributes\").onclick = () => selectAttributes(false);\r\ndocument.getElementById(\"search_attributes\").oninput = function (event) {\r\n    searchAttributes(event.target.value);\r\n};\r\n\n\n//# sourceURL=webpack:///./TS/image_script.ts?");

/***/ })

/******/ });