const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface StockInfo {
    symbol: string;
    name: string;
    color: string;
    models_available: string[];
}

export interface StockListResponse {
    items: StockInfo[];
    total: number;
    page: number;
    per_page: number;
    pages: number;
}

export interface StockDataPoint {
    date: string;
    open?: number;
    high?: number;
    low?: number;
    close: number;
    volume?: number;
}

export interface StockData {
    symbol: string;
    name: string;
    color: string;
    source: string;
    count: number;
    current_price: number;
    change: number;
    change_pct: number;
    high_52w: number;
    low_52w: number;
    stats: {
        mean: number;
        std: number;
        min: number;
        max: number;
    };
    data: StockDataPoint[];
}

export interface StockSummary {
    symbol: string;
    name: string;
    color: string;
    current_price: number;
    change: number;
    change_pct: number;
    market_cap?: number;
    error?: string;
}

export interface IMFData {
    name: string;
    index: number;
    data: { date: string; value: number }[];
}

export interface DecompositionResult {
    symbol: string;
    name: string;
    method: string;
    num_imfs: number;
    data_points: number;
    imfs: IMFData[];
}

export interface PredictionPoint {
    date: string;
    actual: number | null;
    predicted: number;
    lower?: number;
    upper?: number;
    baseline?: number;
}

export interface PredictionResult {
    symbol: string;
    name: string;
    model_type: string;
    evaluation_type: string;
    metrics: {
        rmse: number;
        mae: number;
        mape: number;
        r2: number;
        directional_accuracy: number;
        bias: number;
        baseline_rmse: number;
        beats_baseline: boolean;
        forecast_horizon?: number;
    };
    test_size: number;
    predictions: PredictionPoint[];
}

export interface ModelInfo {
    name: string;
    display_name: string;
    num_files: number;
    files: string[];
    total_size_mb: number;
}

export interface TrainingJobResult {
    symbol: string;
    model_type: string;
    model_file: string;
    saved_path: string;
    period: string;
    epochs: number;
    window_size: number;
    train_points: number;
    validation_points: number;
    test_points: number;
    feature_columns: string[];
    metrics: { rmse: number; mae: number; mape: number };
}

export interface TrainingJob {
    job_id: string;
    symbol: string;
    name?: string;
    model_type: string;
    period: string;
    epochs: number;
    status: 'queued' | 'running' | 'completed' | 'failed';
    created_at: string;
    started_at?: string | null;
    finished_at?: string | null;
    result?: TrainingJobResult | null;
    error?: string | null;
}

import Session from 'supertokens-auth-react/recipe/session';

async function fetchAPI<T>(path: string): Promise<T> {
    return fetchAPIWithInit<T>(path);
}

async function fetchAPIWithInit<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        credentials: 'include',
        ...init,
    });
    if (!res.ok) {
        if (res.status === 401) {
            if (typeof window !== 'undefined') {
                try {
                    await Session.signOut();
                } catch (err) {
                    // Ignore signout errors, just force redirect
                }
                window.location.href = '/auth';
            }
        }
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || `API Error: ${res.status}`);
    }
    return res.json();
}

export const api = {
    getStocks: (page = 1, perPage = 20, search?: string) => {
        let url = `/api/stocks?page=${page}&per_page=${perPage}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        return fetchAPI<StockListResponse>(url);
    },

    getFeaturedStocks: () =>
        fetchAPI<StockListResponse>("/api/stocks?featured=true"),

    getStockData: (symbol: string, period = "5y", source = "live") =>
        fetchAPI<StockData>(`/api/stocks/${encodeURIComponent(symbol)}/data?period=${period}&source=${source}`),

    getStockSummary: (symbol: string) =>
        fetchAPI<StockSummary>(`/api/stocks/${encodeURIComponent(symbol)}/summary`),

    decompose: (symbol: string, method = "emd", period = "5y") =>
        fetchAPI<DecompositionResult>(
            `/api/stocks/${encodeURIComponent(symbol)}/decompose?method=${method}&period=${period}`
        ),

    predict: (symbol: string, modelType = "cnn_lstm", period = "5y", mode = "backtest", horizon = 5) =>
        fetchAPI<PredictionResult>(
            `/api/stocks/${encodeURIComponent(symbol)}/predict?model_type=${modelType}&period=${period}&mode=${mode}&horizon=${horizon}`
        ),

    trainModel: (symbol: string, modelType = "cnn_lstm", period = "5y", epochs = 12) =>
        fetchAPIWithInit<TrainingJob>(`/api/stocks/${encodeURIComponent(symbol)}/train`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model_type: modelType, period, epochs }),
        }),

    getTrainingJob: (jobId: string) =>
        fetchAPI<TrainingJob>(`/api/training-jobs/${encodeURIComponent(jobId)}`),

    getModels: () => fetchAPI<ModelInfo[]>("/api/models"),

    health: () => fetchAPI<{ status: string; timestamp: string }>("/api/health"),
};
