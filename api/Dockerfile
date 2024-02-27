FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Download and store the IndicLC model
RUN mkdir models
RUN wget https://github.com/AI4Bharat/IndicLID/releases/download/v1.0/indiclid-bert.zip
RUN wget https://github.com/AI4Bharat/IndicLID/releases/download/v1.0/indiclid-ftn.zip
RUN wget https://github.com/AI4Bharat/IndicLID/releases/download/v1.0/indiclid-ftr.zip
RUN unzip indiclid-bert.zip -d models
RUN unzip indiclid-ftn.zip -d models
RUN unzip indiclid-ftr.zip -d models
RUN rm -rf indiclid-bert.zip indiclid-ftn.zip indiclid-ftr.zip

# Download our model
RUN gdown https://drive.google.com/file/d/1lc0G_kLXCR-Q_rOb9EjCU8y4ryI2ZNgE/view\?usp\=drive_link --fuzzy
RUN unzip dp_prediction.zip -d dp_prediction/model
RUN rm -rf dp_prediction.zip

EXPOSE 3000
CMD ["python", "app.py"]
