import json
import requests
import urllib.parse

ipQualityKey = "bWZjrc5gAVlpmPq20zVkWVnSCsmF3dvz"
keysToCheck = ["spamming", "malware", "phishing", "suspicious", "adult"]


def malicious_URL_scan(url, vars={}):
    url = "https://www.ipqualityscore.com/api/json/url/%s/%s" % (
        ipQualityKey,
        urllib.parse.quote_plus(url),
    )
    x = requests.get(url, params=vars)
    data = json.loads(x.text)

    presentCategories = [key for key in keysToCheck if data[key]]

    return {
        "unsafe": data["unsafe"],
        "risk_score": data["risk_score"],
        "categories": presentCategories,
    }
