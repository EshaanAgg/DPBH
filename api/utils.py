import json
import requests
import urllib.parse
import pandas as pd

ipQualityKey = "bWZjrc5gAVlpmPq20zVkWVnSCsmF3dvz"
keysToCheck = ["spamming", "malware", "phishing", "suspicious", "adult"]
malicious_url_csv_file = 'api/malicious_urls.csv'

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


def check_urls_in_csv(urls_to_check):
    df = pd.read_csv(malicious_url_csv_file)
    url_column = df['url']
    result_list = [1 if url in url_column.values else 0 for url in urls_to_check]
    return result_list
