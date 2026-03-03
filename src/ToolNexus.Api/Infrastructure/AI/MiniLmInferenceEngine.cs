using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;

namespace ToolNexus.Api.Infrastructure.AI;

public sealed class MiniLmInferenceEngine : IDisposable
{
    private const int MaxSequenceLength = 128;
    private readonly InferenceSession _session;
    private readonly object _sessionLock = new();
    private readonly ILogger<MiniLmInferenceEngine> _logger;
    private bool _disposed;

    public MiniLmInferenceEngine(ILogger<MiniLmInferenceEngine> logger, IWebHostEnvironment environment)
    {
        _logger = logger;

        var modelPath = Path.Combine(environment.ContentRootPath, "wwwroot", "models", "minilm-quantized.onnx");
        if (!File.Exists(modelPath))
        {
            throw new FileNotFoundException("MiniLM model file was not found.", modelPath);
        }

        var memoryBeforeBytes = GC.GetTotalMemory(forceFullCollection: false);
        var modelFileInfo = new FileInfo(modelPath);

        var sessionOptions = new SessionOptions
        {
            GraphOptimizationLevel = GraphOptimizationLevel.ORT_ENABLE_EXTENDED
        };

        _session = new InferenceSession(modelPath, sessionOptions);

        var memoryAfterBytes = GC.GetTotalMemory(forceFullCollection: false);
        var deltaBytes = memoryAfterBytes - memoryBeforeBytes;

        _logger.LogInformation(
            "MiniLM ONNX model loaded from {ModelPath}. ModelSizeBytes={ModelSizeBytes}, HeapBeforeBytes={HeapBeforeBytes}, HeapAfterBytes={HeapAfterBytes}, HeapDeltaBytes={HeapDeltaBytes}",
            modelPath,
            modelFileInfo.Length,
            memoryBeforeBytes,
            memoryAfterBytes,
            deltaBytes);
    }

    public float[] Embed(string text)
    {
        ThrowIfDisposed();

        var (inputIds, attentionMask) = Tokenize(text);

        var tokenIdsTensor = new DenseTensor<long>(new[] { 1, MaxSequenceLength });
        var attentionMaskTensor = new DenseTensor<long>(new[] { 1, MaxSequenceLength });

        for (var i = 0; i < MaxSequenceLength; i++)
        {
            tokenIdsTensor[0, i] = inputIds[i];
            attentionMaskTensor[0, i] = attentionMask[i];
        }

        var inputs = BuildModelInputs(tokenIdsTensor, attentionMaskTensor);

        lock (_sessionLock)
        {
            using var results = _session.Run(inputs);
            return ExtractEmbedding(results, attentionMask);
        }
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _session.Dispose();
        _disposed = true;
    }

    private static (long[] InputIds, long[] AttentionMask) Tokenize(string text)
    {
        var inputIds = new long[MaxSequenceLength];
        var attentionMask = new long[MaxSequenceLength];

        var effectiveText = text ?? string.Empty;
        var bytes = System.Text.Encoding.UTF8.GetBytes(effectiveText);
        var copyLength = Math.Min(bytes.Length, MaxSequenceLength - 2);

        inputIds[0] = 101;
        attentionMask[0] = 1;

        for (var i = 0; i < copyLength; i++)
        {
            inputIds[i + 1] = bytes[i] + 1000;
            attentionMask[i + 1] = 1;
        }

        inputIds[copyLength + 1] = 102;
        attentionMask[copyLength + 1] = 1;

        return (inputIds, attentionMask);
    }

    private List<NamedOnnxValue> BuildModelInputs(DenseTensor<long> tokenIdsTensor, DenseTensor<long> attentionMaskTensor)
    {
        var inputs = new List<NamedOnnxValue>();

        foreach (var inputName in _session.InputMetadata.Keys)
        {
            if (inputName.Contains("input", StringComparison.OrdinalIgnoreCase) &&
                inputName.Contains("id", StringComparison.OrdinalIgnoreCase))
            {
                inputs.Add(NamedOnnxValue.CreateFromTensor(inputName, tokenIdsTensor));
                continue;
            }

            if (inputName.Contains("attention", StringComparison.OrdinalIgnoreCase) &&
                inputName.Contains("mask", StringComparison.OrdinalIgnoreCase))
            {
                inputs.Add(NamedOnnxValue.CreateFromTensor(inputName, attentionMaskTensor));
            }
        }

        if (inputs.Count == 0)
        {
            var keys = _session.InputMetadata.Keys.ToArray();
            if (keys.Length > 0)
            {
                inputs.Add(NamedOnnxValue.CreateFromTensor(keys[0], tokenIdsTensor));
            }

            if (keys.Length > 1)
            {
                inputs.Add(NamedOnnxValue.CreateFromTensor(keys[1], attentionMaskTensor));
            }
        }

        return inputs;
    }

    private static float[] ExtractEmbedding(IDisposableReadOnlyCollection<DisposableNamedOnnxValue> outputs, long[] attentionMask)
    {
        var outputTensor = outputs.First().AsTensor<float>();

        if (outputTensor.Rank == 3)
        {
            var sequenceLength = outputTensor.Dimensions[1];
            var hiddenSize = outputTensor.Dimensions[2];
            var pooled = new float[hiddenSize];

            var validTokenCount = 0f;
            for (var tokenIndex = 0; tokenIndex < sequenceLength; tokenIndex++)
            {
                if (attentionMask[tokenIndex] == 0)
                {
                    continue;
                }

                validTokenCount += 1f;
                for (var hiddenIndex = 0; hiddenIndex < hiddenSize; hiddenIndex++)
                {
                    pooled[hiddenIndex] += outputTensor[0, tokenIndex, hiddenIndex];
                }
            }

            if (validTokenCount <= 0f)
            {
                return pooled;
            }

            for (var hiddenIndex = 0; hiddenIndex < hiddenSize; hiddenIndex++)
            {
                pooled[hiddenIndex] /= validTokenCount;
            }

            return pooled;
        }

        if (outputTensor.Rank == 2)
        {
            var hiddenSize = outputTensor.Dimensions[1];
            var embedding = new float[hiddenSize];
            for (var i = 0; i < hiddenSize; i++)
            {
                embedding[i] = outputTensor[0, i];
            }

            return embedding;
        }

        return outputTensor.ToArray();
    }

    private void ThrowIfDisposed()
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
    }
}
