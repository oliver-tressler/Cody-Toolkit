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
/******/ 	return __webpack_require__(__webpack_require__.s = "./TS/step_script.ts");
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

/***/ "./TS/step_script.ts":
/*!***************************!*\
  !*** ./TS/step_script.ts ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nexports.requestAvailableEntities = exports.requestAttributes = exports.postData = exports.searchAttributes = exports.selectAttributes = void 0;\r\nconst ExtensionInterface_1 = __webpack_require__(/*! ./ExtensionInterface */ \"./TS/ExtensionInterface.ts\");\r\nconst form = document.getElementById(\"step_form\");\r\nconst attributeContainerElement = document.getElementById(\"attribute_container\");\r\nconst attributeColumnElement = document.getElementById(\"attribute_column\");\r\nconst stepNameElement = document.getElementById(\"input_step_name\");\r\nconst entityNameElement = document.getElementById(\"input_step_entity_name\");\r\nconst messageNameElement = document.getElementById(\"input_step_message_name\");\r\nconst userElement = document.getElementById(\"input_step_user_context\");\r\nconst executionOrderElement = document.getElementById(\"input_step_execution_order\");\r\nconst stageElement = document.getElementById(\"input_step_stage\");\r\nconst asyncElement = document.getElementById(\"input_step_async\");\r\nconst submitElement = document.getElementById(\"input_step_submit\");\r\nconst searchAttributesElement = document.getElementById(\"search_attributes\");\r\nconst deployServerElement = document.getElementById(\"input_step_deploy_server\");\r\nconst deployOfflineElement = document.getElementById(\"input_step_deploy_offline\");\r\nfunction createCheckbox(document, id, name, state, attributes) {\r\n    const control = document.createElement(\"div\");\r\n    control.classList.add(\"control\", \"inline\");\r\n    const label = document.createElement(\"label\");\r\n    label.classList.add(\"container\", \"checkbox\");\r\n    const input = document.createElement(\"input\");\r\n    input.type = \"checkbox\";\r\n    input.name = name;\r\n    input.id = id;\r\n    if (state)\r\n        input.setAttribute(\"checked\", \"true\");\r\n    for (const key in attributes) {\r\n        if (attributes.hasOwnProperty(key)) {\r\n            input.setAttribute(key, attributes[key]);\r\n        }\r\n    }\r\n    const span = document.createElement(\"span\");\r\n    span.classList.add(\"checkmark\");\r\n    label.append(input, span);\r\n    control.append(label);\r\n    return control;\r\n}\r\nconst api = acquireVsCodeApi();\r\nconst extension = new ExtensionInterface_1.ExtensionInterface(api);\r\nconst state = api.getState();\r\nif (state) {\r\n    document.getElementById(\"heading_step_name\").textContent = state.name;\r\n    stepNameElement.value = state.name;\r\n    messageNameElement.value = state.messageName;\r\n    userElement.value = state.user;\r\n    executionOrderElement.value = state.executionOrder;\r\n    stageElement.value = state.stage;\r\n    asyncElement.checked = state.async;\r\n    deployServerElement.checked = state.server;\r\n    deployOfflineElement.checked = state.offline;\r\n    const updateAttributeCbs = () => {\r\n        document.querySelectorAll(\"input[type=checkbox][data-logicalname]\").forEach((cb) => {\r\n            cb.checked = state.attributes[cb.getAttribute(\"data-logicalname\")];\r\n        });\r\n    };\r\n    if (entityNameElement.value != state.entityName) {\r\n        entityNameElement.value = state.entityName;\r\n        requestAttributes().then(() => updateAttributeCbs());\r\n    }\r\n    else {\r\n        updateAttributeCbs();\r\n    }\r\n}\r\nfunction selectAttributes(select) {\r\n    document\r\n        .getElementById(\"attribute_container\")\r\n        .querySelectorAll(\"tr:not(.hidden) input[type=checkbox]\")\r\n        .forEach((cb) => {\r\n        cb.checked = select;\r\n    });\r\n}\r\nexports.selectAttributes = selectAttributes;\r\nfunction searchAttributes(value) {\r\n    if (value == null || value == \"\") {\r\n        attributeContainerElement.querySelectorAll(\"tr.hidden\").forEach((row) => {\r\n            row.classList.remove(\"hidden\");\r\n        });\r\n        return;\r\n    }\r\n    const shouldBeHidden = attributeContainerElement.querySelectorAll(`tr:not([data-logicalname*=\\\"${value}\\\"]):not([data-displayname*=\\\"${value}\\\"])`);\r\n    const shouldNotBeHidden = attributeContainerElement.querySelectorAll(`tr[data-logicalname*=\\\"${value}\\\"], tr[data-displayname*=\\\"${value}\\\"]`);\r\n    shouldNotBeHidden.forEach((unhide) => {\r\n        unhide.classList.remove(\"hidden\");\r\n    });\r\n    shouldBeHidden.forEach((hide) => {\r\n        hide.classList.add(\"hidden\");\r\n    });\r\n}\r\nexports.searchAttributes = searchAttributes;\r\nasync function postData() {\r\n    validateDeploymentOptions();\r\n    if (!form.reportValidity()) {\r\n        return;\r\n    }\r\n    const selectedAttributes = [];\r\n    document.querySelectorAll(\"input[type=checkbox][data-logicalname]\").forEach((el) => {\r\n        selectedAttributes.push({\r\n            LogicalName: el.getAttribute(\"data-logicalname\"),\r\n            DisplayName: el.getAttribute(\"data-displayname\"),\r\n            Available: el.checked,\r\n        });\r\n    });\r\n    try {\r\n        submitElement.setAttribute(\"disabled\", \"true\");\r\n        const response = await extension.sendRequest({\r\n            command: \"plugineditor_savestep\",\r\n            id: \"stepsave\",\r\n            payload: {\r\n                Name: stepNameElement.value,\r\n                MessageName: messageNameElement.value,\r\n                EntityName: entityNameElement.value,\r\n                UserId: userElement.value,\r\n                ExecutionOrder: executionOrderElement.valueAsNumber,\r\n                Stage: stageElement.value,\r\n                IsAsync: asyncElement.checked,\r\n                IsDeployedOnServer: deployServerElement.checked,\r\n                IsDeployedOffline: deployOfflineElement.checked,\r\n                StepAttributes: selectedAttributes,\r\n            },\r\n        });\r\n        document.getElementById(\"heading_step_name\").textContent = response.StepName;\r\n    }\r\n    finally {\r\n        submitElement.removeAttribute(\"disabled\");\r\n    }\r\n}\r\nexports.postData = postData;\r\nasync function requestAttributes() {\r\n    const messageName = messageNameElement.value;\r\n    if (!messageName || messageName != \"Update\") {\r\n        attributeColumnElement.style.display = \"none\";\r\n        return;\r\n    }\r\n    const entityName = entityNameElement.value;\r\n    if (entityName == null || document.getElementById(`entity_${entityName}`) == null) {\r\n        attributeColumnElement.style.display = \"none\";\r\n        return;\r\n    }\r\n    let attributes = [];\r\n    try {\r\n        attributes = (await extension.sendRequest({\r\n            command: \"plugineditor_requeststepattributes\",\r\n            id: \"stepattributes\",\r\n            payload: { EntityName: entityName },\r\n        }));\r\n    }\r\n    catch (e) { }\r\n    for (const child of Array.from(document.querySelector(\"#attribute_container tbody\").children)) {\r\n        child.remove();\r\n    }\r\n    const attributeElement = document.createDocumentFragment();\r\n    for (const { Available, DisplayName, LogicalName } of attributes) {\r\n        // Construct Checkbox\r\n        const control = createCheckbox(document, LogicalName, LogicalName, Available, {\r\n            \"data-logicalname\": LogicalName,\r\n        });\r\n        control.onchange = persistState;\r\n        const checkBoxCell = document.createElement(\"td\");\r\n        checkBoxCell.append(control);\r\n        const displayName = document.createElement(\"div\");\r\n        displayName.classList.add(\"description\");\r\n        const displayNameText = document.createElement(\"p\");\r\n        displayNameText.textContent = `${DisplayName}`;\r\n        const displayNameCell = document.createElement(\"td\");\r\n        displayName.append(displayNameText);\r\n        displayNameCell.append(displayName);\r\n        const logicalName = document.createElement(\"div\");\r\n        logicalName.classList.add(\"description\");\r\n        const logicalNameText = document.createElement(\"p\");\r\n        logicalNameText.textContent = `${LogicalName}`;\r\n        const logicalNameCell = document.createElement(\"td\");\r\n        logicalName.append(logicalNameText);\r\n        logicalNameCell.append(logicalName);\r\n        const row = document.createElement(\"tr\");\r\n        row.setAttribute(\"data-logicalname\", LogicalName);\r\n        row.setAttribute(\"data-displayname\", DisplayName);\r\n        row.append(checkBoxCell, displayNameCell, logicalNameCell);\r\n        attributeElement.append(row);\r\n    }\r\n    document.querySelector(\"#attribute_container tbody\").append(attributeElement);\r\n    attributeColumnElement.style.display = \"block\";\r\n}\r\nexports.requestAttributes = requestAttributes;\r\nasync function requestAvailableEntities(selectedOption) {\r\n    if (selectedOption == null) {\r\n        return;\r\n    }\r\n    const response = (await extension.sendRequest({\r\n        command: \"plugineditor_requeststepentities\",\r\n        id: \"stepentities\",\r\n        payload: { MessageId: selectedOption.getAttribute(\"data-message-id\") },\r\n    }));\r\n    const entityList = document.getElementById(\"entitynames\");\r\n    entityList.innerHTML = \"\";\r\n    entityList.append(...response.map((entity) => {\r\n        const option = document.createElement(\"option\");\r\n        option.id = \"entity_\" + entity.LogicalName;\r\n        option.value = entity.LogicalName;\r\n        option.label = entity.DisplayName;\r\n        return option;\r\n    }));\r\n    if (response.length == 0) {\r\n        entityNameElement.closest(\".setting\").style.display = \"none\";\r\n        entityNameElement.value = null;\r\n        entityNameElement.required = false;\r\n        const evt = new Event(\"change\");\r\n        entityNameElement.dispatchEvent(evt);\r\n    }\r\n    else if (response.length == 1) {\r\n        entityNameElement.value = response[0].LogicalName;\r\n        const evt = new Event(\"change\");\r\n        entityNameElement.dispatchEvent(evt);\r\n        entityNameElement.closest(\".setting\").style.display = \"block\";\r\n        entityNameElement.required = true;\r\n    }\r\n    else if (response.length > 1) {\r\n        if (entityNameElement.value != \"\" &&\r\n            !response.some((entity) => entity.LogicalName == entityNameElement.value)) {\r\n            entityNameElement.value = null;\r\n            const evt = new Event(\"change\");\r\n            entityNameElement.dispatchEvent(evt);\r\n        }\r\n        entityNameElement.closest(\".setting\").style.display = \"block\";\r\n        entityNameElement.required = true;\r\n    }\r\n}\r\nexports.requestAvailableEntities = requestAvailableEntities;\r\ndocument.querySelector(\"button[type=submit]\").onclick = postData;\r\ndocument.getElementById(\"select_all_attributes\").onclick = () => selectAttributes(true);\r\ndocument.getElementById(\"deselect_all_attributes\").onclick = () => selectAttributes(false);\r\nsearchAttributesElement.oninput = function (event) {\r\n    searchAttributes(event.target.value);\r\n};\r\nentityNameElement.onchange = () => {\r\n    requestAttributes();\r\n};\r\nif (!messageNameElement.value || !entityNameElement.value) {\r\n    entityNameElement.closest(\".setting\").style.display = \"none\";\r\n    entityNameElement.required = false;\r\n}\r\nmessageNameElement.onblur = async function () {\r\n    const handle = this;\r\n    attributeColumnElement.style.display =\r\n        messageNameElement.value == \"Update\" && entityNameElement.value ? \"block\" : \"none\";\r\n    if (!handle.value) {\r\n        entityNameElement.closest(\".setting\").style.display = \"none\";\r\n        handle.required = false;\r\n        return;\r\n    }\r\n    const selectedOption = handle.list.querySelector(`option[value=${handle.value}]`);\r\n    await requestAvailableEntities(selectedOption);\r\n};\r\ndeployServerElement.onchange = validateDeploymentOptions;\r\ndeployOfflineElement.onchange = validateDeploymentOptions;\r\nfunction validateDeploymentOptions() {\r\n    if (!deployServerElement.checked && !deployOfflineElement.checked) {\r\n        deployServerElement.setCustomValidity(\"At least one of the deployment actions must be selected.\");\r\n    }\r\n    else {\r\n        deployServerElement.setCustomValidity(\"\");\r\n    }\r\n}\r\nfunction persistState() {\r\n    const state = {\r\n        name: stepNameElement.value,\r\n        messageName: messageNameElement.value,\r\n        entityName: entityNameElement.value,\r\n        user: userElement.value,\r\n        executionOrder: executionOrderElement.value,\r\n        stage: stageElement.value,\r\n        async: asyncElement.checked,\r\n        server: deployServerElement.checked,\r\n        offline: deployOfflineElement.checked,\r\n        attributes: Array.from(document.querySelectorAll(\"input[type=checkbox][data-logicalname]\")).reduce((agg, curr) => {\r\n            agg[curr.getAttribute(\"data-logicalname\")] = curr.checked;\r\n            return agg;\r\n        }, {}),\r\n    };\r\n    api.setState(state);\r\n}\r\nstepNameElement.onchange = persistState;\r\nmessageNameElement.onchange = persistState;\r\nentityNameElement.onchange = persistState;\r\nuserElement.onchange = persistState;\r\nexecutionOrderElement.onchange = persistState;\r\nstageElement.onchange = persistState;\r\nasyncElement.onchange = persistState;\r\ndeployServerElement.onchange = persistState;\r\ndeployOfflineElement.onchange = persistState;\r\ndocument.querySelectorAll(\"input[type=checkbox][data-logicalname]\").forEach((cb) => {\r\n    cb.onchange = persistState;\r\n});\r\nattributeColumnElement.style.display = messageNameElement.value == \"Update\" ? \"block\" : \"none\";\r\n\n\n//# sourceURL=webpack:///./TS/step_script.ts?");

/***/ })

/******/ });