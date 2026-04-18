from pathlib import Path
import pickle
import re

import torch
import torch.nn as nn
from sklearn.ensemble import RandomForestRegressor
from sklearn.svm import SVR


DEEP_MODEL_TYPES = {"cnn_lstm", "lstm"}
SKLEARN_MODEL_TYPES = {"random_forest", "svr"}
SUPPORTED_MODEL_TYPES = DEEP_MODEL_TYPES | SKLEARN_MODEL_TYPES


class CNN_LSTM(nn.Module):
    def __init__(self, input_size=1, cnn_hidden_output=128, lstm_hidden_size=128, num_layers=2):
        super().__init__()
        self.cnn = nn.Sequential(
            nn.Conv1d(input_size, cnn_hidden_output, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool1d(kernel_size=2),
        )
        self.lstm = nn.LSTM(
            cnn_hidden_output,
            lstm_hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.2 if num_layers > 1 else 0.0,
        )
        self.fc = nn.Linear(lstm_hidden_size, 1)

    def forward(self, x):
        x = self.cnn(x.permute(0, 2, 1))
        x = x.permute(0, 2, 1)
        x, _ = self.lstm(x)
        return self.fc(x[:, -1])


class LSTMModel(nn.Module):
    def __init__(self, input_size=1, lstm_hidden_size=128, num_layers=2):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size,
            lstm_hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.2 if num_layers > 1 else 0.0,
        )
        self.fc = nn.Linear(lstm_hidden_size, 1)

    def forward(self, x):
        x, _ = self.lstm(x)
        return self.fc(x[:, -1])


def is_deep_model(model_type: str) -> bool:
    return model_type in DEEP_MODEL_TYPES


def is_sklearn_model(model_type: str) -> bool:
    return model_type in SKLEARN_MODEL_TYPES


def create_model(model_type: str, device: torch.device | None = None, input_size: int = 1):
    if model_type == "cnn_lstm":
        if device is None:
            raise ValueError("device is required for deep models")
        return CNN_LSTM(input_size=input_size).to(device)
    if model_type == "lstm":
        if device is None:
            raise ValueError("device is required for deep models")
        return LSTMModel(input_size=input_size).to(device)
    if model_type == "random_forest":
        return RandomForestRegressor(n_estimators=300, max_depth=12, min_samples_leaf=3, random_state=42, n_jobs=-1)
    if model_type == "svr":
        return SVR(kernel="rbf", C=10.0, epsilon=0.01, gamma="scale")
    raise ValueError(f"Unsupported model type: {model_type}")


def model_filename(symbol: str, model_type: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", symbol.strip())
    ext = "pth" if is_deep_model(model_type) else "pkl"
    return f"{safe}.{ext}"


def symbol_model_path(models_dir: Path, model_type: str, symbol: str) -> Path:
    return models_dir / model_type / model_filename(symbol, model_type)


def save_checkpoint(model_path: Path, payload: dict, model_type: str) -> None:
    model_path.parent.mkdir(parents=True, exist_ok=True)
    if is_deep_model(model_type):
        torch.save(payload, model_path)
    else:
        with open(model_path, "wb") as fh:
            pickle.dump(payload, fh)


def load_checkpoint(model_path: Path, model_type: str):
    if is_deep_model(model_type):
        checkpoint = torch.load(model_path, map_location="cpu", weights_only=False)
    else:
        with open(model_path, "rb") as fh:
            checkpoint = pickle.load(fh)
    if not isinstance(checkpoint, dict):
        raise ValueError("Saved model is invalid. Retrain this ticker.")
    return checkpoint


def load_model(model_type: str, model_path: Path, device: torch.device):
    checkpoint = load_checkpoint(model_path, model_type)
    if is_deep_model(model_type):
        if "model_state_dict" not in checkpoint:
            raise ValueError("Saved model is from the legacy format. Retrain this ticker to use improved inference.")
        input_size = int(checkpoint.get("input_size", 1))
        model = create_model(model_type, device, input_size=input_size)
        model.load_state_dict(checkpoint["model_state_dict"])
        model.eval()
        return model, checkpoint

    if "model" not in checkpoint:
        raise ValueError("Saved sklearn model is invalid. Retrain this ticker.")
    return checkpoint["model"], checkpoint
