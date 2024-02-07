const API_ENDPOINT = "http://127.0.0.1:5000";

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
	"Malicious URL": "URLs that are potentially harmful to the user.",
};

const checkAd = (element) => {
	if (
		(element.src && element.src.includes("googlesyndication")) ||
		(element.id && element.id.includes("google_ads"))
	)
		return true;
	return false;
};

async function scrape() {
	if (document.getElementById("dark_bust_count")) return;

	setLoadingScreen(true);
	const documentSegments = segments(document.body);
	const maliciousURLCount = higlightMaliciousURLs(documentSegments);

	let dp_count = 0;

	// Aggregate all DOM elements on the page
	const elements = documentSegments.filter((element) => {
		// Check if the element is an ad and highlight it
		if (checkAd(element)) {
			dp_count++;
			highlight(element, "Google Ads", 1);
			return false;
		}

		return element.innerText?.trim().replace(/\t/g, " ").length > 0;
	});
	const elementTexts = elements.map((element) => element.innerText.trim().replace(/\t/g, " "));
	const dpElements = fetch(`${API_ENDPOINT}/`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(elementTexts),
	})
		.then((resp) => resp.json())
		.then((data) => {
			for (let i = 0; i < elements.length; i++) {
				if (elementTexts[i].length == 0) continue;
				if (data[i].dp) {
					highlight(elements[i], data[i].dp_class, data[i].confidence);
					dp_count++;
				}
			}
		});

	// Wait for the malicious URL and dark pattern checks to finish
	const response = await Promise.all([dpElements, maliciousURLCount]);
	dp_count += response[1];

	// Store number of dark patterns on the analyzed page
	const g = document.createElement("div");
	g.id = "dark_bust_count";
	g.value = dp_count;
	g.style.opacity = 0;
	g.style.position = "fixed";
	document.body.appendChild(g);
	sendDarkPatternCount(g.value);

	setLoadingScreen(false);
}

// Highlights the elements with malicious URLs and returns the number of malicious URLs
const higlightMaliciousURLs = async (elms) => {
	let elements = elms
		.filter((elm) => elm.src || elm.href)
		.map((elm) => ({
			url: elm.src || elm.href,
			element: elm,
		}));

	const requests = elements.map((elm) => {
		return fetch(`${API_ENDPOINT}/url_scan`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ url: elm.url }),
		}).then((resp) => resp.json());
	});

	const responses = await Promise.all(requests);
	let count = 0;
	responses.forEach((resp, i) => {
		if (resp.unsafe) {
			highlight(
				elements[i].element,
				"Malicious URL",
				resp.risk_score,
				resp.categories.length
					? `This URL is possibly related to: ${resp.categories.join(", ")}`
					: "",
				"Risk"
			);
			count++;
		}
	});

	return count;
};

function highlight(element, type, confidence, description = "", confidenceHeader = "Confidence") {
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
	content.innerHTML = description.length ? description : descriptions[type];
	content.innerHTML += "<br>";
	content.innerHTML += `${(confidence * 100).toFixed(2)}% ${confidenceHeader}`;
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
	console.log(`[RECIEVED] [${request.message}]`);
	switch (request.message) {
		case "analyze_site":
			scrape();
			break;

		case "popup_open":
			let element = document.getElementById("dark_bust_count");
			if (element) sendDarkPatternCount(element.value);
			break;

		case "send_report":
			sendReport();
			break;
	}
});

const sendReport = () => {
	const selectedContent = localStorage.getItem("darkBustSelectedContent");
	if (!selectedContent) {
		alert(
			"You have not selected any content to report. Please select some content with your cursor and then click on the report button."
		);
		return;
	}

	const contentTrimmed =
		selectedContent.length > 100 ? `${selectedContent.slice(0, 100)}...` : selectedContent;
	const description = prompt(
		`You want to report the following content: \n\n${contentTrimmed}\n\nPlease provide a brief description of why you think this is a dark pattern.`
	);

	if (description === null) {
		alert("Sending the report was aborted.");
		return;
	}

	fetch(`${API_ENDPOINT}/report`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			content: selectedContent,
			description,
			url: window.location.href,
		}),
	});

	alert("Report submitted successfully. Thank you for your contribution!");
};

document.addEventListener("selectionchange", function (_event) {
	const selectedText = window.getSelection().toString().trim();
	if (selectedText) localStorage.setItem("darkBustSelectedContent", selectedText);
});
