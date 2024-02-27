import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import pandas as pd
from sklearn.model_selection import train_test_split
from torchtext.data.utils import get_tokenizer
from torchtext.vocab import GloVe
from collections import Counter
from torchtext.vocab import vocab
import math
import torch.nn.functional as F

DP_CLASSES = [
    ""
    "Scarcity",
    "ConfirmShaming",
    "Social Proof",
    "Obstruction",
    "Forced Action",
    "Trick Question",
    "Urgency",
    "Social Pyramid",
    "Gamification"
]

class TransformerClassifier(nn.Module):
    def __init__(self, input_dim, hidden_dim, output_dim, n_layers, n_heads, dropout, embeddings):
        super(TransformerClassifier, self).__init__()

        self.embedding_dim = input_dim
        self.embedding = nn.Embedding.from_pretrained(embeddings, freeze=True)
        encoder_layers = nn.TransformerEncoderLayer(d_model=input_dim, nhead=n_heads, dim_feedforward=hidden_dim, dropout=dropout)
        self.transformer_encoder = nn.TransformerEncoder(encoder_layers, num_layers=n_layers)
        self.fc = nn.Linear(input_dim, output_dim)
        self.dropout = nn.Dropout(dropout)

    def forward(self, text):
        # text shape: (seq_len, batch_size)
        embedded = self.embedding(text)  # (seq_len, batch_size, input_dim)
        embedded = embedded * math.sqrt(self.embedding_dim)  # Scale embedding by sqrt of input_dim
        embedded = self.dropout(embedded)
        output = self.transformer_encoder(embedded)
        output = torch.mean(output, dim=1)  # Average pooling over the sequence dimension
        output = self.fc(output)
        return output


vocab = vocab(1000, specials=['<unk>', '<pad>', '<bos>', '<eos>'])
vocab.set_default_index(vocab['<unk>'])

# Load pre-trained GloVe embeddings
glove = GloVe(name='6B', dim=100)

# Instantiate the model
INPUT_DIM = 100
HIDDEN_DIM = 64
OUTPUT_DIM = 10  # Update with the number of classes in your dataset
N_LAYERS = 5  # Number of encoder layers
N_HEADS = 5
DROPOUT = 0.1

class DPPredictionPipeline:
    def __init__(self, model_path="dp_prediction/model"):
        self.model = TransformerClassifier(INPUT_DIM, HIDDEN_DIM, OUTPUT_DIM, N_LAYERS, N_HEADS, DROPOUT, glove.vectors)
        self.tokenizer = get_tokenizer('basic_english')
        # self.model.to('cuda')
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


    def predict(self, text):
        tokens = self.tokenizer(text.lower())
        indexed_tokens = [vocab[token] for token in tokens]
        tensor_tokens = torch.tensor(indexed_tokens).unsqueeze(1).to(self.device)

        with torch.no_grad():
            self.model.eval()
            outputs = self.model(tensor_tokens)

        probabilities = F.softmax(outputs, dim=1)
        predicted_label_tensor = torch.argmax(probabilities, dim=1)
        predicted_label = predicted_label_tensor[0].item()
        if probabilities.size(1) == 1:
            confidence_score = probabilities.squeeze().item()
        else:
            confidence_score = probabilities[0, predicted_label].item()



        return DP_CLASSES[predicted_label], confidence_score
