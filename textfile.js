// Caitlin Sales, 08/20/2023
// Handles text file and inserts into textfile_list

var textfile_list = [];
var zoomIn = document.getElementById("zoom-in");
var zoomOut = document.getElementById("zoom-out");
var measureInput = document.getElementById("measure-input");

zoomIn.addEventListener("click", zoomSheetIn);
zoomOut.addEventListener("click", zoomSheetOut);

// Zooms in on sheet music
function zoomSheetIn() {
  zoomValue = osmd.Zoom;
  if (zoomValue < 2){
    overlayScreen.style.display = "";
    setTimeout(() => {
        zoomValue = zoomValue + 0.1;
        osmd.Zoom = zoomValue;
        new Promise((resolve, reject) => {
          osmd.render();
          resolve();
        }).then(() => {
          setTimeout(() => {
            overlayScreen.style.display = "none";
          }, 0);
        });
    }, 10);
  }
}

// Zooms out of sheet music
function zoomSheetOut() {
  zoomValue = osmd.Zoom;
  if (zoomValue > 0.1){
    overlayScreen.style.display = "";
    setTimeout(() => {
        zoomValue = zoomValue - 0.1;
        osmd.Zoom = zoomValue;
        new Promise((resolve, reject) => {
          osmd.render();
          resolve();
        }).then(() => {
          setTimeout(() => {
            overlayScreen.style.display = "none";
          }, 0);
        });
    }, 10);
  }
}

// Handles file select for text file
document.getElementById('inputFile').addEventListener('change', function() {
  // checks if there audio selected from select option
  if (selectedAudio == true) {
    // resets/clear the currently loaded audio and textfile
    document.getElementById('waveform').innerHTML = "";
    document.getElementById('wave-timeline').innerHTML = "";
    audio_loaded = false;
    textfile_loaded = false;
    textfile_list = [];

    selectMusic.selectedIndex = 0;
    $('#dropdown_music option:not(:first)').remove();;
    selectedAudio = false;

    if (osmd.cursor.Hidden == false){
      hideCursor();
    }
  }

  var file = this.files[0];

  var reader = new FileReader();
  reader.onload = function(progressEvent) {
    // entire file
    const text = this.result;

    // reads file by line
    var lines = text.split('\n');
    for (var line = 0; line < lines.length; line++) {
      // skips if line is empty
      if (lines[line] == ""){
        continue;
      }
      var newLine = lines[line].replace("\t", " ").trim(); // trims/fixes each line to format
      var newlineSplit = newLine.split(' '); // splits line by space
      textfile_list.push([newlineSplit[1], newlineSplit[0]]); // pushes it to list
    }
  };
  reader.readAsText(file);
  textfile_loaded = true;
  document.getElementById('inputFile').disabled = true;

  // checks if other needed files have been uploaded
  if (sheet_loaded == true && audio_loaded == true){
    // will turn on/show cursor
    setTimeout(()=> {
         showCursor();
      }
      ,500);
    }
})

document.getElementById('changeAudioText').addEventListener('click', unloadAudioText)

document.getElementById('changeSheet').addEventListener('click', unloadSheets);

// Unloads audio and text file from upload option
function unloadAudioText() {
  if (audio_loaded == true || selectedAudio == true) {
    osmd.cursor.reset();
    var currentTime = wavesurfer.getCurrentTime();
    var audioTime = (Math.round(currentTime * 1000)/1000);
    wavesurfer.destroy();
  }
  document.getElementById('music').value = "";
  document.getElementById('music').disabled = false;
  document.getElementById('inputFile').value = "";
  document.getElementById('inputFile').disabled = false;
  document.getElementById('waveform').innerHTML = "";
  audio_loaded = false;
  textfile_loaded = false;
  selectedAudio = false;
  textfile_list = [];
  measureInput.value = "";
}

// Unloads sheet, audio and text file from upload option
function unloadSheets() {
  document.getElementById('files').value = "";
  document.getElementById('files').disabled = false;
  document.getElementById('music').value = "";
  document.getElementById('music').disabled = false;
  document.getElementById('inputFile').value = "";
  document.getElementById('inputFile').disabled = false;
  document.getElementById('waveform').innerHTML = "";

  if (sheet_loaded == true || selectedPiece == true) {
    osmd.clear();
    document.getElementById('osmdCanvas').innerHTML = "";
  }

  if (audio_loaded == true || selectedAudio == true) {
    wavesurfer.destroy();
  }

  audio_loaded = false;
  textfile_loaded = false;
  sheet_loaded = false;
  textfile_list = [];
  selectedPiece = false;
  selectedAudio = false;
  measureInput.value = "";
}
