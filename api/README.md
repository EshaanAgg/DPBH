# DPBH Backend

## Installation

1. Create a Python virtual environment. Create one using `venv` or `virtualenv` module. If not sure then follow these [steps](https://flask.palletsprojects.com/en/3.0.x/installation/#create-an-environment).
2. Activate the virtual environment.
3. Run `pip install -r requirements.txt`.
4. Download pretrained Dark pattern detection model and place it in `dp_detection` directory. Make sure that it is named as `model`.
5. Download pretrained Dark pattern classification model and place it in `dp_classification` directory. Make sure that it is named as `model`.
6. Download the `AI4Bharat` models from the official site, and place them in a folder called `models`.
7. Alternatively, you can skip the steps 3-6, and directly use the provided `setup.sh` script to install the dependencies and place the appropiate models at the correct locations.
8. Run `flask run`.

## Debugging code

To debug code and get console logs, run `flask run --debug`.
