// Caitlin Sales, 08/20/2023
// Handles music sheet files, events for OSMD cursor events

var sheetMeasures = [];
var showBtn = document.getElementById("show");
var backBtn = document.getElementById("back");
var nextBtn = document.getElementById("next");
var score_numerator = 0;
var score_denominator = 0;
var sheet_loaded = false;
var textfile_loaded = false;
var audio_loaded = false;
var osmd;
var hidden = true;
window.osmd = osmd;

// Handles file select for music sheet
function handleFileSelect(evt) {
    var file = this.files[0];// FileList object

    // checks if file is in the right format
    if (!file.name.match('.*\.xml') && !file.name.match('.*\.musicxml') && false) {
      alert('You selected a non-xml file. Please select only music xml files.');
    } else {

      // checks if a piece is selected from select option
      if (selectedPiece == true) {
        // resets/clear the currently loaded audio and textfile and sheet music
        osmd.clear();
        document.getElementById('osmdCanvas').innerHTML = "";
        document.getElementById('waveform').innerHTML = "";
        document.getElementById('wave-timeline').innerHTML = "";
        audio_loaded = false;
        textfile_list = false;
        sheet_loaded = false;
        textfile_list = [];

        selectSheet.selectedIndex = 0;
        selectMusic.selectedIndex = 0;
        $('#dropdown_sheet option:not(:first)').remove();
        $('#dropdown_music option:not(:first)').remove();
        selectSheet.setAttribute("disabled", "disabled");
        selectMusic.setAttribute("disabled", "disabled");
        selectedPiece = false;
        selectedAudio = false;
      }

      var reader = new FileReader();

      // opens music sheet in OSMD
      reader.onload = function(e) {
          osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay("osmdCanvas", {
            // set options here
            backend: "svg",
            drawFromMeasureNumber: 1,
            drawUpToMeasureNumber: Number.MAX_SAFE_INTEGER // draw all measures, up to the end of the sample
          });
          osmd
            .load(e.target.result)
            .then(
              function() {
                osmd.render();
                osmd.FollowCursor = true;
                osmd.cursor.hide();

                score_numerator = osmd.Sheet.SourceMeasures[0].ActiveTimeSignature.numerator;
                score_denominator = osmd.Sheet.SourceMeasures[0].ActiveTimeSignature.denominator;
              }
            );
      };
      if (file.name.match('.*\.mxl')) {
        // have to read as binary, otherwise JSZip will throw ("corrupted zip: missing 37 bytes" or similar)
        reader.readAsBinaryString(file);
      } else {
        reader.readAsText(file);
      }

      sheet_loaded = true;
      document.getElementById('files').disabled = true;

      // checks if all other needed files have been loaded already
      if (audio_loaded == true && textfile_loaded == true){
        // will show/turn on cursor
        setTimeout(()=> {
             showCursor();
          }
          ,500);
      }
  }
}

// Turns cursor on/off depending on current status
function showHide() {
  // cursor is on
  overlayScreen.style.display = "";
  if (hidden == false) {
    setTimeout(() => {
        showBtn.value = "Show";
        new Promise((resolve, reject) => {
          hideCursor();
          resolve();
        }).then(() => {
          setTimeout(() => {
            overlayScreen.style.display = "none";
          }, 0);
        });
    }, 10);
  } else {
    setTimeout(() => {
      showBtn.value = "Hide";
        new Promise((resolve, reject) => {
          showCursor();
          resolve();
        }).then(() => {
          setTimeout(() => {
            overlayScreen.style.display = "none";
          }, 0);
        });
    }, 10);
  }
}

// Shows cursor
function showCursor(){
  var audioTime = wavesurfer.getCurrentTime();
  osmd.cursorsOptions[0].color = "#33e02f";
  osmd.render();
  osmd.cursor.show();
  hidden = false;
  // if current time is before time of start of first note
  if (parseFloat(textfile_list[1][0]) - audioTime > 0.01){
    wavesurfer.un('seeking', audioEvent);
    wavesurfer.skip(parseFloat(textfile_list[0][0]) - audioTime, false); // skips to time of start of first note
    wavesurfer.on('seeking', audioEvent);
    regionsws.addRegion({ start: parseFloat(textfile_list[0][0]), end: parseFloat(textfile_list[1][0]), drag: false, color: 'hsla(39, 100%, 50%, 0.2)' }); // creates a region around first note

    var currentTime = wavesurfer.getCurrentTime();
    var audioTime = (Math.round(currentTime * 1000)/1000);
  } else {
    if (audioTime >= textfile_list[textfile_list.length-1][0]) {
      previousNote();
      nextNote();
    } else {
      nextNote();
      previousNote();
    }
  }
}

// Hides cursor
function hideCursor(){
  osmd.cursorsOptions[0].color = "#ffffff";
  osmd.render();
  hidden = true;
  regionsws.clearRegions();
}

// Goes to previous note
function previousNote(){
  var previousTime = wavesurfer.getCurrentTime();
  // checks if time is in between second and third note
  // would mean .previous() would move cursor to first RenderSingleHorizontalStaffline
  if (parseFloat(textfile_list[1][0]) >= previousTime && previousTime <= parseFloat(textfile_list[2][0])){
    osmd.cursor.previous(); // moves cursor back

    // breaks down cursor position and represents it numerically
    var currentMeasure = osmd.cursor.iterator.currentMeasureIndex + 1;
    var timeStamp = osmd.cursor.iterator.currentVerticalContainerInMeasureTimestamp;
    var currentNumerator = timeStamp.numerator;
    var currentDenominator = timeStamp.denominator;
    var currentFraction = currentNumerator / currentDenominator;
    currentFraction = currentMeasure + currentFraction;

    // breaks down position of first note and represents it numerically
    var labelSplit = textfile_list[0][1].split("+");
    var measure = parseInt(labelSplit[0]);
    var numerator = parseInt(labelSplit[1].split("/")[0]);
    var denominator = parseInt(labelSplit[1].split("/")[1]);
    var frac = numerator / denominator;
    frac = measure + frac;

    // checks if cursor is before or at position of first note
    // to ensure previous did go to first note
    if (currentFraction <= frac) {
      regionsws.clearRegions();
      wavesurfer.skip(-previousTime, false);
      regionsws.addRegion({ start: 0, end: parseFloat(textfile_list[1][0]), drag: false, color: 'hsla(39, 100%, 50%, 0.2)' }); // creates a region around begenning of audio and first note
    }

  } else {
    osmd.cursor.previous();

    // centers cursor in screen
    if (!osmd.EngravingRules.RenderSingleHorizontalStaffline) {
      osmd.cursor.cursorElement.scrollIntoView({block: "center"});
    }
    else {
      osmd.cursor.cursorElement.scrollIntoView({inline: "center"});
    }

    skipTime(previousTime);
  }
}

// Goes to next note
function nextNote(){
  var previousTime = wavesurfer.getCurrentTime();

  // breaks down cursor position and represents it numerically
  var currentMeasure = osmd.cursor.iterator.currentMeasureIndex + 1;
  var timeStamp = osmd.cursor.iterator.currentVerticalContainerInMeasureTimestamp;
  var currentNumerator = timeStamp.numerator;
  var currentDenominator = timeStamp.denominator;
  var currentFraction = currentNumerator / currentDenominator;
  currentFraction = currentMeasure + currentFraction;

  // breaks down position of last note and represents it numerically
  var labelSplit = textfile_list[textfile_list.length-1][1].split("+");
  var measure = parseInt(labelSplit[0]);
  var numerator = parseInt(labelSplit[1].split("/")[0]);
  var denominator = parseInt(labelSplit[1].split("/")[1]);
  var frac = numerator / denominator;
  frac = measure + frac;

  // checks to make sure cursor is not on last note
  if (currentFraction < frac){
    osmd.cursor.next();

    // centers cursor in screen
    if (!osmd.EngravingRules.RenderSingleHorizontalStaffline) {
      osmd.cursor.cursorElement.scrollIntoView({block: "center"});
    }
    else {
      osmd.cursor.cursorElement.scrollIntoView({inline: "center"});
    }

    skipTime(previousTime);
  }
}

// Moves audio to time to match note being highlighted
function skipTime(previousTime){
  regionsws.clearRegions();

  // breaks down cursor position and represents it numerically
  var currentMeasure = osmd.cursor.iterator.currentMeasureIndex + 1;
  var timeStamp = osmd.cursor.iterator.currentVerticalContainerInMeasureTimestamp;
  var currentNumerator = timeStamp.numerator;
  var currentDenominator = timeStamp.denominator;
  var currentFraction = currentNumerator / currentDenominator;
  currentFraction = currentMeasure + currentFraction;
  var currentLabel = currentMeasure + "+" + currentNumerator + "/" + currentDenominator;
  var currentTime = 0;
  var nextTime = 0;
  var endOfSheet = false;
  console.log(currentLabel);

  // iterates through textfile_list
  for (var index = 0; index < textfile_list.length; index++) {
    // breaks down label at index and represents it numerically
    var labelSplit = textfile_list[index][1].split("+");
    var measure = parseInt(labelSplit[0]);
    var numerator = parseInt(labelSplit[1].split("/")[0]);
    var denominator = parseInt(labelSplit[1].split("/")[1]);
    var frac = numerator / denominator;
    frac = measure + frac;

    // if index is the last index in textfile_list
    if (index == textfile_list.length - 1) {
      // if currentFraction is beyond sheet, then hide
      if (currentFraction > frac && measure == currentMeasure) {
        endOfSheet = true;
        break;
      } else {
        currentTime = parseFloat(textfile_list[index][0]);
        nextTime = wavesurfer.getDuration();
        break;
      }
    }

    // checks if fractions are equal
    if (currentFraction === frac) {
      currentTime = parseFloat(textfile_list[index][0]);

      // if index is the last index in textfile_list
      if (index == textfile_list.length - 1) {
        nextTime = wavesurfer.getDuration(); // end of audio
      } else {
        nextTime = parseFloat(textfile_list[index+1][0]);
      }
      break;
    // checks if fraction surpasses currentFraction to know if it has gone too far
    } else if (currentFraction < frac) {
      currentTime = parseFloat(textfile_list[index-1][0]);

      // if index is the last index in textfile_list
      if (index == textfile_list.length - 1) {
        nextTime = wavesurfer.getDuration(); // end of audio
      } else {
        nextTime = parseFloat(textfile_list[index][0]);
      }
      break;
    }
  }

  // if currentFraction is not beyond sheet
  if (endOfSheet == false) {
    // skips to start of time of note now highlighted
    wavesurfer.skip(currentTime - previousTime, false);

    // highlights region of time of note before next note
    regionsws.addRegion({ start: currentTime, end: nextTime, drag: false, color: 'hsla(39, 100%, 50%, 0.2)' });

    var currentTime = wavesurfer.getCurrentTime();
    var audioTime = (Math.round(currentTime * 1000)/1000);
  }
}

// Jumps to beginning of inputted measure
function search(ele) {
    // if key pressed is Enter
    if(event.key === 'Enter' && ((sheet_loaded == true || selectedPiece == true) && ((audio_loaded == true && textfile_loaded == true) || selectedAudio == true) )) {
      var measure = parseInt(ele.value);
      // if measure if 0 or negative number, then cursor jumps to first note of first measure
      if (measure <= 1) {
        measure = 1;
        const targetFraction = new opensheetmusicdisplay.Fraction((measure - 1) * score_numerator, score_denominator).Add(new opensheetmusicdisplay.Fraction(0, 1));
        osmd.cursor.iterator = new opensheetmusicdisplay.MusicPartManagerIterator(osmd.Sheet, targetFraction);
        osmd.cursor.update(); // updates cursor

        var previousTime = wavesurfer.getCurrentTime();

        regionsws.clearRegions();
        wavesurfer.skip(-previousTime, false);// skips to time of start of first note
        regionsws.addRegion({ start: 0, end: parseFloat(textfile_list[1][0]), drag: false, color: 'hsla(39, 100%, 50%, 0.2)' });// creates a region around first note
      } else {
        // if measure number is greater than the number of measures in the sheet, then cursor jumps to first note of last measure
        if (measure > osmd.sheet.sourceMeasures.length) {
          measure = osmd.sheet.sourceMeasures.length;
        }
        const targetFraction = new opensheetmusicdisplay.Fraction((measure - 1) * score_numerator, score_denominator).Add(new opensheetmusicdisplay.Fraction(0, 1));
        osmd.cursor.iterator = new opensheetmusicdisplay.MusicPartManagerIterator(osmd.Sheet, targetFraction);
        osmd.cursor.update(); // updates cursor

        var previousTime = wavesurfer.getCurrentTime();
        skipTime(previousTime);

        // centers cursor in screen
        if (!osmd.EngravingRules.RenderSingleHorizontalStaffline) {
          osmd.cursor.cursorElement.scrollIntoView({block: "center"});
        }
        else {
          osmd.cursor.cursorElement.scrollIntoView({inline: "center"});
        }
      }
    }
}

// Event handlers
document.getElementById("files").addEventListener("change", handleFileSelect, false);
showBtn.addEventListener("click", showHide);
backBtn.addEventListener("click", previousNote);
nextBtn.addEventListener("click", nextNote);
