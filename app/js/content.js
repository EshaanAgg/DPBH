const API_ENDPOINT = "http://127.0.0.1:5000";

document.addEventListener("DOMContentLoaded", function () {
	// Load the Tesseract script from a URL into the DOM
	const script = document.createElement("script");
	script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
	document.head.appendChild(script);
});

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

const highlightMaliciousImages = (elements) => {
	elements
		.filter((elm) => elm.src)
		.forEach((elm) => {
			(async () => {
				const worker = await Tesseract.createWorker();
				const ret = await worker.recognize(ele.src);
				const dp = await fetch(`${API_ENDPOINT}/`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						site_visited: window.location.href,
						texts: [ret.data.text],
					}),
				}).then((resp) => resp.json()[0]);

				if (dp.dp) highlight(elm, dp.dp_class, dp.confidence);
				await worker.terminate();
			})();
		});
};

async function scrape() {
	if (document.getElementById("dark_bust_count")) return;

	setLoadingScreen(true);

	const documentSegments = segments(document.body);
	const maliciousURLCount = 0;

	let dp_count = new Map([
		["Sneaking", 0],
		["Urgency", 0],
		["Misdirection", 0],
		["Social Proof", 0],
		["Scarcity", 0],
		["Obstruction", 0],
		["Forced Action", 0],
		["Google Ads", 0],
		["Malicious URL", 0],
		["Total", 0]
	]);

	// Aggregate all DOM elements on the page
	const elements = documentSegments.filter((element) => {
		// Check if the element is an ad and highlight it
		if (checkAd(element)) {
			dp_count.set("Google Ads", dp_count.get("Google Ads") + 1);
			dp_count.set("Total", dp_count.get("Total") + 1);
			highlight(element, "Google Ads", 1);
			return false;
		}

		return element.innerText?.trim().replace(/\t/g, " ").length > 0;
	});

	const elementTexts = elements.map((element) => element.innerText.trim().replace(/\t/g, " "));
	const dpElements = fetch(`${API_ENDPOINT}/`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			site_visited: window.location.href,
			texts: elementTexts,
		}),
	})
		.then((resp) => resp.json())
		.then((data) => {
			for (let i = 0; i < elements.length; i++) {
				if (elementTexts[i].length == 0) continue;
				if (data[i].dp) {
					highlight(elements[i], data[i].dp_class, data[i].confidence);
					dp_count.set(data[i].dp_class, dp_count.get(data[i].dp_class) + 1);
					dp_count.set("Total", dp_count.get("Total") + 1);
				}
			}
		});

	// Wait for the malicious URL and dark pattern checks to finish
	const response = await Promise.all([dpElements, maliciousURLCount]);
	dp_count.set("Malicious URL", dp_count.get("Malicious URL") + response[1]);
	dp_count.set("Total", dp_count.get("Total") + response[1]);

	// Store number of dark patterns on the analyzed page
	// const g = document.createElement("div");
	// g.id = "dark_bust_count";
	// g.value = JSON.stringify({ ...dp_count });
	// g.style.opacity = 0;
	// g.style.position = "fixed";
	// document.body.appendChild(g);
	sendDarkPatterns(dp_count);

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
			body: JSON.stringify({
				site_visited: window.location.href,
				url: elm.url,
			}),
		}).then((resp) => resp.json());
	});

	const responses = await Promise.all(requests);
	let count = 0;
	responses.forEach((resp, i) => {
		if (resp.malicious) {
			highlight(
				elements[i].element,
				"Malicious URL",
				1,
				`The URL was found to be reported as malicious. The verification for the same was last done on ${resp.verification_time}.`,
				"Risk"
			);
			count++;
		}
	});

	return count;
};

/**
 * @param {HTMLElement} element The element to highlight
 * @param {string} type The type of dark pattern that this element has
 * @param {number} confidence The confidence that this element is a dark pattern. Should be a number between 0 and 1
 * @param {string} [description=""] A description of the dark pattern. If not provided, the default description for the type will be used from the global descriptions object
 * @param {string} [confidenceHeader="Confidence"] Prefix shown before the confidence percentage
 */
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

// Send the number of dark patterns to the popup
function sendDarkPatterns(patterns) {
	patterns = new Map([...patterns.entries()].sort((a, b) => b[1] - a[1]));

	// Trim patterns to top 5 elements
	patterns = new Map([...patterns.entries()].slice(0, 6));
	const patternsObj = Object.fromEntries(patterns);
	
	chrome.runtime.sendMessage({
		message: "update_current_count",
		count: patternsObj,
	});
}

// Control the loading screen on the popup
function setLoadingScreen(status) {
	chrome.runtime.sendMessage({
		message: status ? "start_loading_screen" : "stop_loading_screen",
	});
}

// Message listener for the content script
chrome.runtime.onMessage.addListener(function (request, _sender, _sendResponse) {
	console.log(`[RECIEVED] [${request.message}]`);
	switch (request.message) {
		case "analyze_site":
			scrape();
			break;

		case "popup_open":
			let element = document.getElementById("dark_bust_count");
			if (element) sendDarkPatterns(element.value);
			break;

		case "send_report":
			sendReport();
			break;

		case "send_review":
			sendReview();
			break;
	}
});

// Asks the user for information about the dark pattern that he/she wants to report and sends it to the server
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

// Asks the user for information about the dark pattern that he/she wants to report and sends it to the server
const sendReview = async () => {
	const selectedContent = localStorage.getItem("darkBustSelectedContent");
	if (!selectedContent) {
		alert(
			"You have not selected any content to review. Please select some content with your cursor and then click on the review button."
		);
		return;
	}

	const contentTrimmed =
		selectedContent.length > 100 ? `${selectedContent.slice(0, 100)}...` : selectedContent;
	const description = prompt(`You want to review the following content: \n\n${contentTrimmed}\n\n`);

	if (description === null) {
		alert("Sending the review was aborted.");
		return;
	}
	console.log(selectedContent);
	const response = await fetch(`${API_ENDPOINT}/review`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			content: selectedContent,
		}),
	});

	const data = await response.json();
	const score = data.score;
	alert(`Review submitted successfully. The content was rated as ${score}`);
};

// Listen for selection changes and store the selected content in
// the local storage, so that the same can be accessed by the `sendReport` function
document.addEventListener("selectionchange", function (_event) {
	const selectedText = window.getSelection().toString().trim();
	if (selectedText) localStorage.setItem("darkBustSelectedContent", selectedText);
});
