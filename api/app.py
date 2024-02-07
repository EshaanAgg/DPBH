from flask import Flask, request, jsonify
from dp_prediction import DPPredictionPipeline
from flask_cors import CORS
from utils import malicious_URL_scan

app = Flask(__name__)
CORS(app)


@app.route("/", methods=["POST"])
def detect_and_classify():
    try:
        texts = request.get_json()
        dp_predictor = DPPredictionPipeline()

        predictions = []
        for text in texts:
            prediction, confidence = dp_predictor.predict(text)
            if not prediction:
                predictions.append(
                    {
                        "dp": 0,
                    }
                )
            else:
                predictions.append(
                    {"dp": 1, "dp_class": prediction, "confidence": confidence}
                )

        return jsonify(predictions)

    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


@app.route("/", methods=["GET"])
def index():
    return "The server is up and running!"


@app.route("/url_scan", methods=["POST"])
def url_scan():
    try:
        data = request.get_json()
        return jsonify(malicious_URL_scan(data["url"]))
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


@app.route("/report", methods=["POST"])
def report():
    # TODO: Implement the reporting functionality
    data = request.get_json()
    print(data)
    return jsonify({"status": "Reported"})
