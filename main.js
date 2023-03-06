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
var ss = require('socket.io-stream');
var buffer = require('node:buffer')
var win

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

if(__dirname.substring(__dirname.lastIndexOf('/')) == '/app.asar'){
  var execPath = path.join(__dirname.substring(0, __dirname.lastIndexOf('/')), 'bin','ffmpeg' );
}else{
  var execPath = path.join(__dirname, 'resources',platform,'ffmpeg' );
}}

if (platform == 'win'){

if(__dirname.substring(__dirname.lastIndexOf('\\')) == '\\app.asar'){
  var execPath = path.join(__dirname.substring(0, __dirname.lastIndexOf('\\')), 'bin','ffmpeg' );
}else{
  var execPath = path.join(__dirname, 'resources',platform,'ffmpeg' );
}}



console.log('execPath',execPath)
ffmpeg.setFfmpegPath(execPath)

var pattern = new Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A])
console.log('pattern',pattern)

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
    maxHttpBufferSize: 1e14
  },
  maxHttpBufferSize: 1e14,
  pingInterval: 2000, 
  pingTimeout: 500000
});

io.on("connection", (socket) => {
    var downpath = os.homedir()+'/Downloads/'
    var stream = require("stream")
    var pt
    function photo_stack(start, end, stimes){

        pt = stream.PassThrough()
        var downpath = os.homedir()+'/Downloads/stuff'
        var inputPath = path.join(app.getPath("temp"),'video.mp4')

        ffmpeg()
        .input(inputPath)
        .ffprobe(0, function(err, data) {
          
          var frame_rate = parseInt(data.streams[0].r_frame_rate)
          var select_str = "select='"
          
          for (var i = 0; i < stimes.length; i++) {
            select_str += "eq(n,"+(Math.floor(stimes[i]*frame_rate))+")"
            if(i<stimes.length-1){
              select_str += "+"
            }
          }
          select_str += "'"
          count = 0
          
          var file = new Array();
          pt.on('data', function (d,t) {

            found = d.indexOf(pattern)
            if(found == -1){
              //No start sequence found, just add on.
              file.push(d)

            }else{
              if(found == 0){
                //if position is zero.
                if(file.length == 0){
                  //If this is the first file of the session.
                  file.push(d)
                 }else{ 
                  //Else wi
                  socket.emit('send_back_image', {'data':Buffer.concat(file),'num':count})
                   win.webContents.send('progress',100*count/stimes.length)
                  file = [];
                  file.push(d)
                  count +=1
                }
              }else{
                file.push(d.slice(0,found))
                socket.emit('send_back_image', {'data':Buffer.concat(file),'num':count})
                 win.webContents.send('progress',100*count/stimes.length)
                file = [];
                file.push(d.slice(found))
                count +=1
              }
          }})

          const command = ffmpeg()
            .input(inputPath)
            .inputFPS(frame_rate)
            .complexFilter(select_str)
            .noAudio() // Disable audio output
            .fromFormat('mp4')
            .outputOptions([
              "-vsync 0",
              "-vcodec png",
              "-f image2pipe",
              "-pix_fmt yuv420p"
             ])

          command.on('end', () => {

            socket.emit('send_back_last_image', {'data':Buffer.concat(file),'num':count})
            win.webContents.send('progress',100)
              
          }).output(pt, { end: true }).run();
        });

    }
    function resample_ffmpeg(start, end, stimes){
        
        pt = stream.PassThrough()
        pt2 = stream.PassThrough()
        pt3 = stream.PassThrough()
        var downpath = os.homedir()+'/Downloads/stuff'
        var inputPath = path.join(app.getPath("temp"),'video.mp4')

        ffmpeg()
        .input(inputPath)
        .ffprobe(0, function(err, data) {
          
          var frame_rate = parseInt(data.streams[0].r_frame_rate)
          var select_str = "select='"
          var prev_st = -1
          var count_r = [1]
          var scount = -1
          console.log('stimes',stimes)
          for (var i = 0; i < stimes.length; i++) {

            var frame_num = Math.floor(stimes[i]*frame_rate)
            console.log('frame_num',frame_num)
            if(frame_num == prev_st){
              count_r[scount] += 1
              continue
            }

            prev_st = frame_num
            count_r.push(1)
            scount += 1

            select_str += "eq(n,"+(frame_num)+")"
            if(i<stimes.length-1){
              select_str += "+"
            }

          }
          select_str += "'"

          console.log('select_str',select_str,count_r)
          count = 0
          
          var file = new Array();
          pt.on('data', function (d,t) {

            found = d.indexOf(pattern)
            if(found == -1){
              //No start sequence found, just add on.
              file.push(d)

            }else{
              if(found == 0){
                //if position is zero.
                if(file.length == 0){
                  //If this is the first file of the session.
                  file.push(d)
                 }else{ 
                  //Else wi
                  //socket.emit('send_back_image', {'data':Buffer.concat(file),'num':count})
                  var black_blob = new buffer.Blob([Buffer.concat(file)]);
                  //var file_obj = new File([black_blob],name+file_array.length,{ type: 'image/png' });
                  for (var i = 0; i < count_r[count]; i++) {
                    
                     pt2.write(Buffer.concat(file))
                  }
                   
                 
                  file = [];
                  file.push(d)
                  count +=1
                }
              }else{
                file.push(d.slice(0,found))
                var black_blob = new buffer.Blob([Buffer.concat(file)]);
                //var file_obj = new File([black_blob],name+file_array.length,{ type: 'image/png' });
                for (var i = 0; i < count_r[count]; i++) {
                    
                     pt2.write(Buffer.concat(file))
                  }
                
                //socket.emit('send_back_image', {'data':Buffer.concat(file),'num':count})
                file = [];
                file.push(d.slice(found))
                count +=1
              }

              win.webContents.send('progress',100*count/stimes.length)
          }})

          pt3.on('data', function (d,t) {
          
            socket.emit('send_back', d);
          });


          cmd2 = ffmpeg({
            source: pt2
          }).inputFormat("image2pipe")
          .videoCodec("libx264")
          .withFpsInput(60)

          .fps(60)
           
          .on('progress', function(info) {
                     
                      socket.emit('progress', info.frames/stimes.length);
                      win.webContents.send('progress',100*info.frames/stimes.length)

                  })
          .on('end', function() {
                      console.log('Processing finished successfully');

                      win.webContents.send('progress',100)
                      socket.emit('send_back_complete')
                  })
          .on('error', function(err, stdout, stderr) {
                      console.log('err',stderr,err);
                  })
          .format('mp4')
          .outputOptions([
            "-pix_fmt yuv420p",
            "-movflags frag_keyframe+empty_moov",
            "-movflags +faststart",
          ])
         .output(pt3, { end: true }).run();
        
          


          const command = ffmpeg()
            .input(inputPath)
            .inputFPS(frame_rate)
            .complexFilter(select_str)
            .noAudio() // Disable audio output
            .fromFormat('mp4')
            .outputOptions([
              "-vsync 0",
              "-vcodec png",
              "-f image2pipe",
              "-pix_fmt yuv420p"
             ])

          command.on('end', () => {
            pt2.write(Buffer.concat(file))
            pt2.end("q")
          }).output(pt, { end: true }).run();
        }); 

    }
    function reverse(start,end){



        stream = require("stream")
        pt = stream.PassThrough()
        


        var downpath = os.homedir()+'/Downloads/'
        var cmd = ffmpeg()
          .noAudio() // Disable audio output
          .format('mp4')
             .on('error', function (err, stdout, stderr) {
            console.log(err)
            console.log('Stdout: %o', stdout);
            console.log('Stderr: %o', stderr);
          }).on('progress', progress => {
            const time = parseInt(progress.timemark.replace(/:/g, ''))
            socket.emit('progress', time/(end-start));
            win.webContents.send('progress',100*time/(end-start))
          })
          .outputOptions([
            "-vf reverse",
            "-pix_fmt yuv420p",
            "-movflags frag_keyframe+empty_moov",
            "-movflags +faststart",
          ])
          .on('end', function() {
                      console.log('Processing finished successfully');
                      win.webContents.send('progress',100)
                      socket.emit('send_back_complete')
                  })
         .output(pt, { end: true })
        
        pt.on('data', function (d,t) {
            socket.emit('send_back', d);
          });

        socket.emit('start_send_back');
        //socket.pipe(stream);
        cmd.addInput(path.join(app.getPath("temp"),'video.mp4'))
        cmd.run()    

    }
    function init_ffmpeg(stream_data,sound){
          
          stream = require("stream")
          pt = stream.PassThrough()
          pt2 = stream.PassThrough()
          
          
          
          cmd = ffmpeg({
            source: pt
          }).inputFormat("image2pipe")
          .videoCodec("libx264")
          .withFpsInput(stream_data['fps'])

          .fps(stream_data['fps'])
           
          .on('progress', function(info) {
                     
                      console.log('progress ' +Math.round(1000*info.frames/stream_data['total_frames'])/10 + '%');
                       win.webContents.send('progress',Math.round(1000*info.frames/stream_data['total_frames'])/10)
                      //document.getElementById('progress_bar').value = Math.round(1000*info.frames/stream_data['total_frames'])/10
                  })
          .on('end', function() {
                      console.log('Processing finished successfully');
                      win.webContents.send('progress',100)
                      socket.emit('send_back_complete')
                  })
          .on('error', function(err, stdout, stderr) {
                      console.log('err',stderr,err);
                  })
          .format('mp4')
          .outputOptions([
            "-pix_fmt yuv420p",
            "-movflags frag_keyframe+empty_moov",
            "-movflags +faststart",
          ])
         .output(pt2, { end: true })
        
          pt2.on('data', function (d,t) {
          
            socket.emit('send_back', d);
          });
          
          if(sound == true){
            var sound_path = path.join(app.getPath("temp"),'sound.ogg')
            cmd.addInput(sound_path)
          }

          cmd.run()
          socket.emit("initialized")

    }



    socket.on("send_image",(image_data) => {
        if(typeof pt == 'undefined'){
          return
        }
        if(image_data['end'] == false){
          pt.write(new Buffer(image_data['data']));
          console.log('ctime',image_data['ctime'])
        }else{ 
          console.log('final tag')
          pt.end("q")
          
         }
      
         


    })


    socket.on("disconnect", (reason) => {
      console.log(`disconnect ${socket.id} due to ${reason}`);
    });

    ss(socket).on('write_file', function(stream, data) {
      var filename = path.join(app.getPath("temp"),'video.mp4');
      stream.pipe(fs.createWriteStream(filename));

      //tryit(filename)
      });
    socket.on('photostack_ffmpeg',function(param){
      
      
      
      photo_stack("","",param['stimes'])

    })

    socket.on('reverse_ffmpeg',function(params){
      
      reverse(params['start'],params['end'])

    })

    socket.on("resample_ffmpeg",(param) => {
      
      
       resample_ffmpeg(0, 5, param['stimes'])
      //resample_video()
      //init_ffmpeg(compile_data,false)
          
    }) 


    socket.on("render_without_sound",(compile_data) => {
      init_ffmpeg(compile_data,false)
          
    })
    socket.on('render_with_sound',(compile_data) => {
        
        var input_arr = []
        fs.writeFileSync(path.join(app.getPath("temp"),'sound.ogg'), compile_data['sound'], err => {
      if (err) {
          console.error(err);
        }else{
          
        }
       
     })
        init_ffmpeg(compile_data,true)
        
    })
  })
httpServer.listen(3000);



// modify your existing createWindow() function
const createWindow = () => {
  win  = new BrowserWindow({
    width: 750,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
  })



  win.loadFile('index.html')
  win.once('ready-to-show', () => {
     win.webContents.send('progress',0)
  autoUpdater.checkForUpdatesAndNotify();
  autoUpdater.on('update-available', () => {
  win.webContents.send('update_available');
});
autoUpdater.on('update-downloaded', () => {
  win.webContents.send('update_downloaded');
});
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



ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});

