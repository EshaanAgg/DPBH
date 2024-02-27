import requests

available_languages = set()
for lang in [
    "hi",
    "gom",
    "kn",
    "doi",
    "brx",
    "ur",
    "ta",
    "ks",
    "as",
    "bn",
    "mr",
    "sd",
    "mai",
    "pa",
    "ml",
    "mni",
    "te",
    "sa",
    "ne",
    "sat",
    "gu",
    "or",
]:
    available_languages.add(lang)


def get_language_code(input_string):
    lang, _ = input_string.split("_")
    while lang not in available_languages:
        lang = lang[:-1]
    return lang


def translate(source_language_code, target_language_code, content):
    payload = {
        "pipelineTasks": [
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": source_language_code,
                        "targetLanguage": target_language_code,
                    }
                },
            }
        ],
        "pipelineRequestConfig": {"pipelineId": "64392f96daac500b55c543cd"},
    }

    headers = {
        "Content-Type": "application/json",
        "userID": "e09f583309fe4e86ad5c1e915f6dca4e",
        "ulcaApiKey": "4716e6665a-7186-46e0-88d8-902e90a02f63",
    }

    response = requests.post(
        "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline",
        json=payload,
        headers=headers,
    )

    if response.status_code == 200:
        response_data = response.json()
        service_id = response_data["pipelineResponseConfig"][0]["config"][0][
            "serviceId"
        ]

        compute_payload = {
            "pipelineTasks": [
                {
                    "taskType": "translation",
                    "config": {
                        "language": {
                            "sourceLanguage": source_language_code,
                            "targetLanguage": target_language_code,
                        },
                        "serviceId": service_id,
                    },
                }
            ],
            "inputData": {
                "input": [{"source": content}],
                "audio": [{"audioContent": None}],
            },
        }

        callback_url = response_data["pipelineInferenceAPIEndPoint"]["callbackUrl"]

        headers2 = {
            "Content-Type": "application/json",
            response_data["pipelineInferenceAPIEndPoint"]["inferenceApiKey"][
                "name"
            ]: response_data["pipelineInferenceAPIEndPoint"]["inferenceApiKey"][
                "value"
            ],
        }

        compute_response = requests.post(
            callback_url, json=compute_payload, headers=headers2
        )

        if compute_response.status_code == 200:
            compute_response_data = compute_response.json()
            translated_content = compute_response_data["pipelineResponse"][0]["output"][
                0
            ]["target"]
            return {
                "status_code": 200,
                "message": "Translation successful",
                "translated_content": translated_content,
            }
        else:
            return {
                "status_code": compute_response.status_code,
                "message": "Error in translation",
                "translated_content": None,
            }
    else:
        return {
            "status_code": response.status_code,
            "message": "Error in translation request",
            "translated_content": None,
        }


def is_english(text):
    non_ascii_count = sum(1 for char in text if ord(char) > 127)
    if non_ascii_count / len(text) < 0.05:
        return True
    else:
        return False


def get_translated_text(text, IndicLID_model):
    if is_english(text):
        return text
    else:
        res = IndicLID_model.batch_predict([text], 1)
        source_language_code = get_language_code(res[0][1])
        return translate(source_language_code, "en", text)["translated_content"]
