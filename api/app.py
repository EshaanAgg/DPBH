from flask import Flask, request, jsonify
from dp_detection import DPDetectionPipeline
from dp_classification import DPClassificationPipeline
from dp_prediction import DPPredictionPipeline
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


@app.route("/detect", methods=["GET"])
def detect():
    try:
        texts = request.get_json()
        dp_detection_classifier = DPDetectionPipeline()
        predictions = [dp_detection_classifier.predict(text) for text in texts]
        return jsonify(predictions)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/classify", methods=["GET"])
def classify():
    try:
        texts = request.get_json()
        dp_classifier = DPClassificationPipeline()
        predictions = [dp_classifier.predict(text) for text in texts]
        return jsonify(predictions)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# @app.route("/", methods=["POST"])
# def detect_and_classify():
#     try:
#         texts = request.get_json()
#         dp_detection_classifier = DPDetectionPipeline()
#         dp_classifier = DPClassificationPipeline()

#         predictions = []
#         for text in texts:
#             prediction = dp_detection_classifier.predict(text)
#             if prediction == 0:
#                 predictions.append(
#                     {
#                         "dp": 0,
#                         "dp_class": "",
#                     }
#                 )
#             else:
#                 predictions.append({"dp": 1, "dp_class": dp_classifier.predict(text)})

#         return jsonify(predictions)

#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

@app.route("/", methods=["POST"])
def detect_and_classify():
    try:
        texts = request.get_json()
        dp_predictor = DPPredictionPipeline()

        predictions = []
        for text in texts:
            prediction = dp_predictor.predict(text)
            if not prediction:
                predictions.append(
                    {
                        "dp": 0,
                        "dp_class": "",
                    }
                )
            else:
                predictions.append({"dp": 1, "dp_class": prediction})
        
        return jsonify(predictions)

    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


@app.route("/", methods=["GET"])
def index():
    return "The server is up and running!"
