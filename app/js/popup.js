window.onload = function () {
	chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
		chrome.tabs.sendMessage(tabs[0].id, { message: "popup_open" });
		chrome.tabs.sendMessage(tabs[0].id, { message: "analyze_site" });
	});

	document.getElementById("submitReport").onclick = function () {
		chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
			chrome.tabs.sendMessage(tabs[0].id, { message: "send_report" });
		});
	};

	document.getElementById("checkFakeReview").onclick = function () {
		chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
			chrome.tabs.sendMessage(tabs[0].id, { message: "send_review" });
		});
	};
};

chrome.runtime.onMessage.addListener(function (request, _sender, _sendResponse) {
	console.log(`[RECIEVED] [${request.message}]`);
	switch (request.message) {
		case "update_current_count":
			document.getElementsByClassName("number")[0].textContent = request.count;
			break;

		case "start_loading_screen":
			document.getElementById("loader").style.display = "block";
			break;

		case "stop_loading_screen":
			document.getElementById("loader").style.display = "none";
			break;
		case "update_selection":
			localStorage.setItem("darkBustSelectedContent", request.content);
			break;
	}
});
