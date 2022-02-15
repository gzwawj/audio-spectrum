const WaveSurfer = require("wavesurfer.js/dist/wavesurfer.js");
const cursor = require("wavesurfer.js/dist/plugin/wavesurfer.cursor")
const regions = require("wavesurfer.js/dist/plugin/wavesurfer.regions")
const { ipcRenderer } = require('electron');

var option = {
    backend: "MediaElementWebAudio",
    container: '#waveform',
    waveColor: 'violet',
    progressColor: 'purple',
    height: 40,
    plugins: [
        cursor.create({
            showTime: true,
            opacity: 1,
            customShowTimeStyle: {
                'background-color': '#000',
                color: '#fff',
                padding: '2px',
                'font-size': '10px'
            }
        }),
        regions.create({
            regionsMinLength: 1,
            regions: [
                {
                    start: 0,
                    end: 300,
                    loop: false,
                    color: 'hsla(400, 100%, 30%, 0.5)'
                }
            ],
            dragSelection: {
                slop: 5
            }
        })
    ]
}

let wavesurfer = WaveSurfer.create(option);
let canvas_container = document.querySelector('.canvas-container')
let canvas = document.querySelector("canvas")
let height = canvas_container.offsetHeight, width = canvas_container.offsetWidth;
let analyser, bufferLength, dataArray, ctx, grd
let recorder

let menu_min = document.querySelector('.min');
let menu_close = document.querySelector('.close');
let audio_list_action = document.querySelector('.audio-list-action');
let audio_list = document.querySelector('.audio-list');
let audio_list_item = audio_list.querySelectorAll('li');
let action_is_click = false, audio_is_play = false

menu_min.addEventListener('click', function () {
    ipcRenderer.send("minimize");
})
menu_close.addEventListener('click', function () {
    ipcRenderer.send("close");
})
ipcRenderer.on('openFolder-reply', (event, arg) => {
    arg.forEach((url) => {
        let name = url.split("\\").pop()
        let li = document.createElement('li')
        li.setAttribute("data-url", url)
        let p = document.createElement('p')
        p.innerHTML = name
        li.onclick = getUrl
        li.appendChild(p)

        audio_list.appendChild(li)
    })
})
window.openFolder = function () {
    ipcRenderer.send("openFolder");
}
audio_list_action.addEventListener('click', function () {
    if (action_is_click) {
        audio_list.style.display = "none"
        audio_list_action.innerHTML = "展开"
        action_is_click = false
    } else {
        audio_list.style.display = "block"
        audio_list_action.innerHTML = "关闭"
        action_is_click = true
    }
})
audio_list_item.forEach((item) => {
    item.onclick = getUrl
})
let getUrl = (e) => {
    let url = e.target.dataset.url
    wavesurfer.load(url);
}
canvas.height = height
canvas.width = width

// 监听音频加载后
wavesurfer.on('ready', function () {
    analyser = wavesurfer.backend.analyser
    analyser.fftSize = 2048;
    bufferLength = analyser.frequencyBinCount
    dataArray = new Uint8Array(bufferLength);

    createMediaRecorder()
    audio_is_play = false
});

window.addEventListener('keyup', (event) => {
    if (event.keyCode == 32) {
        let region = Object.values(wavesurfer.regions.list)[0];
        if (!audio_is_play) {
            region.play();
            audio_is_play = true
        } else {
            region.pause()
            audio_is_play = false
        }
    }
}, true)
// 监听音频播放
wavesurfer.on('play', () => {
    recorder.start();
    canvasInit()
    draw()
})
// 播放完成时触发
wavesurfer.on('finish', () => {
    recorder.stop();
})
function createMediaRecorder() {
    const stream = canvas.captureStream();
    recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const data = [];
    recorder.ondataavailable = function (event) {
        if (event.data && event.data.size) {
            data.push(event.data);
        }
    };
    recorder.onstop = () => {
        let blob = new Blob(data, { type: 'video/webm' })
        var temp_url = URL.createObjectURL(blob);
        var uuid = temp_url.toString();
        URL.revokeObjectURL(temp_url);
        let blob_uuid = uuid.substr(uuid.lastIndexOf("/") + 1);
        blob.arrayBuffer().then(res => {
            let blob_buffer = Buffer.from(res)
            ipcRenderer.send("saveBlob", { name: blob_uuid, blob: blob_buffer });
        })
    };
}

function canvasInit() {
    ctx = canvas.getContext("2d");
    grd = ctx.createLinearGradient(0, 0, 1366, 100);
    grd.addColorStop(0, "#ea1515");
    grd.addColorStop(0.2, "#eadb15");
    grd.addColorStop(0.4, "#151aea");
    grd.addColorStop(0.6, "#ea15ba");
    grd.addColorStop(0.8, "#15e8ea");
    grd.addColorStop(1, "#22c706");
}

function draw() {
    requestAnimationFrame(draw)
    analyser.getByteFrequencyData(dataArray);

    let x = 0;
    let top = 0;
    let wave = canvas.width * 2.0 / bufferLength;

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.moveTo(0, height - top);

    for (let i = 1; i < bufferLength; i++) {
        let lineHeight = dataArray[i] / 256 * height / 2;
        let y = height - lineHeight - top

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        x += wave;
    }

    ctx.moveTo(x, height - top);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.closePath();
}