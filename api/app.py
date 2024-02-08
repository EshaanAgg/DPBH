import json
import requests
from flask_cors import CORS
from urllib.parse import urlparse
from flask import request, jsonify
from utils import malicious_URL_scan
from flask_sqlalchemy import SQLAlchemy
from flask import Flask, request, jsonify
from dp_prediction import DPPredictionPipeline


app = Flask(__name__)
CORS(app)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///cache.db"
db = SQLAlchemy(app)


class CachedDomainScan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    domain = db.Column(db.String(255), unique=True, nullable=False)
    result = db.Column(db.String(4096), nullable=False)


class CachedPrediction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(4096), unique=True)
    dp = db.Column(db.Integer)
    dp_class = db.Column(db.String(255), default="")
    confidence = db.Column(db.Float, default=0.0)


with app.app_context():
    db.create_all()


@app.route("/", methods=["POST"])
def detect_and_classify():
    try:
        texts = request.get_json()
        dp_predictor = DPPredictionPipeline()
        predictions = []

        for text in texts:
            cached_prediction = CachedPrediction.query.filter_by(text=text).first()

            if cached_prediction:
                predictions.append(
                    {
                        "dp": cached_prediction.dp,
                        "dp_class": cached_prediction.dp_class,
                        "confidence": cached_prediction.confidence,
                    }
                )
            else:
                prediction, confidence = dp_predictor.predict(text)
                if not prediction:
                    predictions.append({"dp": 0})
                    new_prediction = CachedPrediction(text=text, dp=0)
                    db.session.add(new_prediction)
                else:
                    new_prediction = CachedPrediction(
                        text=text, dp=1, dp_class=prediction, confidence=confidence
                    )
                    db.session.add(new_prediction)
                    predictions.append(
                        {"dp": 1, "dp_class": prediction, "confidence": confidence}
                    )

        db.session.commit()
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
        url = request.get_json()["url"]
        domain = urlparse(url).netloc

        cached_scan = CachedDomainScan.query.filter_by(domain=domain).first()
        if cached_scan:
            result = json.loads(cached_scan.result)
        else:
            result = malicious_URL_scan(url)
            new_cached_scan = CachedDomainScan(domain=domain, result=json.dumps(result))
            db.session.add(new_cached_scan)
            db.session.commit()

        return jsonify(result)

    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


@app.route("/report", methods=["POST"])
def report():
    # TODO: Implement the reporting functionality
    data = request.get_json()
    print(data)
    return jsonify({"status": "Reported"})

@app.route("/review", methods=["POST"])
def review():
    review = request.get_json()
    content = review["content"]
    response = requests.post(
        "https://api.sapling.ai/api/v1/aidetect",
        json={"key": "4KUJMMC886VPWQMQUOW2MRNEZLX0REFQ", "text": content},
    )
    response_Dict = response.json()
    score = response_Dict["score"]

    return jsonify({"score": round(score * 100, 2)})
