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
			const countArray = [];
			for (const key in request.count) {
			const value = request.count[key];
			countArray.push([key, value]);
			}
			console.log(countArray);
			document.getElementsByClassName("number")[0].textContent = countArray[0][1];
			const dp1Element = document.getElementsByClassName("dp1")[0];
			dp1Element.getElementsByTagName("em")[0].textContent = countArray[1][0];
			dp1Element.getElementsByTagName("span")[0].textContent = countArray[1][1];
			const dp2Element = document.getElementsByClassName("dp2")[0];
			dp2Element.getElementsByTagName("em")[0].textContent = countArray[2][0];
			dp2Element.getElementsByTagName("span")[0].textContent = countArray[2][1];
			const dp3Element = document.getElementsByClassName("dp3")[0];
			dp3Element.getElementsByTagName("em")[0].textContent = countArray[3][0];
			dp3Element.getElementsByTagName("span")[0].textContent = countArray[3][1];
			const dp4Element = document.getElementsByClassName("dp4")[0];
			dp4Element.getElementsByTagName("em")[0].textContent = countArray[4][0];
			dp4Element.getElementsByTagName("span")[0].textContent = countArray[4][1];
			const dp5Element = document.getElementsByClassName("dp5")[0];
			dp5Element.getElementsByTagName("em")[0].textContent = countArray[5][0];
			dp5Element.getElementsByTagName("span")[0].textContent = countArray[5][1];
			setBarWidth(".style-1 span", ".style-1 em", "padding-right", 50);
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

	function setBarWidth(dataElement, barElement, cssProperty, barPercent) {
		var listData = Array.from(document.querySelectorAll(dataElement)).map(function(element) {
			return element.innerHTML;
		});
		var listMax = Math.max(...listData);
		Array.from(document.querySelectorAll(barElement)).forEach(function(element, index) {
			element.style[cssProperty] = (listData[index] / listMax) * barPercent + "%";
		});
	}
});



