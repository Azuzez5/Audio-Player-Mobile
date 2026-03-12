/* ================================
NOTIFICATION PERMISSION
================================ */

if ("Notification" in window) {
if (Notification.permission !== "granted") {
Notification.requestPermission()
}
}

/* ================================
STATE
================================ */
/* ================================
IOS AUDIO UNLOCK
================================ */

document.addEventListener("touchstart",async()=>{

if(audioCtx && audioCtx.state==="suspended"){

try{
await audioCtx.resume()
}catch(e){}

}

},{once:true})

let db
let tracks=[]
let currentIndex=-1

let audio=new Audio()

audio.setAttribute("playsinline","true")
audio.preload="auto"
audio.crossOrigin="anonymous"

let audioCtx
let analyser
let source
let dataArray

let shuffle=false
let repeat=false
let queue=[]

/* ================================
DOM
================================ */

const volumeText=document.getElementById("volumeText")
const speed=document.getElementById("speed")
const search=document.getElementById("search")
const timeDisplay=document.getElementById("time")

const list=document.getElementById("trackList")
const upload=document.getElementById("upload")
const drop=document.getElementById("dropZone")

const playBtn=document.getElementById("play")
const prevBtn=document.getElementById("prev")
const nextBtn=document.getElementById("next")

const progress=document.getElementById("progress")
const volume=document.getElementById("volume")

const title=document.getElementById("title")
const cover=document.getElementById("cover")

const canvas=document.getElementById("wave")
const ctx=canvas.getContext("2d")


/* ================================
CANVAS FIX (MOBILE)
================================ */

function resizeCanvas(){

const ratio=window.devicePixelRatio||1

canvas.width=canvas.clientWidth*ratio
canvas.height=40*ratio

ctx.setTransform(ratio,0,0,ratio,0,0)

}

resizeCanvas()

window.addEventListener("resize",resizeCanvas)

/* ================================
DATABASE
================================ */

const req=indexedDB.open("audioUltra",1)

req.onupgradeneeded=e=>{
db=e.target.result
db.createObjectStore("tracks",{keyPath:"id"})
}

req.onsuccess=e=>{
db=e.target.result
loadTracks()
}

/* ================================
TRACK STORAGE
================================ */

function saveTrack(t){

const tx=db.transaction("tracks","readwrite")

tx.objectStore("tracks").put(t)

}

function loadTracks(){

tracks=[]

const tx=db.transaction("tracks","readonly")

const store=tx.objectStore("tracks")

store.openCursor().onsuccess=e=>{

const cur=e.target.result

if(cur){

tracks.push(cur.value)

cur.continue()

}else{

tracks.sort((a,b)=>a.order-b.order)

render()

}

}

}

/* ================================
UPLOAD
================================ */

upload.onchange=e=>handleFiles(e.target.files)

drop.ondragover=e=>e.preventDefault()

drop.ondrop=e=>{
e.preventDefault()
handleFiles(e.dataTransfer.files)
}

const uploadFolder=document.getElementById("uploadFolder")

uploadFolder.onchange=e=>{
handleFiles(e.target.files)
}

function handleFiles(files){

for(const file of files){

if(!file.type.startsWith("audio")) continue

const track={
id:Date.now()+Math.random(),
name:file.name,
file,
order:tracks.length
}

tracks.push(track)

saveTrack(track)

}

render()

}

/* ================================
RENDER
================================ */

function render(){

const keyword=search.value.toLowerCase()

const scrollPos=list.scrollTop

list.innerHTML=""

tracks.forEach((t,i)=>{

if(!t.name.toLowerCase().includes(keyword))return

const li=document.createElement("li")

li.className="track"
li.draggable=true
li.dataset.index=i

if(i===currentIndex) li.classList.add("playing")

const isPlaying=i===currentIndex&&!audio.paused

li.innerHTML=`
<span>${isPlaying?"⏸ ":"▶ "} ${t.name}</span>

<div>

<button class="playBtn" data-i="${i}">
${isPlaying?"⏸":"▶"}
</button>

<button class="upBtn" data-i="${i}">⬆</button>
<button class="downBtn" data-i="${i}">⬇</button>

<button onclick="deleteTrack(${i})">🗑</button>
<button onclick="downloadTrack(${i})">⬇</button>

</div>
`

list.appendChild(li)

})

list.scrollTop=scrollPos

attachControls()
enableDragDrop()
enableSwipe()

}

/* ================================
PLAY
================================ */

async function playTrack(i){

if(!tracks[i])return

if(!audioCtx){

audioCtx=new(window.AudioContext||window.webkitAudioContext)()

analyser=audioCtx.createAnalyser()

source=audioCtx.createMediaElementSource(audio)

source.connect(analyser)

analyser.connect(audioCtx.destination)

analyser.fftSize=512

dataArray=new Uint8Array(analyser.frequencyBinCount)

}

if(audioCtx.state==="suspended"){

try{
await audioCtx.resume()
}catch(e){}

}

if(audioCtx.state==="suspended"){

await audioCtx.resume()

}

currentIndex=i

const t=tracks[i]

audio.src=URL.createObjectURL(t.file)

audio.currentTime=0

title.textContent=t.name

readCover(t.file).then(img=>{

cover.src=img||"icons/default-cover.png"

})

await audio.play().catch(()=>{})
audio.playbackRate=parseFloat(speed.value)||1

playBtn.textContent="⏸"

showNotification(t)

setupMediaSession(t)

render()

}

/* ================================
PLAYER CONTROLS
================================ */
function attachControls(){

document.querySelectorAll(".playBtn").forEach(btn=>{

btn.onclick=()=>{

const i=parseInt(btn.dataset.i)

if(currentIndex===i&&!audio.paused){
audio.pause()
}else{
playTrack(i)
}

updatePlayIcons()

}

})

document.querySelectorAll(".upBtn").forEach(btn=>{

const i=parseInt(btn.dataset.i)

btn.onmousedown=()=>holdMove(i,-1)
btn.onmouseup=stopHoldMove
btn.onmouseleave=stopHoldMove

btn.onclick=()=>moveUp(i)

})

document.querySelectorAll(".downBtn").forEach(btn=>{

const i=parseInt(btn.dataset.i)

btn.onmousedown=()=>holdMove(i,1)
btn.onmouseup=stopHoldMove
btn.onmouseleave=stopHoldMove

btn.onclick=()=>moveDown(i)

})

}
audio.addEventListener("play",()=>{

render()

playBtn.textContent="⏸"

})

audio.addEventListener("pause",()=>{

render()

playBtn.textContent="▶"

})

playBtn.onclick=()=>{

if(audio.paused){

audio.play().catch(e=>console.log(e))

}else{

audio.pause()

audio.currentTime=audio.currentTime

}

updatePlayIcons()

}

function updatePlayIcons(){

render()

playBtn.textContent=audio.paused?"▶":"⏸"

}

/* ================================
NEXT / PREV
================================ */

prevBtn.onclick=async()=>{

if(tracks.length===0)return

currentIndex--

if(currentIndex<0)currentIndex=tracks.length-1

await playTrack(currentIndex)

}

nextBtn.onclick=async()=>{

if(tracks.length===0)return

if(shuffle){

currentIndex=Math.floor(Math.random()*tracks.length)

}else{

currentIndex++

if(currentIndex>=tracks.length)currentIndex=0

}

await playTrack(currentIndex)

}

nextBtn.onclick=async()=>{

if(tracks.length===0)return

if(shuffle){

currentIndex=Math.floor(Math.random()*tracks.length)

}else{

currentIndex++

if(currentIndex>=tracks.length)currentIndex=0

}

playTrack(currentIndex)

}

/* ================================
TIME
================================ */

function formatTime(t){

let m=Math.floor(t/60)
let s=Math.floor(t%60)

if(s<10)s="0"+s

return m+":"+s

}

audio.ontimeupdate=()=>{

timeDisplay.textContent=
formatTime(audio.currentTime)+" / "+
formatTime(audio.duration||0)

if(audio.duration){

progress.value=audio.currentTime/audio.duration*100

}

}

/* ================================
PROGRESS FIX
================================ */

progress.addEventListener("input",()=>{

if(!audio.duration)return

audio.currentTime=
(progress.value/100)*audio.duration

})

progress.addEventListener("change",()=>{

if(!audio.duration)return

audio.currentTime=
(progress.value/100)*audio.duration

})

/* ================================
VOLUME
================================ */
const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)

if(isiOS){

volume.style.display="none"

volumeText.textContent="Use device volume"

}

volume.oninput=()=>{

audio.volume=volume.value

volumeText.textContent=
Math.round(volume.value*100)+"%"

}

/* ================================
ENDED
================================ */

audio.onended=()=>{

if(repeat){

playTrack(currentIndex)

}else{

nextBtn.onclick()

}

}

/* ================================
VISUALIZER
================================ */

function drawWave(){

if(!analyser)return

ctx.clearRect(0,0,canvas.width,canvas.height)

analyser.getByteFrequencyData(dataArray)

const bars=dataArray.length
const barWidth=canvas.width/bars

for(let i=0;i<bars;i++){

const v=dataArray[i]

const h=canvas.height*(v/255)

const x=i*barWidth
const y=canvas.height-h

ctx.fillStyle="#22c55e"

ctx.fillRect(x,y,barWidth-1,h)

}

}

function animate(){

drawWave()

requestAnimationFrame(animate)

}

animate()

/* ================================
SEARCH
================================ */

search.oninput=()=>render()

/* ================================
SPEED
================================ */

speed.onchange=()=>{
audio.playbackRate=parseFloat(speed.value)
}

/* ================================
SHUFFLE / REPEAT
================================ */

document.getElementById("shuffleBtn").onclick=()=>{
shuffle=!shuffle
}

document.getElementById("repeatBtn").onclick=()=>{
repeat=!repeat
}

/* ================================
MEDIA SESSION
================================ */
/* ================================
IOS AUDIO RESUME FIX
================================ */

document.addEventListener("visibilitychange",async()=>{

if(!audioCtx) return

if(document.visibilityState==="visible"){

try{
await audioCtx.resume()
}catch(e){}

}

})

function setupMediaSession(track){

if(!("mediaSession" in navigator))return

navigator.mediaSession.metadata=
new MediaMetadata({

title:track.name,
artist:"Local Music",
album:"Audio Player"

})

navigator.mediaSession.setActionHandler("play",()=>{

audio.play()

render()

})

navigator.mediaSession.setActionHandler("pause",()=>{

audio.pause()

render()

})
navigator.mediaSession.setActionHandler("nexttrack",()=>nextBtn.onclick())
navigator.mediaSession.setActionHandler("previoustrack",()=>prevBtn.onclick())

}

/* ================================
SERVICE WORKER
================================ */

if("serviceWorker" in navigator){

navigator.serviceWorker.register("sw.js")

}

/* ================================
DOWNLOAD
================================ */

function downloadTrack(i){

const t=tracks[i]

const a=document.createElement("a")

a.href=URL.createObjectURL(t.file)

a.download=t.name

a.click()

}
let holdInterval=null

function holdMove(i,dir){

stopHoldMove()

holdInterval=setInterval(()=>{

if(dir===-1){
moveUp(i)
}else{
moveDown(i)
}

},200)

}

function stopHoldMove(){

clearInterval(holdInterval)

}
function enableDragDrop(){

let dragIndex=null

document.querySelectorAll(".track").forEach(item=>{

item.ondragstart=e=>{
dragIndex=parseInt(item.dataset.index)
}

item.ondragover=e=>{
e.preventDefault()
}

item.ondrop=e=>{

const dropIndex=parseInt(item.dataset.index)

if(dragIndex===dropIndex) return

const moved=tracks.splice(dragIndex,1)[0]

tracks.splice(dropIndex,0,moved)

updateOrder()

render()

}

})

}
function enableSwipe(){

document.querySelectorAll(".track").forEach(item=>{

let startX=0

item.addEventListener("touchstart",e=>{
startX=e.touches[0].clientX
})

item.addEventListener("touchend",e=>{

const endX=e.changedTouches[0].clientX

const diff=endX-startX

const i=parseInt(item.dataset.index)

if(Math.abs(diff)<40) return

if(diff>0){
moveUp(i)
}else{
moveDown(i)
}

})

})

}
function moveUp(i){

if(i===0) return

const temp=tracks[i]

tracks[i]=tracks[i-1]
tracks[i-1]=temp

updateOrder()

render()

}

function moveDown(i){

if(i===tracks.length-1) return

const temp=tracks[i]

tracks[i]=tracks[i+1]
tracks[i+1]=temp

updateOrder()

render()

}

function moveUp(i){

if(i===0) return

const temp=tracks[i]

tracks[i]=tracks[i-1]
tracks[i-1]=temp

updateOrder()

render()

}

function moveDown(i){

if(i===tracks.length-1) return

const temp=tracks[i]

tracks[i]=tracks[i+1]
tracks[i+1]=temp

updateOrder()

render()

}

function updateOrder(){

const tx=db.transaction("tracks","readwrite")
const store=tx.objectStore("tracks")

tracks.forEach((t,index)=>{
t.order=index
store.put(t)
})

}
/* ================================
DELETE
================================ */

function deleteTrack(i){

const id=tracks[i].id

const tx=db.transaction("tracks","readwrite")

tx.objectStore("tracks").delete(id)

tracks.splice(i,1)

render()

}
function moveUp(i){

if(i===0)return

const temp=tracks[i]

tracks[i]=tracks[i-1]

tracks[i-1]=temp

updateOrder()

render()

}

function moveDown(i){

if(i===tracks.length-1)return

const temp=tracks[i]

tracks[i]=tracks[i+1]

tracks[i+1]=temp

updateOrder()

render()

}
function updateOrder(){

const tx=db.transaction("tracks","readwrite")

const store=tx.objectStore("tracks")

tracks.forEach((t,index)=>{

t.order=index

store.put(t)

})

}

/* ================================
NOTIFICATION
================================ */

function showNotification(track){

if(Notification.permission!=="granted")return

navigator.serviceWorker.getRegistration().then(reg=>{

if(!reg)return

reg.showNotification("Now Playing",{

body:track.name,
icon:"icons/icon-192.png"

})

})

}

/* ================================
COVER
================================ */

function readCover(file){

return new Promise(resolve=>{

jsmediatags.read(file,{

onSuccess:tag=>{

const pic=tag.tags.picture

if(!pic){
resolve(null)
return
}

let b=""

for(let i=0;i<pic.data.length;i++){
b+=String.fromCharCode(pic.data[i])
}

resolve("data:"+pic.format+";base64,"+btoa(b))

},

onError:()=>resolve(null)

})

})

}

/* ================================
MINI MODE
================================ */

document.getElementById("miniBtn").onclick=()=>{
document.body.classList.toggle("mini")
}
