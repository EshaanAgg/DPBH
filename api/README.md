# DPBH-backend

## Installation

1. Create a Python virtual environment. Create one using `venv` or `virtualenv` module. If not sure then follow these [steps](https://flask.palletsprojects.com/en/3.0.x/installation/#create-an-environment).
2. Activate the virtual environment.
3. Run `pip install -r requirements.txt`.
4. Download pretrained Dark pattern detection model and place it in 'dp_detection' directory. Make sure that it is named as 'model'.
5. Download pretrained Dark pattern classification model and place it in 'dp_classification' directory. Make sure that it is named as 'model'.
6. Run `flask run`.

## Debugging code

To debug code and get console logs, run `flask run --debug`.

## API details

**Dark patterns detection**

- Endpoint: `/detect`
- Request body: A JSON list of texts. Example:

```
["Only 2 items left!", "Hurry! Few in stock"]
```

- Response: A JSON list of 0 and 1, i.e, model's prediction of input texts.

**Dark patterns classification**

- Endpoint: `/classify`
- Request body: A JSON list of texts. Example:

```
["10 people are looking this right now", "Hurry! Few in stock"]
```

- Response: A JSON list of dark pattern classes, i.e, model's prediction of input texts.
