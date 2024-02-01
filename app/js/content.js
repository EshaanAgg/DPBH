const API_ENDPOINT = "http://127.0.0.1:5000/";

const descriptions = {
	Sneaking:
		"Coerces users to act in ways that they would not normally act by obscuring information.",
	Urgency: "Places deadlines on things to make them appear more desirable",
	Misdirection: "Aims to deceptively incline a user towards one choice over the other.",
	"Social Proof":
		"Gives the perception that a given action or product has been approved by other people.",
	Scarcity:
		"Tries to increase the value of something by making it appear to be limited in availability.",
	Obstruction:
		"Tries to make an action more difficult so that a user is less likely to do that action.",
	"Forced Action":
		"Forces a user to complete extra, unrelated tasks to do something that should be simple.",
	"Google Ads": "Ads that are placed by Google.",
};

const checkAd = (element) => {
	if (
		(element.src && element.src.includes("googlesyndication")) ||
		(element.id && element.id.includes("google_ads"))
	)
		return true;
	return false;
};

function scrape() {
	if (document.getElementById("dark_bust_count")) return;

	setLoadingScreen(true);

	let dp_count = 0;

	// Aggregate all DOM elements on the page
	const elements = segments(document.body).filter((element) => {
		// Check if the element is an ad and highlight it
		if (checkAd(element)) {
			dp_count++;
			highlight(element, "Google Ads"); // Modified this line
			return false;
		}

		return element.innerText?.trim().replace(/\t/g, " ").length > 0;
	});

	const elementTexts = elements.map((element) => element.innerText.trim().replace(/\t/g, " "));

	// Send the DOM elements to the backend
	fetch(API_ENDPOINT, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(elementTexts),
	})
		.then((resp) => resp.json())
		.then((data) => {
			for (let i = 0; i < elements.length; i++) {
				if (elementTexts[i].length == 0) continue;
				if (data[i].dp) {
					highlight(elements[i], data[i].dp_class);
					dp_count++;
				}
			}

			// Store number of dark patterns on the analyzed page
			const g = document.createElement("div");
			g.id = "dark_bust_count";
			g.value = dp_count;
			g.style.opacity = 0;
			g.style.position = "fixed";
			document.body.appendChild(g);
			sendDarkPatternCount(g.value);
		})
		.catch((error) => {
			alert(error);
			alert(error.stack);
		})
		.finally(() => {
			setLoadingScreen(false);
		});
}

function highlight(element, type) {
	element.classList.add("dark_bust-highlight");

	let body = document.createElement("span");
	body.classList.add("dark_bust-highlight-body");

	let header = document.createElement("div");
	header.classList.add("modal-header");
	let headerText = document.createElement("h1");
	headerText.innerHTML = type + " Pattern";
	header.appendChild(headerText);
	body.appendChild(header);

	let content = document.createElement("div");
	content.classList.add("modal-content");
	content.innerHTML = descriptions[type];
	body.appendChild(content);

	element.appendChild(body);
}

function sendDarkPatternCount(number) {
	chrome.runtime.sendMessage({
		message: "update_current_count",
		count: number,
	});
}

function setLoadingScreen(status) {
	chrome.runtime.sendMessage({
		message: status ? "start_loading_screen" : "stop_loading_screen",
	});
}

chrome.runtime.onMessage.addListener(function (request, _sender, _sendResponse) {
	if (request.message === "analyze_site") {
		scrape();
	} else if (request.message === "popup_open") {
		let element = document.getElementById("dark_bust_count");
		if (element) {
			sendDarkPatternCount(element.value);
		}
	}
});
