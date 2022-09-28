const {app, BrowserWindow, ipcMain} = require('electron')
const bf = require('buffer')
// include the Node.js 'path' module at the top of your file
const path = require('path')
var fs = require('fs');
var ffmpeg = require('fluent-ffmpeg');
// Setting ffmpeg path to ffmpeg binary for os x so that ffmpeg can be packaged with the app.
var appRootDir = require('app-root-dir').get();
const os = require('os');
const { autoUpdater } = require('electron-updater');



app.setAsDefaultProtocolClient("soundtovision")

function getPlatform(platform){
  switch (platform) {
    case 'aix':
    case 'freebsd':
    case 'linux':
    case 'openbsd':
    case 'android':
      return 'linux';
    case 'darwin':
    case 'sunos':
      return 'mac';
    case 'win32':
      return 'win';
  }
};
var platform = getPlatform(os.platform())
if (platform == 'mac'){
console.log('what',__dirname.substring(__dirname.lastIndexOf('/')))
if(__dirname.substring(__dirname.lastIndexOf('/')) == '/app.asar'){
  var execPath = path.join(__dirname.substring(0, __dirname.lastIndexOf('/')), 'bin','ffmpeg' );
}else{
  var execPath = path.join(__dirname, 'resources',platform,'ffmpeg' );
}}

if (platform == 'win'){
console.log('what',__dirname.substring(__dirname.lastIndexOf('\\')))
if(__dirname.substring(__dirname.lastIndexOf('\\')) == '\\app.asar'){
  var execPath = path.join(__dirname.substring(0, __dirname.lastIndexOf('\\')), 'bin','ffmpeg' );
}else{
  var execPath = path.join(__dirname, 'resources',platform,'ffmpeg' );
}}



console.log('execPath',execPath)
ffmpeg.setFfmpegPath(execPath)


function blobToFile(theBlob, fileName){
    //A Blob() is almost a File() - it's just missing the two properties below which we will add
    theBlob.lastModifiedDate = new Date();
    theBlob.name = fileName;
    return theBlob;
}

http = require("http");
soc  = require("socket.io");

const httpServer = http.createServer((req, res) => {
  if (req.url !== "/") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  // reload the file every time
  const content = fs.readFileSync("index.html");
  const length = Buffer.byteLength(content);

  res.writeHead(200, {
    "Content-Type": "text/html",
    "Content-Length": length,
  });
  res.end(content);
});

const io = new soc.Server(httpServer, {
  // Socket.IO optionshttpServer, {
  cors: {
    origin: ["http://localhost:9080","https://soundtovision.com","https://www.soundtovision.com"],
    methods: ["GET", "POST"],
    maxHttpBufferSize: 1e8
  },
  maxHttpBufferSize: 1e8
});

io.on("connection", (socket) => {
console.log(`connect ${socket.id}`);
var downpath = os.homedir()+'/Downloads/'
var stream
var pt
function init_ffmpeg(stream_data){
  stream = require("stream")
        pt = stream.PassThrough()
        pt2 = stream.PassThrough()
        var sound_path = path.join(app.getPath("temp"),'sound.ogg')
        cmd = ffmpeg({
          source: pt
        }).inputFormat("image2pipe")
        .videoCodec("libx264")
        .withFpsInput(stream_data['fps'])
        .fps(stream_data['fps'])
         .addInput(sound_path)
        .on('progress', function(info) {
                   
                    console.log('progress ' +Math.round(1000*info.frames/stream_data['total_frames'])/10 + '%');
                })
        .on('end', function() {
                    console.log('Processing finished successfully');
                })
        .on('error', function(err, stdout, stderr) {
                    console.log('err',stderr,err);
                })
        .format('mp4')
        //.output(result, { end: true })
        .output(downpath+'s2v-'+stream_data['render_id']+'.mp4', {vcodec: 'libx264', pix_fmt: 'yuv420p'}) // output to file
        
        //.output( 'http://localhost:9080/s2v-'+stream_data['render_id']+'.mp4', {vcodec: 'libx264', pix_fmt: 'yuv420p'}) // output to file
         cmd.run()

}

socket.on("setup_stream",(stream_data) => {
  init_ffmpeg(stream_data)
        
 })

  socket.on("send_image",(image_data) => {
      if(typeof pt == 'undefined'){
        return
      }
      if(image_data['end'] == false){
        pt.write(new Buffer(image_data['data']));
         
      }else{ 
        console.log('final tag')
        pt.end("q")
       
       }
    
       


  })
 
  
  socket.on("disconnect", (reason) => {
    console.log(`disconnect ${socket.id} due to ${reason}`);
  });


socket.on('render_with_sound',(compile_data, ) => {
      
      var input_arr = []
      fs.writeFileSync(path.join(app.getPath("temp"),'sound.ogg'), compile_data['sound'], err => {
    if (err) {
       console.error(err);
     }})
      init_ffmpeg(compile_data)


  })})
httpServer.listen(3000);

// modify your existing createWindow() function
const createWindow = () => {
  const win = new BrowserWindow({
    width: 750,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
  })

  win.loadFile('index.html')
  win.once('ready-to-show', () => {
  autoUpdater.checkForUpdatesAndNotify();
});
 
}

app.on('window-all-closed', () => {
  app.quit()
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

ipcMain.on('app_version', (event) => {
  event.sender.send('app_version', { version: app.getVersion() });
});

autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update_available');
});
autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update_downloaded');
});

ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});

