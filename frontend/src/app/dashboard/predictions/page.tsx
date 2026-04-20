'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { StockChart } from '@/components/StockChart';
import { LoadingSpinner, ErrorDisplay } from '@/components/StatusComponents';
import { api, StockInfo, PredictionResult, TrainingJob } from '@/lib/api';
import { CheckCircle, Cpu, Play, Target, TrendingUp } from 'lucide-react';

const MODEL_OPTIONS = [
    { value: 'cnn_lstm', label: 'CNN-LSTM', description: 'On-demand supported' },
    { value: 'lstm', label: 'LSTM', description: 'On-demand supported' },
    { value: 'random_forest', label: 'Random Forest', description: 'Paper-style baseline' },
    { value: 'svr', label: 'SVR', description: 'Paper-style baseline' },
    { value: 'cnn_lstm_emd', label: 'CNN-LSTM + EMD', description: 'Legacy only' },
    { value: 'lstm_emd', label: 'LSTM + EMD', description: 'Legacy only' },
    { value: 'cnn_lstm_ceemd', label: 'CNN-LSTM + CEEMD', description: 'Legacy only' },
    { value: 'lstm_ceemd', label: 'LSTM + CEEMD', description: 'Legacy only' },
];

const PERIOD_OPTIONS = [
    { value: '1y', label: '1 Year' },
    { value: '2y', label: '2 Years' },
    { value: '5y', label: '5 Years' },
    { value: '10y', label: '10 Years' },
    { value: 'max', label: 'Max' },
];

export default function PredictionsPage() {
    const [stocks, setStocks] = useState<StockInfo[]>([]);
    const [selectedSymbol, setSelectedSymbol] = useState('^GSPC');
    const [tickerInput, setTickerInput] = useState('^GSPC');
    const [selectedModel, setSelectedModel] = useState('cnn_lstm');
    const [period, setPeriod] = useState('5y');
    const [predictionMode, setPredictionMode] = useState<'backtest' | 'forecast'>('forecast');
    const [forecastHorizon, setForecastHorizon] = useState(5);
    const [result, setResult] = useState<PredictionResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [predicting, setPredicting] = useState(false);
    const [training, setTraining] = useState(false);
    const [error, setError] = useState('');
    const [trainSummary, setTrainSummary] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [trainingJob, setTrainingJob] = useState<TrainingJob | null>(null);

    useEffect(() => {
        api.getStocks(1, 100)
            .then((res) => {
                const items = res.items;
                setStocks(items);
                const initial = items.find((item) => item.symbol === '^GSPC')?.symbol || items[0]?.symbol || '^GSPC';
                setSelectedSymbol(initial);
                setTickerInput(initial);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!trainingJob || trainingJob.status === 'completed' || trainingJob.status === 'failed') {
            return;
        }

        const timer = window.setInterval(async () => {
            try {
                const job = await api.getTrainingJob(trainingJob.job_id);
                setTrainingJob(job);

                if (job.status === 'completed' && job.result) {
                    const completedResult = job.result;
                    setTraining(false);
                    setTrainSummary(
                        `Saved ${completedResult.model_type.toUpperCase()} for ${completedResult.symbol}. Validation MAPE ${completedResult.metrics.mape.toFixed(2)}%`
                    );
                    setStocks((prev) => {
                        const existing = prev.find((stock) => stock.symbol === completedResult.symbol);
                        if (existing) {
                            return prev.map((stock) =>
                                stock.symbol === completedResult.symbol
                                    ? { ...stock, models_available: Array.from(new Set([...stock.models_available, completedResult.model_type])) }
                                    : stock
                            );
                        }
                        return [
                            { symbol: completedResult.symbol, name: completedResult.symbol, color: '#3b82f6', models_available: [completedResult.model_type] },
                            ...prev,
                        ];
                    });
                }

                if (job.status === 'failed') {
                    setTraining(false);
                    setError(job.error || 'Training failed');
                }
            } catch (err: any) {
                setTraining(false);
                setError(err.message || 'Failed to fetch training status');
            }
        }, 2000);

        return () => window.clearInterval(timer);
    }, [trainingJob]);

    const normalizedTicker = useMemo(() => tickerInput.trim().toUpperCase(), [tickerInput]);
    const trainingSupported = ['cnn_lstm', 'lstm', 'random_forest', 'svr'].includes(selectedModel);
    const selectedStockInfo = stocks.find((stock) => stock.symbol === selectedSymbol);
    const hasSavedModel = !!selectedStockInfo?.models_available.includes(selectedModel);
    const tomorrowPoint = result?.evaluation_type === 'future_forecast' ? result.predictions[0] : null;
    const tickerSuggestions = useMemo(() => {
        const query = tickerInput.trim().toLowerCase();
        if (!query) {
            return stocks.slice(0, 8);
        }

        const matches = stocks
            .filter((stock) =>
                stock.symbol.toLowerCase().includes(query) || stock.name.toLowerCase().includes(query)
            )
            .sort((a, b) => {
                const aSymbol = a.symbol.toLowerCase();
                const bSymbol = b.symbol.toLowerCase();
                const aStarts = aSymbol.startsWith(query) ? 0 : 1;
                const bStarts = bSymbol.startsWith(query) ? 0 : 1;
                if (aStarts !== bStarts) return aStarts - bStarts;
                const aExact = aSymbol === query ? 0 : 1;
                const bExact = bSymbol === query ? 0 : 1;
                if (aExact !== bExact) return aExact - bExact;
                return a.symbol.localeCompare(b.symbol);
            })
            .slice(0, 8);

        if (matches.length > 0) {
            return matches;
        }

        const normalized = tickerInput.trim().toUpperCase();
        return [
            { symbol: normalized, name: 'Use typed ticker', color: '#3b82f6', models_available: [] },
            { symbol: `${normalized}.NS`, name: 'NSE (India) suggestion', color: '#3b82f6', models_available: [] },
            { symbol: `${normalized}.BO`, name: 'BSE (India) suggestion', color: '#3b82f6', models_available: [] },
        ];
    }, [stocks, tickerInput]);

    const applyTickerSelection = (symbol: string) => {
        setSelectedSymbol(symbol);
        setTickerInput(symbol);
        setShowSuggestions(false);
    };

    const runPrediction = async () => {
        setPredicting(true);
        setError('');
        setTrainSummary('');
        setResult(null);
        try {
            applyTickerSelection(normalizedTicker);
            const res = await api.predict(normalizedTicker, selectedModel, period, predictionMode, forecastHorizon);
            setResult(res);
        } catch (err: any) {
            setError(err.message || 'Prediction failed');
        } finally {
            setPredicting(false);
        }
    };

    const trainModel = async () => {
        setTraining(true);
        setError('');
        setTrainSummary('');
        setResult(null);
        try {
            applyTickerSelection(normalizedTicker);
            const job = await api.trainModel(normalizedTicker, selectedModel, period, 12);
            setTrainingJob(job);
            setTrainSummary(`Training queued for ${job.symbol}. Status: ${job.status.toUpperCase()}`);
        } catch (err: any) {
            setError(err.message || 'Training failed');
            setTraining(false);
        } finally {
        }
    };

    if (loading) return <LoadingSpinner message="Loading models..." />;

    const getMetricColor = (metric: string, value: number): string => {
        if (metric === 'mape' || metric === 'rmse') {
            if (value < 2) return 'text-green-400';
            if (value < 5) return 'text-yellow-400';
            return 'text-red-400';
        }
        if (metric === 'directional_accuracy') {
            if (value >= 60) return 'text-green-400';
            if (value >= 52) return 'text-yellow-400';
            return 'text-red-400';
        }
        return 'text-slate-100';
    };

    return (
        <div className="space-y-8 animate-slide-up">
            <div>
                <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                    <TrendingUp size={28} className="text-blue-400" />
                    Predictions
                </h1>
                <p className="text-slate-500 mt-1">Universal ticker search, feature-based training, and holdout backtests with honest metrics</p>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-6">
                <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Target size={16} />
                    Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                            Saved Symbols
                        </label>
                        <select
                            value={selectedSymbol}
                            onChange={(e) => {
                                setSelectedSymbol(e.target.value);
                                setTickerInput(e.target.value);
                            }}
                            className="input-modern"
                        >
                            {stocks.map((s) => (
                                <option key={s.symbol} value={s.symbol}>
                                    {s.name} ({s.symbol})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                            Any Ticker
                        </label>
                        <div className="relative">
                            <input
                                value={tickerInput}
                                onChange={(e) => {
                                    setTickerInput(e.target.value);
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => {
                                    window.setTimeout(() => setShowSuggestions(false), 120);
                                }}
                                placeholder="AAPL or RELIANCE.NS"
                                className="input-modern"
                            />
                            {showSuggestions && tickerSuggestions.length > 0 && (
                                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-sm border border-slate-700 bg-slate-950 shadow-2xl">
                                    {tickerSuggestions.map((stock) => (
                                        <button
                                            key={stock.symbol}
                                            type="button"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                applyTickerSelection(stock.symbol);
                                            }}
                                            onClick={() => applyTickerSelection(stock.symbol)}
                                            className="flex w-full items-center justify-between border-b border-slate-800 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-slate-900"
                                        >
                                            <span className="font-mono text-xs text-slate-100">{stock.symbol}</span>
                                            <span className="ml-3 truncate text-xs text-slate-400">{stock.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                            Model Architecture
                        </label>
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="input-modern"
                        >
                            {MODEL_OPTIONS.map((m) => (
                                <option key={m.value} value={m.value}>
                                    {m.label} — {m.description}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                            History Period
                        </label>
                        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input-modern">
                            {PERIOD_OPTIONS.map((p) => (
                                <option key={p.value} value={p.value}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                            Prediction Mode
                        </label>
                        <select value={predictionMode} onChange={(e) => setPredictionMode(e.target.value as 'backtest' | 'forecast')} className="input-modern">
                            <option value="forecast">Future Forecast</option>
                            <option value="backtest">Backtest</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                            Future Days
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={30}
                            value={forecastHorizon}
                            onChange={(e) => setForecastHorizon(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                            className="input-modern"
                            disabled={predictionMode !== 'forecast'}
                        />
                    </div>

                    <div className="flex items-end">
                        <div className="grid grid-cols-2 gap-3 w-full">
                            <button
                                onClick={trainModel}
                                disabled={training || !trainingSupported || !normalizedTicker}
                                className="btn-secondary w-full flex items-center justify-center gap-2 disabled:opacity-40"
                            >
                                {training ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Training...
                                    </>
                                ) : (
                                    <>
                                        <Cpu size={16} />
                                        Train
                                    </>
                                )}
                            </button>
                            <button
                                onClick={runPrediction}
                                disabled={predicting || !normalizedTicker}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {predicting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Play size={16} />
                                        Predict
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-4 space-y-2 text-xs font-mono">
                    <p className="text-slate-500">
                        Enter any Yahoo Finance ticker. Training now uses OHLCV plus technical indicators such as SMA, EMA, MACD, RSI, returns, and volume change.
                    </p>
                    <p className="text-slate-500">
                        Future forecast mode starts from the next business day and uses recursive predictions with carried-forward volume and derived indicators.
                    </p>
                    {trainingJob && training && (
                        <p className="text-blue-400">
                            Training job {trainingJob.job_id.slice(0, 8)} is {trainingJob.status}. You can keep using the app while it runs.
                        </p>
                    )}
                    <p className={hasSavedModel ? 'text-green-400' : 'text-amber-400'}>
                        {hasSavedModel
                            ? `Saved ${selectedModel} model found for ${selectedSymbol}.`
                            : `No saved ${selectedModel} model found for ${normalizedTicker || selectedSymbol}. Train before predicting.`}
                    </p>
                    {trainSummary && <p className="text-green-400">{trainSummary}</p>}
                </div>
            </div>

            {error && <ErrorDisplay message={error} onRetry={trainingSupported ? trainModel : runPrediction} />}

            {result && (
                <div className="space-y-6 animate-scale-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-6 hover:border-slate-500 transition-all">
                            <p className="text-slate-500 text-xs uppercase tracking-wider font-mono mb-2">RMSE</p>
                            <p className={`text-3xl font-bold font-mono ${getMetricColor('rmse', result.metrics.rmse)}`}>
                                {result.metrics.rmse.toFixed(4)}
                            </p>
                            <p className="text-xs text-slate-600 font-mono mt-1">Model error on recent holdout window</p>
                        </div>
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-6 hover:border-slate-500 transition-all">
                            <p className="text-slate-500 text-xs uppercase tracking-wider font-mono mb-2">Direction Hit Rate</p>
                            <p className={`text-3xl font-bold font-mono ${getMetricColor('directional_accuracy', result.metrics.directional_accuracy)}`}>
                                {result.metrics.directional_accuracy.toFixed(2)}%
                            </p>
                            <p className="text-xs text-slate-600 font-mono mt-1">How often predicted direction matched actual moves</p>
                        </div>
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-6 hover:border-slate-500 transition-all">
                            <p className="text-slate-500 text-xs uppercase tracking-wider font-mono mb-2">MAPE</p>
                            <p className={`text-3xl font-bold font-mono ${getMetricColor('mape', result.metrics.mape)}`}>
                                {result.metrics.mape.toFixed(4)}%
                            </p>
                            <p className="text-xs text-slate-600 font-mono mt-1">Percentage error on the same holdout backtest</p>
                        </div>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-700/60 rounded-sm px-4 py-3 text-xs font-mono text-slate-400">
                        {result.evaluation_type === 'future_forecast'
                            ? `This chart shows the next ${result.metrics.forecast_horizon ?? result.test_size} business-day forecast starting from tomorrow. The gray line carries forward the previous close as a naive baseline.`
                            : 'This chart is a recent holdout backtest, not a future price forecast. The gray line is a naive baseline using the previous close.'}
                    </div>

                    <StockChart
                        data={result.predictions.map((point) => ({
                            date: point.date,
                            close: point.actual ?? point.predicted,
                            actual: point.actual ?? undefined,
                            predicted: point.predicted,
                            lower: point.lower,
                            upper: point.upper,
                            baseline: point.baseline,
                        }))}
                        showPrediction={true}
                        title={`${result.name} — ${result.model_type.replace(/_/g, ' ').toUpperCase()} ${result.evaluation_type === 'future_forecast' ? 'Future Forecast' : 'Holdout Backtest'}`}
                        height={400}
                    />

                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-6">
                        <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <CheckCircle size={16} className="text-green-400" />
                            Prediction Summary
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-slate-500 font-mono uppercase">Model</p>
                                <p className="text-sm font-mono text-slate-100 font-bold">{result.model_type.replace(/_/g, ' ').toUpperCase()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-mono uppercase">{result.evaluation_type === 'future_forecast' ? 'Forecast Days' : 'Backtest Points'}</p>
                                <p className="text-sm font-mono text-slate-100 font-bold">{result.test_size}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-mono uppercase">Symbol</p>
                                <p className="text-sm font-mono text-slate-100 font-bold">{result.symbol}</p>
                            </div>
                            <div>
                                <p className={`text-sm font-mono font-bold ${result.metrics.beats_baseline ? 'text-green-400' : 'text-amber-400'}`}>
                                    {result.evaluation_type === 'future_forecast'
                                        ? 'Quality reference from recent backtest'
                                        : result.metrics.beats_baseline ? 'Beats naive baseline' : 'Does not beat naive baseline'}
                                </p>
                            </div>
                        </div>
                        {tomorrowPoint && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                <div>
                                    <p className="text-xs text-slate-500 font-mono uppercase">Tomorrow</p>
                                    <p className="text-sm font-mono text-slate-100 font-bold">{tomorrowPoint.date}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-mono uppercase">Central Forecast</p>
                                    <p className="text-sm font-mono text-slate-100 font-bold">${tomorrowPoint.predicted.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-mono uppercase">Forecast Range</p>
                                    <p className="text-sm font-mono text-slate-100 font-bold">
                                        ${tomorrowPoint.lower?.toFixed(2) ?? '—'} to ${tomorrowPoint.upper?.toFixed(2) ?? '—'}
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div>
                                <p className="text-xs text-slate-500 font-mono uppercase">MAE</p>
                                <p className="text-sm font-mono text-slate-100 font-bold">{result.metrics.mae.toFixed(4)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-mono uppercase">R²</p>
                                <p className="text-sm font-mono text-slate-100 font-bold">{result.metrics.r2.toFixed(4)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-mono uppercase">Bias</p>
                                <p className="text-sm font-mono text-slate-100 font-bold">{result.metrics.bias.toFixed(4)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-mono uppercase">Baseline RMSE</p>
                                <p className="text-sm font-mono text-slate-100 font-bold">{result.metrics.baseline_rmse.toFixed(4)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
