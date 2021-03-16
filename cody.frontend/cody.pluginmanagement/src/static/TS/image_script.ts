import { ExtensionInterface } from "./ExtensionInterface";

const availablePost = document.getElementById("input_image_post_image") as HTMLInputElement;
const availablePre = document.getElementById("input_image_pre_image") as HTMLInputElement;
const nameElement = document.getElementById("input_image_name") as HTMLInputElement;
const entityAliasElement = document.getElementById("input_image_entity_alias") as HTMLInputElement;

declare const acquireVsCodeApi: () => any;
const api = acquireVsCodeApi();
const extensionInterface = new ExtensionInterface(api);
const state = api.getState();
if (state) {
	availablePre.checked = state.pre;
	availablePost.checked = state.post;
	nameElement.value = state.name;
	entityAliasElement.value = state.alias;
	document.getElementById("heading_image_name").textContent = state.name;
	document.querySelectorAll<HTMLInputElement>("input[type=checkbox][data-logicalname]").forEach((cb) => {
		cb.checked = state.attributes[cb.getAttribute("data-logicalname")];
	});
}

export function selectAttributes(select: boolean) {
	document
		.getElementById("attribute_container")
		.querySelectorAll<HTMLInputElement>("tr:not(.hidden) input[type=checkbox]")
		.forEach((cb) => {
			cb.checked = select;
		});
	persistState();
}

export function searchAttributes(value) {
	const table = document.getElementById("attribute_container");
	if (value == null || value == "") {
		table.querySelectorAll("tr.hidden").forEach((row) => {
			row.classList.remove("hidden");
		});
		return;
	}
	const shouldBeHidden = table.querySelectorAll(
		`tr:not([data-logicalname*=\"${value}\"]):not([data-displayname*=\"${value}\"])`
	);
	const shouldNotBeHidden = table.querySelectorAll(
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
	validatePreAndPostImage();
	if (!(document.getElementById("image_form") as HTMLFormElement).reportValidity()) return;
	const selectedAttributes = [];
	document.querySelectorAll<HTMLInputElement>("input[type=checkbox][data-logicalname][checked]").forEach((el) => {
		selectedAttributes.push({
			LogicalName: el.getAttribute("data-logicalname"),
			DisplayName: el.getAttribute("data-displayname"),
			Available: el.checked,
		});
	});
	try {
		document.getElementById("input_image_submit").setAttribute("disabled", "true");
		const response = await extensionInterface.sendRequest<{ ImageName: string; Id: string }>({
			command: "plugineditor_saveimage",
			id: "imagesave",
			payload: {
				Name: nameElement.value,
				EntityAlias: entityAliasElement.value,
				AvailablePre: availablePre.checked,
				AvailablePost: availablePost.checked,
				ImageAttributes: selectedAttributes,
			},
		});
		document.getElementById("heading_image_name").textContent = response.ImageName;
	} finally {
		document.getElementById("input_image_submit").removeAttribute("disabled");
	}
}

function validatePreAndPostImage() {
	const checkAvailablePre = availablePre.closest<HTMLElement>(".setting").style.display != "none";
	const checkAvailablePost = availablePost.closest<HTMLElement>(".setting").style.display != "none";
	if ((checkAvailablePre && availablePre.checked) || (checkAvailablePost && availablePost.checked)) {
		availablePre.setCustomValidity("");
		availablePost.setCustomValidity("");
	} else {
		if (checkAvailablePre) availablePre.setCustomValidity("You must select at least one Image Type");
		else if (checkAvailablePost) availablePost.setCustomValidity("You must select at least one Image Type");
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
			agg[curr.getAttribute("data-logicalname")] = curr.checked;
			return agg;
		}, {}),
	};
	api.setState(state);
}

availablePre.onchange = validatePreAndPostImage;
availablePost.onchange = validatePreAndPostImage;
availablePre.onchange = persistState;
availablePost.onchange = persistState;
nameElement.onchange = persistState;
entityAliasElement.onchange = persistState;
document.querySelectorAll<HTMLInputElement>("input[type=checkbox][data-logicalname]").forEach((cb) => {
	cb.onchange = persistState;
});

document.querySelector<HTMLInputElement>("button[type=submit]").onclick = postData;
document.getElementById("select_all_attributes").onclick = () => selectAttributes(true);
document.getElementById("deselect_all_attributes").onclick = () => selectAttributes(false);
(document.getElementById("search_attributes") as HTMLInputElement).oninput = function (event) {
	searchAttributes((event.target as HTMLInputElement).value);
};
