import json
import requests
from flask_cors import CORS
from constants import dp_data
from urllib.parse import urlparse
from flask import render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask import Flask, request, jsonify
from dp_prediction import DPPredictionPipeline
from utils import (
    init_domain_scan_database,
    convert_to_classification_data,
)
from translation_unit import get_translated_text
from IndicLID import IndicLID

IndicLID_model = IndicLID(input_threshold=0.5, roman_lid_threshold=0.6)

app = Flask(__name__)
CORS(app)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///cache.db"
db = SQLAlchemy(app)


class CachedDomainScan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    domain = db.Column(db.String(1024), unique=True, nullable=False)
    verification_time = db.Column(db.DateTime, default=db.func.now())


class CachedPrediction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(4096), unique=True)
    dp = db.Column(db.Integer)
    dp_class = db.Column(db.String(255), default="")
    confidence = db.Column(db.Float, default=0.0)


class Visits(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(1024), nullable=False)
    classification_data = db.Column(db.Text, nullable=True)
    visits = db.Column(db.Integer, default=1)

    # Define a custom function to update the count of the classification data
    def set_classification_data(self, data):
        if self.classification_data:
            existing_data = json.loads(self.classification_data)
            for key, value in data.items():
                if key in existing_data:
                    existing_data[key] += value
                else:
                    existing_data[key] = value
            self.classification_data = json.dumps(existing_data)
        else:
            self.classification_data = json.dumps(data)

    def get_classification_data(self):
        return (
            json.loads(self.classification_data) if self.classification_data else None
        )


with app.app_context():
    db.create_all()
    print("[MALICIOUS URL DB] Initializing the database")
    init_domain_scan_database(CachedDomainScan, db)
    print("[MALICIOUS URL DB] Database initialized")


@app.route("/", methods=["POST"])
def detect_and_classify():
    try:
        body = request.get_json()
        texts = body["texts"]
        site_visited = urlparse(body["site_visited"]).netloc

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
                translated_text = get_translated_text(text, IndicLID_model)
                prediction, confidence = dp_predictor.predict(translated_text)
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

        # Set the classification data for the site visited
        visit = Visits.query.filter_by(url=site_visited).first()
        if visit:
            visit.set_classification_data(convert_to_classification_data(predictions))
            visit.visits += 1
        else:
            new_visit = Visits(url=site_visited)
            new_visit.set_classification_data(
                convert_to_classification_data(predictions)
            )
            db.session.add(new_visit)

        db.session.commit()
        return jsonify(predictions)

    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


@app.route("/url_scan", methods=["POST"])
def url_scan():
    try:
        url = request.get_json()["url"]
        site_visited = urlparse(request.get_json()["site_visited"]).netloc
        domain = urlparse(url).netloc
        response = None

        cached_domain_scan = CachedDomainScan.query.filter_by(domain=domain).first()
        if cached_domain_scan:
            response = {
                "malicious": True,
                "domain": cached_domain_scan.domain,
                "verification_time": cached_domain_scan.verification_time,
            }
        else:
            # There is no information about the domain in the cache, so return False to prevent false positives
            response = {"malicious": False}

        # Update the visits stats
        visit = Visits.query.filter_by(url=site_visited).first()
        if visit:
            visit.set_classification_data({"Malicious URLs": 1})
        else:
            new_visit = Visits(url=site_visited)
            new_visit.set_classification_data({"Malicious URLs": 1})
            db.session.add(new_visit)

        db.session.commit()

        return jsonify(response)

    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


@app.route("/report", methods=["POST"])
def report():
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


@app.route("/", methods=["GET"])
def index():
    visits = Visits.query.all()
    data = []
    for visit in visits:
        data.append(
            {
                "url": visit.url,
                "visits": visit.visits,
                "classification_data": visit.get_classification_data(),
            }
        )

    data.sort(key=lambda x: x["visits"], reverse=True)
    return render_template("dashboard.html", data=data, dp_data=dp_data)


if __name__ == "__main__":
    app.run(debug=True)
