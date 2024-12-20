let referenceDescriptors = null;

// شروع ویدیو و بارگذاری مدل‌ها
async function startVideo() {
    try {
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri('./models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('./models')
        ]);

        const video = document.getElementById('video');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

        video.addEventListener('play', () => {
            const canvas = faceapi.createCanvasFromMedia(video);
            document.getElementById('video-container').append(canvas);

            const displaySize = { width: video.videoWidth, height: video.videoHeight };
            faceapi.matchDimensions(canvas, displaySize);

            setInterval(async () => {
                const detections = await faceapi.detectAllFaces(video)
                    .withFaceLandmarks()
                    .withFaceDescriptors();

                const resizedDetections = faceapi.resizeResults(detections, displaySize);
                canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

                resizedDetections.forEach((detection) => {
                    const box = detection.detection.box;
                    let matchLabel = 'No Match';
                    let color = 'blue';

                    if (referenceDescriptors) {
                        const faceMatcher = new faceapi.FaceMatcher(referenceDescriptors);
                        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

                        if (bestMatch.label === 'Reference') {
                            matchLabel = 'Match';
                            color = 'green';
                        }
                    }

                    // رسم مستطیل و نمایش متن
                    const ctx = canvas.getContext('2d');
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(box.x, box.y, box.width, box.height);

                    ctx.font = '16px Arial';
                    ctx.fillStyle = color;
                    ctx.fillText(matchLabel, box.x, box.y - 10);
                });
            }, 100);
        });
    } catch (err) {
        console.error("Error accessing webcam or loading models:", err);
    }
}

// بارگذاری تصویر مرجع از ورودی
async function loadReferenceFromUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const img = await faceapi.bufferToImage(file);
    const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

    if (!detection) {
        alert('No face detected in the reference image.');
        return;
    }

    referenceDescriptors = new faceapi.LabeledFaceDescriptors('Reference', [detection.descriptor]);
    alert('Reference image loaded successfully!');
}

// گرفتن عکس از جریان ویدیو
function takeSnap() {
    const video = document.getElementById('video');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const downloadLink = document.createElement('a');
    downloadLink.href = canvas.toDataURL('image/png');
    downloadLink.download = 'snapshot.png';
    downloadLink.click();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('reference-upload').addEventListener('change', loadReferenceFromUpload);
    document.getElementById('snap-btn').addEventListener('click', takeSnap);
    startVideo();
});
