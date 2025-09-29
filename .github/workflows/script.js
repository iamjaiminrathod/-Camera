document.addEventListener('DOMContentLoaded', () => {
            const video = document.getElementById('video');
            const canvas = document.getElementById('canvas');
            const shutterButton = document.getElementById('shutter-button');
            const switchCameraButton = document.getElementById('switch-camera-button');
            const photoPreview = document.getElementById('photo-preview');
            const videoPreview = document.getElementById('video-preview');
            const galleryLink = document.getElementById('gallery-link');
            const modeItems = document.querySelectorAll('.mode-item');
            const modeSelector = document.getElementById('mode-selector');
            const recordingTimer = document.getElementById('recording-timer');
            const timerDisplay = document.getElementById('timer-display');
            const cameraIndicator = document.getElementById('camera-indicator');

            let currentStream;
            let facingMode = 'environment';
            let activeMode = 'photo';
            let isRecording = false;
            let mediaRecorder;
            let recordedChunks = [];
            let recordingTimerInterval;

            async function startCamera() {
                if (currentStream) {
                    currentStream.getTracks().forEach(track => track.stop());
                }
                try {
                    const constraints = {
                        video: { facingMode: facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true
                        }
                    };
                    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
                    video.srcObject = currentStream;
                    video.muted = true;   
                    video.classList.toggle('mirrored', facingMode === 'user');
                    updateCameraIndicator();
                } catch (error) {
                    console.error("Error accessing camera: ", error);
                    console.error("Could not access the camera. Please ensure you have given permission.");
                }
            }

            function takePicture() {
                const flash = document.createElement('div');
                flash.classList.add('flash-effect');
                document.body.appendChild(flash);
                setTimeout(() => flash.remove(), 300);
                
                const track = currentStream.getVideoTracks()[0];
                const settings = track.getSettings();
                canvas.width = settings.width;
                canvas.height = settings.height;
                const context = canvas.getContext('2d');
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                const dataUrl = canvas.toDataURL('image/png');
                photoPreview.src = dataUrl;
                galleryLink.href = dataUrl;
                galleryLink.download = `photo-${new Date().getTime()}.png`;

                photoPreview.classList.remove('hidden');
                videoPreview.classList.add('hidden');
            }

            function startRecording() {
                if (!currentStream || isRecording) return;
                isRecording = true;
                recordedChunks = [];
                updateShutterUI();
                modeSelector.classList.add('hidden');
                recordingTimer.classList.remove('hidden');
                startTimer();
                
                try {
                    mediaRecorder = new MediaRecorder(currentStream, { mimeType: 'video/webm' });
                    mediaRecorder.ondataavailable = event => {
                        if (event.data.size > 0) recordedChunks.push(event.data);
                    };
                    mediaRecorder.onstop = () => {
                        const blob = new Blob(recordedChunks, { type: 'video/webm' });
                        const videoUrl = URL.createObjectURL(blob);
                        
                        videoPreview.src = videoUrl;
                        galleryLink.href = videoUrl;
                        galleryLink.download = `video-${new Date().getTime()}.webm`;

                        videoPreview.classList.remove('hidden');
                        photoPreview.classList.add('hidden');
                        videoPreview.play();
                    };
                    mediaRecorder.start();
                } catch(e) {
                    console.error("MediaRecorder error:", e);
                    stopRecording();
                }
            }

            function stopRecording() {
                if (!isRecording) return;
                isRecording = false;
                mediaRecorder.stop();
                updateShutterUI();
                modeSelector.classList.remove('hidden');
                recordingTimer.classList.add('hidden');
                stopTimer();
            }
            
            function updateCameraIndicator() {
                cameraIndicator.textContent = (facingMode === 'environment') ? 'BACK' : 'FRONT';
            }

            function updateShutterUI() {
                shutterButton.innerHTML = '';
                shutterButton.className = 'shutter-button'; 

                if (activeMode === 'video' || activeMode === 'slo-mo') {
                    shutterButton.classList.add('shutter-button-video');
                    const innerCircle = document.createElement('div');
                    innerCircle.className = 'inner-circle';
                    shutterButton.appendChild(innerCircle);
                    if (isRecording) {
                        shutterButton.classList.add('shutter-button-recording');
                    }
                } else {
                    shutterButton.classList.add('shutter-button-photo');
                }
            }
            
            function setActiveMode(selectedMode) {
                activeMode = selectedMode;
                 modeItems.forEach(item => {
                    item.classList.toggle('text-yellow-400', item.dataset.mode === selectedMode);
                    item.classList.toggle('text-gray-400', item.dataset.mode !== selectedMode);
                 });
                 updateShutterUI();
            }
            
            function startTimer() {
                let seconds = 0;
                timerDisplay.textContent = '00:00';
                recordingTimerInterval = setInterval(() => {
                    seconds++;
                    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
                    const secs = String(seconds % 60).padStart(2, '0');
                    timerDisplay.textContent = `${mins}:${secs}`;
                }, 1000);
            }

            function stopTimer() { clearInterval(recordingTimerInterval); }

            shutterButton.addEventListener('click', () => {
                if (activeMode === 'photo' || activeMode === 'portrait') {
                    takePicture();
                } else if (activeMode === 'video' || activeMode === 'slo-mo') {
                    if (isRecording) stopRecording(); else startRecording();
                }
            });

            switchCameraButton.addEventListener('click', () => {
                facingMode = (facingMode === 'environment') ? 'user' : 'environment';
                startCamera();
            });

            modeItems.forEach(item => {
                item.addEventListener('click', () => {
                    if (!isRecording) setActiveMode(item.dataset.mode);
                });
            });

            startCamera();
            updateShutterUI();
        });
