// Caitlin Sales, 08/20/2023
// Handles audio file and interactions with it

var wavesurfer;
var regionsws;
window.wavesurfer = wavesurfer;
window.regionsws = regionsws;

function audioEvent() {
  var currentTime = wavesurfer.getCurrentTime();
  var audioTime = (Math.round(currentTime * 1000)/1000);

  interactWaveform(audioTime);
}

window.audioEvent = audioEvent;

// Handles audio file select
function handleMusic(evt) {

    var file = this.files[0]; // FileList object

    // checks if file type is correct
    if (!file.name.match('.*\.wav')) {
      alert('You selected a non-wav file. Please select only music wav files.');
    } else {

      // checks if there audio selected from select option
      if (selectedAudio == true) {
        // resets/clear the currently loaded audio and textfile
        document.getElementById('waveform').innerHTML = "";
        document.getElementById('wave-timeline').innerHTML = "";
        audio_loaded = false;
        textfile_loaded = false;
        textfile_list = [];

        $('#dropdown_music option:not(:first)').remove();
        selectMusic.setAttribute("disabled", "disabled");
        selectedPiece = false;
        selectedAudio = false;

        if (osmd.cursor.Hidden == false){
          hideCursor();
        }
      }

      // creates wavesurfer object with plugins
      wavesurfer = WaveSurfer.create({
          container: '#waveform',
          autoScroll: true,
          height: 80,
          waveColor: 'violet',
          progressColor: 'purple',
          normalize: true,
          plugins: [
            WaveSurfer.Timeline.create({}),
            WaveSurfer.Hover.create({
              lineColor: '#000',
              lineWidth: 3,
              labelBackground: '#555',
              labelColor: '#fff',
              labelSize: '10px',
            }),
          ]
      });

      regionsws = wavesurfer.registerPlugin(WaveSurfer.Regions.create());

      wavesurfer.loadBlob(file);

      // event handlers for audio
      // when current time changes when audio is paused
      wavesurfer.on('interaction', audioEvent);

      // runs continuously when audio plays
      wavesurfer.on('audioprocess', audioEvent);

      audio_loaded = true;
      document.getElementById('music').disabled = true;

      // checks if other needed files have been uploaded
      if (sheet_loaded == true && textfile_loaded == true){
        // will show/turn on cursor
        wavesurfer.on('ready', function() { // runs continuously when audio plays
          osmd.cursorsOptions[0].color = "#33e02f";
          osmd.cursor.show();
          hidden = false;
        });
      }
  }
}

// Pauses/plays ausio
function pausePlay(){
  wavesurfer.playPause();
}

function interactWaveform(audioTime){
  regionsws.clearRegions();
  // if current time is less than starting time of first note,
  // cursor resets to beginning of sheet, is hidden and audio is cleared of any regions on it
  if ((audio_loaded == true && textfile_loaded == true) || selectedAudio == true){
    if (audioTime < textfile_list[0][0]) {
      osmd.cursor.reset();
    } else {
        // if cursor is not currently hidden
        if (osmd.cursor.Hidden == false) {
          // iterate through textfile_list
          for (var index = 0; index < textfile_list.length; index++) {
            var textTime = parseFloat(textfile_list[index][0]);
            var nextTextTime = wavesurfer.getDuration() + 1; // makes next time end of audio + 1s
            // checks if index is at end of the textfile_list
            if (index != textfile_list.length - 1) {
              nextTextTime = parseFloat(textfile_list[index + 1][0]); // makes next time the time at next index
            }
            // checks if current time is >= time at index and < time at index + 1
            if ((audioTime >= textTime) && (audioTime < nextTextTime)) {
              console.log(textfile_list[index][1]);

              // parses the fraction
              var labelSplit = textfile_list[index][1].split("+");
              var measure = parseInt(labelSplit[0]);
              var numerator = parseInt(labelSplit[1].split("/")[0]);
              var denominator = parseInt(labelSplit[1].split("/")[1]);

              const targetFraction = new opensheetmusicdisplay.Fraction((measure - 1) * score_numerator, score_denominator).Add(new opensheetmusicdisplay.Fraction(numerator, denominator));
              osmd.cursor.iterator = new opensheetmusicdisplay.MusicPartManagerIterator(osmd.Sheet, targetFraction);
              osmd.cursor.update(); // updates cursor
            }
          }
          // if (!osmd.EngravingRules.RenderSingleHorizontalStaffline) {
          //   var diff = osmd.cursor.cursorElement.getBoundingClientRect().top;
          //   osmd.cursor.cursorElement.scrollIntoView({behavior: diff < 1000 ? "smooth" : "auto", block: "center"});
          // }
          // else {
          //   osmd.cursor.cursorElement.scrollIntoView({behavior: "smooth", inline: "center"});
          // }
        }
      }
  }
}

// Disables button for OSMD cursor depending on when audio is playing and if cursor is hidden
setInterval(function() {
  if ((sheet_loaded == true || selectedPiece == true) && ((audio_loaded == true && textfile_loaded == true) || selectedAudio == true) ) {
    if (wavesurfer.isPlaying() == true){
      document.getElementById("pplay").value = "Pause";
      showBtn.disabled = true;
      backBtn.disabled = true;
      nextBtn.disabled = true;
      zoomIn.disabled = true;
      zoomOut.disabled = true;
      measureInput.disabled = true;
      selectSheet.setAttribute("disabled", "disabled");
      selectMusic.setAttribute("disabled", "disabled");

      // if (!osmd.EngravingRules.RenderSingleHorizontalStaffline) {
      //   osmd.cursor.cursorElement.scrollIntoView({block: "center"});
      // }
      // else {
      //   osmd.cursor.cursorElement.scrollIntoView({inline: "center"});
      // }
    } else {
      document.getElementById("pplay").value = "Play";
      showBtn.disabled = false;
      zoomIn.disabled = false;
      zoomOut.disabled = false;
      measureInput.disabled = false;
      selectSheet.removeAttribute("disabled");
      selectMusic.removeAttribute("disabled");
      if (hidden == true) {
        backBtn.disabled = true;
        nextBtn.disabled = true;
      } else {
        backBtn.disabled = false;
        nextBtn.disabled = false;
      }
    }
  }
  else {
    showBtn.disabled = true;
    backBtn.disabled = true;
    nextBtn.disabled = true;
    zoomIn.disabled = true;
    zoomOut.disabled = true;
    measureInput.disabled = true;
  }

  if ((audio_loaded == true && textfile_loaded == true) || selectedAudio == true) {
    document.getElementById("pplay").disabled = false;
  } else {
    document.getElementById("pplay").disabled = true;
  }
}, 1);

// Event handlers
document.getElementById("music").addEventListener("change", handleMusic, false);
document.getElementById("pplay").addEventListener("click", pausePlay);
