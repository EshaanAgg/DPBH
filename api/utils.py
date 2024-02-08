import os
import pandas as pd
from datetime import datetime
from urllib.parse import urlparse

file_path = os.path.dirname(os.path.abspath(__file__))
malicious_url_csv_file = os.path.join(file_path, "../data/malicious_urls.csv")


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
