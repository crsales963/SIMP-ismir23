// Caitlin Sales, 03/17/2023
// Handles choosing between file select and upload and using the selection option

var selectSheet = document.getElementById("dropdown_sheet");
var selectMusic = document.getElementById("dropdown_music");
var commentsDiv = document.getElementById("comments");
var overlayScreen = document.getElementById("overlay");
var selectedPiece = false;
var selectedAudio = false;
var audioWithSelectedPiece = [];
var jsonByPiece = {};

selectSheet.addEventListener("change", updateAudioSelections);
selectMusic.addEventListener("change", loadAudio);

function audioEvent() {
  var currentTime = wavesurfer.getCurrentTime();
  var audioTime = (Math.round(currentTime * 1000)/1000);

  interactWaveform(audioTime);
}

window.audioEvent = audioEvent;

const directory = "/~yjiang/papers/ismir23/data/";
var folder = "";

function encodeAccentedCharacters(inputString) {
  // Normalize the string to decompose accented characters
  const normalizedString = inputString.normalize("NFD");

  // Replace accented characters with their base character + combining accent
  const encodedString = normalizedString.replace(/[\u0300-\u036f]/g, (match) =>
    encodeURIComponent(match)
  );

  return encodedString;
}

function capitalizeWords(inputString) {
  // Split the input string into an array of words
  var words = inputString.split(' ');

  // Initialize an array to store capitalized words
  var capitalizedWords = [];

  // Loop through each word, capitalize the first letter, and push it to the array
  for (var i = 0; i < words.length; i++) {
    var word = words[i];
    var capitalizedWord = word.charAt(0).toUpperCase() + word.slice(1);
    capitalizedWords.push(capitalizedWord);
  }

  // Join the capitalized words back into a single string with spaces
  var resultString = capitalizedWords.join(' ');

  return resultString;
}

// when page loads, will read and filter csv file
window.addEventListener("load", () => {
  overlayScreen.style.display = "none";
  const file = "survey_data_anonymous.csv";
  fetch(file)
    .then((response) => {
      return response.text();
    })
    .then((csvData) => {
      Papa.parse(csvData, {
        header: true,
        complete: (results) => {
          const data = results.data;
          // loops through data and creates JSON appropriately
          for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const piece = item["Piece_name"];
            const recording = item["Recording_number"];
            if (jsonByPiece[piece] === undefined) {
              jsonByPiece[piece] = {};
            }
            if (jsonByPiece[piece][recording] === undefined) {
              jsonByPiece[piece][recording] = [];
            }
            jsonByPiece[piece][recording].push(item);
          }

          // sorts composers alphebetically
          const sortedKeys = Object.keys(jsonByPiece).sort();
          for (let i = 0; i < sortedKeys.length; i++) {
            const key = sortedKeys[i];
            var option = document.createElement("option");
            option.text = key;
            selectSheet.add(option);
          }

          //console.log(jsonByPiece);
        },
        error: (error) => {
          console.error(error);
        }
      });
    })
    .catch((error) => {
      console.error(error);
    });
});

// Updates audio selections based on sheet music chosen in select option
function updateAudioSelections() {
  overlayScreen.style.display = "";
  unloadSheets();
  selectMusic.removeAttribute("disabled");
  commentsDiv.innerText = "";
  selectedPiece = true;
  audioWithSelectedPiece = [];
  folder = encodeAccentedCharacters(capitalizeWords(selectSheet.value).replace(/\s+/g, "").replace("'", ""));
  var sheetFile = directory + folder + "/" + folder + ".mxl";
  osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay("osmdCanvas", {
    // set options here
    backend: "svg",
    drawFromMeasureNumber: 1,
    drawUpToMeasureNumber: Number.MAX_SAFE_INTEGER // draw all measures, up to the end of the sample
  });
  osmd
    .load(sheetFile)
    .then(
      function() {
        osmd.Zoom = 0.8;
        osmd.render();
        osmd.FollowCursor = true;
        osmd.cursor.hide();

        score_numerator = osmd.Sheet.SourceMeasures[0].ActiveTimeSignature.numerator;
        score_denominator = osmd.Sheet.SourceMeasures[0].ActiveTimeSignature.denominator;

        overlayScreen.style.display = "none";
      }
    );
  sheet_loaded = true;
  selectMusic.selectedIndex = 0;
  $('#dropdown_music option:not(:first)').remove();

  for (j in jsonByPiece[selectSheet.value]){
    var obj = jsonByPiece[selectSheet.value][j];
    var pieceName = obj[0]["Piece_name"];
    recordingNumber = j;
    if (recordingNumber.length != 2) {
      recordingNumber = "0" + j;
    }
    var audioOption = pieceName + " " + recordingNumber;
    var option = document.createElement("option");
    option.text = audioOption;
    selectMusic.add(option);
  }
}

// Loads audio from select option when one is chosen
function loadAudio() {
  overlayScreen.style.display = "";
  unloadAudioText();
  selectedAudio = true;
  var recordingInt = parseInt(selectMusic.value.slice(-2));
  var recordingObj = jsonByPiece[selectSheet.value][recordingInt][0];
  var audioFileName = selectSheet.value.replace("'", "’") + "-" + selectMusic.value.slice(-2);
  //console.log(audioFileName);
  var audioFile = directory + folder + "/" + encodeAccentedCharacters(audioFileName) + ".wav";

  // creates wavesurfer object
  wavesurfer = WaveSurfer.create({
      container: '#waveform',
      autoScroll: true,
      height: 80,
      // barWidth: 2,
      // barHeight: 1, // the height of the wave
      // barGap: null, // the optional spacing between bars of the wave, if not provided will be calculated in legacy format.
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
        })
      ]
  });

  regionsws = wavesurfer.registerPlugin(WaveSurfer.Regions.create());
  wavesurfer.load(audioFile);

  // event handlers for audio
  // when current time changes when audio is paused
  wavesurfer.on('interaction', audioEvent);

  // runs continuously when audio plays
  wavesurfer.on('audioprocess', audioEvent);

  // when waveform loads
  wavesurfer.on('ready', function() {
    var textFileName = capitalizeWords(selectSheet.value).replace(/\s+/g, "").replace("'", "");

    if (recordingInt.toString().length == 1) {
      textFileName += ".00" + recordingInt;
    } else {
      textFileName += ".0" + recordingInt;
    }

    //loads file using jQuery
    jQuery
      .ajax({
        url: directory + folder + "/" + encodeAccentedCharacters(textFileName) + ".txt",
        dataType: 'text'
      })
      .done(function(res){
        jQuery.each(res.split(/\r?\n/g), function(i, v){
          if (v != ""){
            var newLine = v.replace("\t", " ").trim();
            var newlineSplit = newLine.split(' ');
            textfile_list.push([newlineSplit[1], newlineSplit[0]]);
          }
        });
    });

    selectedAudio = true;
    osmd.cursorsOptions[0].color = "#33e02f";
    osmd.cursor.show();
    hidden = false;

    var currentTime = wavesurfer.getCurrentTime();
    var audioTime = (Math.round(currentTime * 1000)/1000);

    uploadSelect.removeAttribute("disabled");

    overlayScreen.style.display = "none";
  });

  // output comments
  var details = "";
  for (let i = 1; i <= 4; i++) {
    details += generateInstructorRating(recordingObj, i) + "\n\n";
  }

  for (let i = 1; i <= 6; i++) {
    if (i === 6 && recordingObj["Rater6_id"] === "") {
      break
    } else {
      details += generatePeerRating(recordingObj, i) + "\n\n";
    }
  }

  commentsDiv.innerText = details;
}

function generateInstructorRating(recordingObj, number) {
  return "Instructor " + number + " ("+ recordingObj["Instructor" + number + "_rating"] + "/5): " + recordingObj["Instructor" + number + "_text"]
}

function generatePeerRating(recordingObj, number) {
  return "Peer " + recordingObj["Rater" + number + "_id"] + " ("+ recordingObj["Rater" + number + "_rating"] + "/5): " + recordingObj["Rater" + number + "_text"]
}
