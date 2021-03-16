import { ExtensionInterface } from "./ExtensionInterface";
const form = document.getElementById("step_form") as HTMLFormElement;
const attributeContainerElement = document.getElementById("attribute_container");
const attributeColumnElement = document.getElementById("attribute_column");
const stepNameElement = document.getElementById("input_step_name") as HTMLInputElement;
const entityNameElement = document.getElementById("input_step_entity_name") as HTMLInputElement;
const messageNameElement = document.getElementById("input_step_message_name") as HTMLInputElement;
const userElement = document.getElementById("input_step_user_context") as HTMLInputElement;
const executionOrderElement = document.getElementById("input_step_execution_order") as HTMLInputElement;
const stageElement = document.getElementById("input_step_stage") as HTMLSelectElement;
const asyncElement = document.getElementById("input_step_async") as HTMLInputElement;
const submitElement = document.getElementById("input_step_submit") as HTMLInputElement;
const searchAttributesElement = document.getElementById("search_attributes") as HTMLInputElement;
const deployServerElement = document.getElementById("input_step_deploy_server") as HTMLInputElement;
const deployOfflineElement = document.getElementById("input_step_deploy_offline") as HTMLInputElement;

function createCheckbox(
	document: Document,
	id: string,
	name: string,
	state: boolean,
	attributes: { [key: string]: string }
): HTMLDivElement {
	const control = document.createElement("div");
	control.classList.add("control", "inline");
	const label = document.createElement("label");
	label.classList.add("container", "checkbox");
	const input = document.createElement("input");
	input.type = "checkbox";
	input.name = name;
	input.id = id;
	if (state) input.setAttribute("checked", "true");
	for (const key in attributes) {
		if (attributes.hasOwnProperty(key)) {
			input.setAttribute(key, attributes[key]);
		}
	}
	const span = document.createElement("span");
	span.classList.add("checkmark");

	label.append(input, span);
	control.append(label);
	return control;
}

declare const acquireVsCodeApi: () => any;
const api = acquireVsCodeApi();
const extension = new ExtensionInterface(api);
const state: State = api.getState();
if (state) {
	document.getElementById("heading_step_name").textContent = state.name;
	stepNameElement.value = state.name;
	messageNameElement.value = state.messageName;
	userElement.value = state.user;
	executionOrderElement.value = state.executionOrder;
	stageElement.value = state.stage;
	asyncElement.checked = state.async;
	deployServerElement.checked = state.server;
	deployOfflineElement.checked = state.offline;
	const updateAttributeCbs = () => {
		document.querySelectorAll<HTMLInputElement>("input[type=checkbox][data-logicalname]").forEach((cb) => {
			cb.checked = state.attributes[cb.getAttribute("data-logicalname")];
		});
	};
	if (entityNameElement.value != state.entityName) {
		entityNameElement.value = state.entityName;
		requestAttributes().then(() => updateAttributeCbs());
	} else {
		updateAttributeCbs();
	}
}
export function selectAttributes(select: boolean) {
	document
		.getElementById("attribute_container")
		.querySelectorAll<HTMLInputElement>("tr:not(.hidden) input[type=checkbox]")
		.forEach((cb) => {
			cb.checked = select;
		});
}

export function searchAttributes(value) {
	if (value == null || value == "") {
		attributeContainerElement.querySelectorAll("tr.hidden").forEach((row) => {
			row.classList.remove("hidden");
		});
		return;
	}
	const shouldBeHidden = attributeContainerElement.querySelectorAll(
		`tr:not([data-logicalname*=\"${value}\"]):not([data-displayname*=\"${value}\"])`
	);
	const shouldNotBeHidden = attributeContainerElement.querySelectorAll(
		`tr[data-logicalname*=\"${value}\"], tr[data-displayname*=\"${value}\"]`
	);
	shouldNotBeHidden.forEach((unhide) => {
		unhide.classList.remove("hidden");
	});
	shouldBeHidden.forEach((hide) => {
		hide.classList.add("hidden");
	});
}

export async function postData() {
	validateDeploymentOptions();
	if (!form.reportValidity()) {
		return;
	}
	const selectedAttributes = [];
	document.querySelectorAll<HTMLInputElement>("input[type=checkbox][data-logicalname]").forEach((el) => {
		selectedAttributes.push({
			LogicalName: el.getAttribute("data-logicalname"),
			DisplayName: el.getAttribute("data-displayname"),
			Available: el.checked,
		});
	});
	try {
		submitElement.setAttribute("disabled", "true");
		const response = await extension.sendRequest<{ StepName: string }>({
			command: "plugineditor_savestep",
			id: "stepsave",
			payload: {
				Name: stepNameElement.value,
				MessageName: messageNameElement.value,
				EntityName: entityNameElement.value,
				UserId: userElement.value,
				ExecutionOrder: executionOrderElement.valueAsNumber,
				Stage: stageElement.value,
				IsAsync: asyncElement.checked,
				IsDeployedOnServer: deployServerElement.checked,
				IsDeployedOffline: deployOfflineElement.checked,
				StepAttributes: selectedAttributes,
			},
		});
		document.getElementById("heading_step_name").textContent = response.StepName;
	} finally {
		submitElement.removeAttribute("disabled");
	}
}

export async function requestAttributes() {
	const messageName = messageNameElement.value;
	if (!messageName || messageName != "Update") {
		attributeColumnElement.style.display = "none";
		return;
	}
	const entityName = entityNameElement.value;
	if (entityName == null || document.getElementById(`entity_${entityName}`) == null) {
		attributeColumnElement.style.display = "none";
		return;
	}
	let attributes = [];
	try {
		attributes = (await extension.sendRequest({
			command: "plugineditor_requeststepattributes",
			id: "stepattributes",
			payload: { EntityName: entityName },
		})) as { Available: boolean; DisplayName: string; LogicalName: string }[];
	} catch (e) {}
	for (const child of Array.from(document.querySelector("#attribute_container tbody").children)) {
		child.remove();
	}
	const attributeElement = document.createDocumentFragment();
	for (const { Available, DisplayName, LogicalName } of attributes) {
		// Construct Checkbox
		const control = createCheckbox(document, LogicalName, LogicalName, Available, {
			"data-logicalname": LogicalName,
		});
		control.onchange = persistState;
		const checkBoxCell = document.createElement("td");
		checkBoxCell.append(control);

		const displayName = document.createElement("div");
		displayName.classList.add("description");
		const displayNameText = document.createElement("p");
		displayNameText.textContent = `${DisplayName}`;
		const displayNameCell = document.createElement("td");
		displayName.append(displayNameText);
		displayNameCell.append(displayName);

		const logicalName = document.createElement("div");
		logicalName.classList.add("description");
		const logicalNameText = document.createElement("p");
		logicalNameText.textContent = `${LogicalName}`;
		const logicalNameCell = document.createElement("td");
		logicalName.append(logicalNameText);
		logicalNameCell.append(logicalName);

		const row = document.createElement("tr");
		row.setAttribute("data-logicalname", LogicalName);
		row.setAttribute("data-displayname", DisplayName);
		row.append(checkBoxCell, displayNameCell, logicalNameCell);
		attributeElement.append(row);
	}
	document.querySelector("#attribute_container tbody").append(attributeElement);
	attributeColumnElement.style.display = "block";
}

export async function requestAvailableEntities(selectedOption: HTMLOptionElement) {
	if (selectedOption == null) {
		return;
	}
	const response = (await extension.sendRequest({
		command: "plugineditor_requeststepentities",
		id: "stepentities",
		payload: { MessageId: selectedOption.getAttribute("data-message-id") },
	})) as { DisplayName: string; LogicalName: string }[];
	const entityList = document.getElementById("entitynames") as HTMLDataListElement;
	entityList.innerHTML = "";
	entityList.append(
		...response.map((entity) => {
			const option = document.createElement("option");
			option.id = "entity_" + entity.LogicalName;
			option.value = entity.LogicalName;
			option.label = entity.DisplayName;
			return option;
		})
	);
	if (response.length == 0) {
		entityNameElement.closest<HTMLElement>(".setting").style.display = "none";
		entityNameElement.value = null;
		entityNameElement.required = false;
		const evt = new Event("change");
		entityNameElement.dispatchEvent(evt);
	} else if (response.length == 1) {
		entityNameElement.value = response[0].LogicalName;
		const evt = new Event("change");
		entityNameElement.dispatchEvent(evt);
		entityNameElement.closest<HTMLElement>(".setting").style.display = "block";
		entityNameElement.required = true;
	} else if (response.length > 1) {
		if (
			entityNameElement.value != "" &&
			!response.some((entity) => entity.LogicalName == entityNameElement.value)
		) {
			entityNameElement.value = null;
			const evt = new Event("change");
			entityNameElement.dispatchEvent(evt);
		}
		entityNameElement.closest<HTMLElement>(".setting").style.display = "block";
		entityNameElement.required = true;
	}
}

document.querySelector<HTMLInputElement>("button[type=submit]").onclick = postData;
document.getElementById("select_all_attributes").onclick = () => selectAttributes(true);
document.getElementById("deselect_all_attributes").onclick = () => selectAttributes(false);
searchAttributesElement.oninput = function (event) {
	searchAttributes((event.target as HTMLInputElement).value);
};
entityNameElement.onchange = () => {
	requestAttributes();
};
if (!messageNameElement.value || !entityNameElement.value) {
	entityNameElement.closest<HTMLElement>(".setting").style.display = "none";
	entityNameElement.required = false;
}
messageNameElement.onblur = async function () {
	const handle = this as HTMLInputElement;
	attributeColumnElement.style.display =
		messageNameElement.value == "Update" && entityNameElement.value ? "block" : "none";
	if (!handle.value) {
		entityNameElement.closest<HTMLElement>(".setting").style.display = "none";
		handle.required = false;
		return;
	}
	const selectedOption = handle.list.querySelector<HTMLOptionElement>(`option[value=${handle.value}]`);
	await requestAvailableEntities(selectedOption);
};

deployServerElement.onchange = validateDeploymentOptions;
deployOfflineElement.onchange = validateDeploymentOptions;

function validateDeploymentOptions() {
	if (!deployServerElement.checked && !deployOfflineElement.checked) {
		deployServerElement.setCustomValidity("At least one of the deployment actions must be selected.");
	} else {
		deployServerElement.setCustomValidity("");
	}
}

type State = {
	name: string;
	messageName: string;
	entityName: string;
	user: string;
	executionOrder: string;
	stage: string;
	async: boolean;
	server: boolean;
	offline: boolean;
	attributes: { [logicalName: string]: boolean };
};

function persistState() {
	const state: State = {
		name: stepNameElement.value,
		messageName: messageNameElement.value,
		entityName: entityNameElement.value,
		user: userElement.value,
		executionOrder: executionOrderElement.value,
		stage: stageElement.value,
		async: asyncElement.checked,
		server: deployServerElement.checked,
		offline: deployOfflineElement.checked,
		attributes: Array.from(
			document.querySelectorAll<HTMLInputElement>("input[type=checkbox][data-logicalname]")
		).reduce((agg, curr) => {
			agg[curr.getAttribute("data-logicalname")] = curr.checked;
			return agg;
		}, {}),
	};
	api.setState(state);
}

stepNameElement.onchange = persistState;
messageNameElement.onchange = persistState;
entityNameElement.onchange = persistState;
userElement.onchange = persistState;
executionOrderElement.onchange = persistState;
stageElement.onchange = persistState;
asyncElement.onchange = persistState;
deployServerElement.onchange = persistState;
deployOfflineElement.onchange = persistState;
document.querySelectorAll<HTMLInputElement>("input[type=checkbox][data-logicalname]").forEach((cb) => {
	cb.onchange = persistState;
});

attributeColumnElement.style.display = messageNameElement.value == "Update" ? "block" : "none";
