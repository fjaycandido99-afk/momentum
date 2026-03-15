import Capacitor
import AVFoundation
import Accelerate

@objc(AudioAnalyzerPlugin)
public class AudioAnalyzerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AudioAnalyzerPlugin"
    public let jsName = "AudioAnalyzer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "loadBase64", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "seek", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCurrentTime", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getDuration", returnType: CAPPluginReturnPromise),
    ]

    private var engine = AVAudioEngine()
    private var playerNode = AVAudioPlayerNode()
    private var audioFile: AVAudioFile?
    private var audioFileURL: URL?
    private var isSetup = false
    private var tapInstalled = false

    // FFT
    private let fftSize = 1024
    private let bandCount = 64
    private var fftSetup: vDSP_FFTSetup?

    // Playback tracking
    private var startFramePosition: AVAudioFramePosition = 0
    private var pauseTime: TimeInterval = 0
    private var isPlayerPlaying = false
    private var progressTimer: Timer?

    // MARK: - Setup

    private func setupEngine() {
        guard !isSetup else { return }
        engine.attach(playerNode)
        engine.connect(playerNode, to: engine.mainMixerNode, format: nil)
        fftSetup = vDSP_create_fftsetup(vDSP_Length(log2(Float(fftSize))), FFTRadix(kFFTRadix2))
        isSetup = true
    }

    private func installTap() {
        guard !tapInstalled else { return }
        let mixer = engine.mainMixerNode
        let format = mixer.outputFormat(forBus: 0)

        mixer.installTap(onBus: 0, bufferSize: UInt32(fftSize), format: format) { [weak self] buffer, _ in
            self?.processBuffer(buffer)
        }
        tapInstalled = true
    }

    private func removeTap() {
        guard tapInstalled else { return }
        engine.mainMixerNode.removeTap(onBus: 0)
        tapInstalled = false
    }

    // MARK: - FFT Processing

    private func processBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData?[0],
              let fftSetup = fftSetup else { return }

        let frameCount = Int(buffer.frameLength)
        guard frameCount > 0 else { return }

        let log2n = vDSP_Length(log2(Float(fftSize)))
        let halfN = fftSize / 2

        // Apply Hanning window
        var window = [Float](repeating: 0, count: fftSize)
        vDSP_hann_window(&window, vDSP_Length(fftSize), Int32(vDSP_HANN_NORM))

        var windowedSignal = [Float](repeating: 0, count: fftSize)
        let copyCount = min(frameCount, fftSize)
        for i in 0..<copyCount {
            windowedSignal[i] = channelData[i]
        }
        vDSP_vmul(windowedSignal, 1, window, 1, &windowedSignal, 1, vDSP_Length(fftSize))

        // Set up split complex for FFT
        var realPart = [Float](repeating: 0, count: halfN)
        var imagPart = [Float](repeating: 0, count: halfN)

        windowedSignal.withUnsafeBufferPointer { ptr in
            ptr.baseAddress!.withMemoryRebound(to: DSPComplex.self, capacity: halfN) { complexPtr in
                var splitComplex = DSPSplitComplex(realp: &realPart, imagp: &imagPart)
                vDSP_ctoz(complexPtr, 2, &splitComplex, 1, vDSP_Length(halfN))
            }
        }

        // Perform FFT
        var splitComplex = DSPSplitComplex(realp: &realPart, imagp: &imagPart)
        vDSP_fft_zrip(fftSetup, &splitComplex, 1, log2n, FFTDirection(FFT_FORWARD))

        // Calculate magnitudes
        var magnitudes = [Float](repeating: 0, count: halfN)
        vDSP_zvmags(&splitComplex, 1, &magnitudes, 1, vDSP_Length(halfN))

        // Convert to dB scale
        var dbMagnitudes = [Float](repeating: 0, count: halfN)
        var one: Float = 1.0
        vDSP_vdbcon(magnitudes, 1, &one, &dbMagnitudes, 1, vDSP_Length(halfN), 1)

        // Group into bands and normalize to 0-255
        let bands = groupIntoBands(dbMagnitudes)

        DispatchQueue.main.async { [weak self] in
            self?.notifyListeners("frequencyData", data: ["bands": bands])
        }
    }

    private func groupIntoBands(_ fftData: [Float]) -> [Int] {
        let binCount = fftData.count
        var bands = [Int](repeating: 0, count: bandCount)

        for i in 0..<bandCount {
            // Logarithmic distribution of bins across bands
            let startBin = max(1, Int(pow(Float(binCount), Float(i) / Float(bandCount))))
            let endBin = max(startBin + 1, min(Int(pow(Float(binCount), Float(i + 1) / Float(bandCount))), binCount))

            var sum: Float = 0
            for j in startBin..<endBin {
                sum += fftData[j]
            }
            let avg = sum / Float(endBin - startBin)

            // Normalize: typical dB range for speech is -60 to 0
            let minDb: Float = -60.0
            let maxDb: Float = -5.0
            let normalized = ((avg - minDb) / (maxDb - minDb)) * 255.0
            bands[i] = max(0, min(255, Int(normalized)))
        }
        return bands
    }

    // MARK: - Playback Time Tracking

    private func getCurrentTimeValue() -> TimeInterval {
        guard let file = audioFile else { return 0 }

        if isPlayerPlaying, let nodeTime = playerNode.lastRenderTime,
           let playerTime = playerNode.playerTime(forNodeTime: nodeTime) {
            return Double(playerTime.sampleTime) / playerTime.sampleRate
        }
        return pauseTime
    }

    private func getDurationValue() -> TimeInterval {
        guard let file = audioFile else { return 0 }
        return Double(file.length) / file.processingFormat.sampleRate
    }

    private func startProgressTimer() {
        stopProgressTimer()
        progressTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            let currentTime = self.getCurrentTimeValue()
            let duration = self.getDurationValue()
            self.notifyListeners("playbackProgress", data: [
                "currentTime": currentTime,
                "duration": duration,
                "isPlaying": self.isPlayerPlaying
            ])

            // Check for completion
            if currentTime >= duration - 0.1 && self.isPlayerPlaying {
                self.isPlayerPlaying = false
                self.stopProgressTimer()
                self.removeTap()
                self.notifyListeners("playbackComplete", data: [:])
            }
        }
    }

    private func stopProgressTimer() {
        progressTimer?.invalidate()
        progressTimer = nil
    }

    // MARK: - Plugin Methods

    @objc func loadBase64(_ call: CAPPluginCall) {
        guard let base64String = call.getString("data") else {
            call.reject("base64 data is required")
            return
        }

        guard let audioData = Data(base64Encoded: base64String) else {
            call.reject("Invalid base64 data")
            return
        }

        // Write to temp file
        let tempDir = FileManager.default.temporaryDirectory
        let tempFile = tempDir.appendingPathComponent("voxu_session_\(UUID().uuidString).mp3")

        do {
            try audioData.write(to: tempFile)

            // Clean up previous temp file
            if let prevURL = audioFileURL {
                try? FileManager.default.removeItem(at: prevURL)
            }

            setupEngine()

            audioFile = try AVAudioFile(forReading: tempFile)
            audioFileURL = tempFile
            pauseTime = 0
            startFramePosition = 0

            call.resolve([
                "duration": getDurationValue()
            ])
        } catch {
            call.reject("Failed to load audio: \(error.localizedDescription)")
        }
    }

    @objc func play(_ call: CAPPluginCall) {
        guard let file = audioFile else {
            call.reject("No audio loaded")
            return
        }

        do {
            // Stop if already playing
            playerNode.stop()

            installTap()

            if !engine.isRunning {
                try engine.start()
            }

            // Schedule file from the beginning (or from pauseTime)
            let frameOffset = AVAudioFramePosition(pauseTime * file.processingFormat.sampleRate)
            let frameCount = AVAudioFrameCount(file.length - frameOffset)

            if frameCount > 0 {
                playerNode.scheduleSegment(file, startingFrame: frameOffset, frameCount: frameCount, at: nil)
            }

            playerNode.play()
            isPlayerPlaying = true
            startProgressTimer()

            call.resolve()
        } catch {
            call.reject("Failed to play: \(error.localizedDescription)")
        }
    }

    @objc func pause(_ call: CAPPluginCall) {
        pauseTime = getCurrentTimeValue()
        playerNode.pause()
        isPlayerPlaying = false
        stopProgressTimer()
        call.resolve(["currentTime": pauseTime])
    }

    @objc func resume(_ call: CAPPluginCall) {
        guard audioFile != nil else {
            call.reject("No audio loaded")
            return
        }

        do {
            if !engine.isRunning {
                try engine.start()
            }
            installTap()
            playerNode.play()
            isPlayerPlaying = true
            startProgressTimer()
            call.resolve()
        } catch {
            call.reject("Failed to resume: \(error.localizedDescription)")
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        playerNode.stop()
        isPlayerPlaying = false
        pauseTime = 0
        stopProgressTimer()
        removeTap()
        call.resolve()
    }

    @objc func seek(_ call: CAPPluginCall) {
        guard let file = audioFile else {
            call.reject("No audio loaded")
            return
        }
        let time = call.getDouble("time") ?? 0

        let wasPlaying = isPlayerPlaying
        playerNode.stop()
        isPlayerPlaying = false
        pauseTime = time

        if wasPlaying {
            do {
                let frameOffset = AVAudioFramePosition(time * file.processingFormat.sampleRate)
                let frameCount = AVAudioFrameCount(file.length - frameOffset)
                if frameCount > 0 {
                    playerNode.scheduleSegment(file, startingFrame: frameOffset, frameCount: frameCount, at: nil)
                }
                if !engine.isRunning {
                    try engine.start()
                }
                playerNode.play()
                isPlayerPlaying = true
            } catch {
                call.reject("Seek failed: \(error.localizedDescription)")
                return
            }
        }

        call.resolve(["currentTime": time])
    }

    @objc func getCurrentTime(_ call: CAPPluginCall) {
        call.resolve(["currentTime": getCurrentTimeValue()])
    }

    @objc func getDuration(_ call: CAPPluginCall) {
        call.resolve(["duration": getDurationValue()])
    }

    // MARK: - Cleanup

    deinit {
        stopProgressTimer()
        removeTap()
        playerNode.stop()
        engine.stop()
        if let fftSetup = fftSetup {
            vDSP_destroy_fftsetup(fftSetup)
        }
        if let url = audioFileURL {
            try? FileManager.default.removeItem(at: url)
        }
    }
}
