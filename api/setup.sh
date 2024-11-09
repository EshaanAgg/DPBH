pip install -r requirements.txt

mkdir models
wget https://github.com/AI4Bharat/IndicLID/releases/download/v1.0/indiclid-bert.zip
wget https://github.com/AI4Bharat/IndicLID/releases/download/v1.0/indiclid-ftn.zip
wget https://github.com/AI4Bharat/IndicLID/releases/download/v1.0/indiclid-ftr.zip
unzip indiclid-bert.zip -d models
unzip indiclid-ftn.zip -d models
unzip indiclid-ftr.zip -d models
rm -rf indiclid-bert.zip indiclid-ftn.zip indiclid-ftr.zip

# Download our model
gdown https://drive.google.com/file/d/1lc0G_kLXCR-Q_rOb9EjCU8y4ryI2ZNgE/view\?usp\=drive_link --fuzzy
unzip dp_prediction.zip -d dp_prediction/model
rm -rf dp_prediction.zip
