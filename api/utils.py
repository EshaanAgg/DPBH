import os
import pandas as pd
from datetime import datetime
from urllib.parse import urlparse
from transformers import M2M100ForConditionalGeneration, M2M100Tokenizer

file_path = os.path.dirname(os.path.abspath(__file__))
malicious_url_csv_file = os.path.join(file_path, "../data/malicious_urls.csv")

tokenizer = M2M100Tokenizer.from_pretrained("facebook/m2m100_418M")
model = M2M100ForConditionalGeneration.from_pretrained("facebook/m2m100_418M")


# Save the malicious URLs to the database
def init_domain_scan_database(domain_scan_db, db):
    df = pd.read_csv(malicious_url_csv_file)
    datetime_format = "%Y-%m-%dT%H:%M:%S%z"

    for _, row in df.iterrows():
        domain = urlparse(row["url"]).netloc
        verification_time = datetime.strptime(row["verification_time"], datetime_format)

        existing_domain = domain_scan_db.query.filter_by(domain=domain).first()
        if not existing_domain:
            new_domain = domain_scan_db(
                domain=domain, verification_time=verification_time
            )
            db.session.add(new_domain)
            db.session.commit()


def translate_to_english(sentence):
    inputs = tokenizer(
        sentence, return_tensors="pt", padding=True, truncation=True, max_length=512
    )
    translated_ids = model.generate(
        **inputs, forced_bos_token_id=tokenizer.lang_code_to_id["en"]
    )
    translated_sentence = tokenizer.batch_decode(
        translated_ids, skip_special_tokens=True
    )[0]

    return translated_sentence
