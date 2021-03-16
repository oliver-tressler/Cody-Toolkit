import { api, sendRequest, onMessage } from "./ExtensionInterface";
type State = {
	pre: boolean;
	post: boolean;
	name: string;
	alias: string;
	attributes: { [key: string]: boolean };
};
type ImageAttribute = { LogicalName: string; DisplayName?: string; Available: boolean };
type ImageItem = {
	Id: string;
	Name: string;
	EntityAlias: string;
	AvailablePre: boolean;
	AvailablePost: boolean;
	IsPre: boolean;
	IsPost: boolean;
	ImageAttributes: ImageAttribute[];
};

//#region RequestTypes

type SaveImageRequest = {
	Name: string;
	EntityAlias: string;
	AvailablePre: boolean;
	AvailablePost: boolean;
	ImageAttributes: ImageAttribute[];
};

//#endregion

function selectAttributes(select: boolean) {
	document
		.getElementById("attribute_container")
		?.querySelectorAll<HTMLInputElement>("tr:not(.hidden) input[type=checkbox]")
		.forEach((cb: HTMLInputElement) => {
			cb.checked = select;
		});
	persistState();
}

function searchAttributes(value: string) {
	const table = document.getElementById("attribute_container");
	if (!value) {
		table?.querySelectorAll("tr.hidden").forEach((row) => {
			row.classList.remove("hidden");
		});
		return;
	}
	const shouldBeHidden = table?.querySelectorAll(
		`tr:not([data-logicalname*=\"${value}\"]):not([data-displayname*=\"${value}\"])`
	);
	const shouldNotBeHidden = table?.querySelectorAll(
		`tr[data-logicalname*=\"${value}\"], tr[data-displayname*=\"${value}\"]`
	);
	shouldNotBeHidden?.forEach((unhide) => {
		unhide.classList.remove("hidden");
	});
	shouldBeHidden?.forEach((hide) => {
		hide.classList.add("hidden");
	});
}

async function postData() {
	validatePreAndPostImage();
	if (!(document.getElementById("image_form") as HTMLFormElement).reportValidity()) {
		return;
	}
	const selectedAttributes: ImageAttribute[] = [];
	document.querySelectorAll<HTMLInputElement>("input[type=checkbox][data-logicalname][checked]").forEach((el) => {
		selectedAttributes.push({
			LogicalName: el.getAttribute("data-logicalname")!,
			DisplayName: el.getAttribute("data-displayname") ?? undefined,
			Available: el.checked,
		});
	});
	try {
		document.getElementById("input_image_submit")?.setAttribute("disabled", "true");
		const response = await sendRequest<SaveImageRequest, { ImageName: string }>("plugineditor_saveimage", {
			Name: nameElement.value,
			EntityAlias: entityAliasElement.value,
			AvailablePre: availablePre.checked,
			AvailablePost: availablePost.checked,
			ImageAttributes: selectedAttributes,
		});
		const headingImageName = document.getElementById("heading_image_name");
		headingImageName && (headingImageName.textContent = response.ImageName);
	} finally {
		document.getElementById("input_image_submit")?.removeAttribute("disabled");
	}
}

function validatePreAndPostImage() {
	const checkAvailablePre = availablePre.closest<HTMLElement>(".setting")?.style.display !== "none";
	const checkAvailablePost = availablePost.closest<HTMLElement>(".setting")?.style.display !== "none";
	if ((checkAvailablePre && availablePre.checked) || (checkAvailablePost && availablePost.checked)) {
		availablePre.setCustomValidity("");
		availablePost.setCustomValidity("");
	} else {
		if (checkAvailablePre) {
			availablePre.setCustomValidity("You must select at least one Image Type");
		} else if (checkAvailablePost) {
			availablePost.setCustomValidity("You must select at least one Image Type");
		}
	}
}

function persistState() {
	const attributes = Array.from(
		document.querySelectorAll<HTMLInputElement>("input[type=checkbox][data-logicalname]")
	);
	const state = {
		name: nameElement.value,
		alias: entityAliasElement.value,
		pre: availablePre.checked,
		post: availablePost.checked,
		attributes: attributes.reduce((agg, curr) => {
			const logicalName = curr.getAttribute("data-logicalname");
			logicalName && (agg[logicalName] = curr.checked);
			return agg;
		}, {} as { [key: string]: boolean }),
	};
	api.setState(state);
}

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
	if (state) {
		input.setAttribute("checked", "true");
	}
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

function renderUpdate(item: ImageItem): void {
	document.getElementById("heading_image_name")!.textContent = item.Name;
	document.getElementById("input_image_name")?.setAttribute("value", item.Name);
	document.getElementById("input_image_entity_alias")?.setAttribute("value", item.EntityAlias);

	if (!item.AvailablePre) {
		document.getElementById("input_container_pre_image")!.style.display = "none";
	} else {
		if (item.IsPre) {
			document.getElementById("input_image_pre_image")!.setAttribute("checked", "true");
		}
	}

	if (!item.AvailablePost) {
		document.getElementById("input_container_post_image")!.style.display = "none";
	} else {
		if (item.IsPost) {
			document.getElementById("input_image_post_image")!.setAttribute("checked", "true");
		}
	}
	const attributes = item.ImageAttributes;
	const attributeElement = document.createDocumentFragment();
	for (const { Available, DisplayName, LogicalName } of attributes) {
		// Construct Checkbox
		const control = createCheckbox(document, LogicalName, LogicalName, Available, {
			"data-logicalname": LogicalName,
		});
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
		DisplayName && row.setAttribute("data-displayname", DisplayName);
		row.append(checkBoxCell, displayNameCell, logicalNameCell);
		attributeElement.append(row);
	}
	document.querySelector("#attribute_container tbody")?.append(attributeElement);
	persistState();
	renderBase();
}

function renderCreate(item: ImageItem): void {
	document.getElementById("heading_image_name")!.textContent = "New Image";
	document.getElementById("input_image_name")?.setAttribute("value", "Image");
	document.getElementById("input_image_entity_alias")?.setAttribute("value", "EntityAlias");
	if (!item.AvailablePre) {
		document.getElementById("input_container_pre_image")!.style.display = "none";
	} else {
		document.getElementById("input_image_pre_image")!.setAttribute("checked", "true");
	}

	if (!item.AvailablePost) {
		document.getElementById("input_container_post_image")!.style.display = "none";
	} else {
		document.getElementById("input_image_post_image")!.setAttribute("checked", "true");
	}
	const attributes = item.ImageAttributes;
	const attributeElement = document.createDocumentFragment();
	for (const { Available, DisplayName, LogicalName } of attributes) {
		// Construct Checkbox
		const control = createCheckbox(document, LogicalName, LogicalName, Available, {
			"data-logicalname": LogicalName,
		});
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
		DisplayName && row.setAttribute("data-displayname", DisplayName);
		row.append(checkBoxCell, displayNameCell, logicalNameCell);
		attributeElement.append(row);
	}
	document.querySelector("#attribute_container tbody")?.append(attributeElement);
	persistState();
	renderBase();
}

function renderFromState(state: State) {
	availablePre.checked = state.pre;
	availablePost.checked = state.post;
	nameElement.value = state.name;
	entityAliasElement.value = state.alias;
	const headingElement = document.getElementById("heading_image_name");
	headingElement && (headingElement.textContent = state.name);
	document.querySelectorAll<HTMLInputElement>("input[type=checkbox][data-logicalname]").forEach((cb) => {
		const logicalName = cb.getAttribute("data-logicalname");
		logicalName && (cb.checked = state.attributes[logicalName]);
	});
	renderBase();
}

function renderBase() {
	document.querySelectorAll<HTMLInputElement>("input[type=checkbox][data-logicalname]").forEach((cb) => {
		cb.onchange = persistState;
	});
}

const availablePost = document.getElementById("input_image_post_image") as HTMLInputElement;
const availablePre = document.getElementById("input_image_pre_image") as HTMLInputElement;
const nameElement = document.getElementById("input_image_name") as HTMLInputElement;
const entityAliasElement = document.getElementById("input_image_entity_alias") as HTMLInputElement;

const state = api.getState();
if (state) {
	renderFromState(state);
} else {
	onMessage<ImageItem>("image_renderCreate", renderCreate);
	onMessage<ImageItem>("image_renderUpdate", renderUpdate);
}

availablePre.onchange = () => {
	validatePreAndPostImage();
	persistState();
};
availablePost.onchange = () => {
	validatePreAndPostImage();
	persistState();
};
nameElement.onchange = persistState;
entityAliasElement.onchange = persistState;

const submitBtn = document.querySelector<HTMLInputElement>("button[type=submit]");
submitBtn && (submitBtn.onclick = postData);
const selectAllAttributesBtn = document.getElementById("select_all_attributes");
selectAllAttributesBtn && (selectAllAttributesBtn.onclick = () => selectAttributes(true));
const deselectAllAttributesBtn = document.getElementById("deselect_all_attributes");
deselectAllAttributesBtn && (deselectAllAttributesBtn.onclick = () => selectAttributes(false));
const searchAttributesField = document.getElementById("search_attributes") as HTMLInputElement | undefined;
searchAttributesField &&
	(searchAttributesField.oninput = function (event) {
		searchAttributes((event.target as HTMLInputElement).value);
	});
