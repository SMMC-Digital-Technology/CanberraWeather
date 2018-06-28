const bom = require('bom-api');
const {app} = require('electron');
const {BrowserWindow} = require('electron');
const {ipcMain} = require('electron');

var lastRecordDate = new Date();
var temperatureData = {air_temp: "?", recency: ""};

var win;

var siteNames = ["Canberra", "Tuggeranong", "Braidwood"];
var siteCodes = [94926, 94925, 94927];
var currentSite = 0;

app.on('ready', createWindow);
app.on('window-all-closed', () => {
   app.quit();
});

ipcMain.on("locationChange", (event, newLocation) => {
   currentSite = siteNames.indexOf(newLocation);
   clearTimeout();
   CheckData();
});

function createWindow () {
   win = new BrowserWindow({width: 300, height: 250, backgroundColor: "#D2F3E2"});
   win.loadFile('index.html');

   win.webContents.on('did-finish-load', () => {
      win.webContents.send('sites', siteNames);
   });

   win.on('closed', ()=> {
      win = null;
   });

   CheckData();
}

function CheckData () {
   bom.getBomDataBySiteNumberState(siteCodes[currentSite], 'act', NewData);
   setTimeout(CheckData, 1000);
}

/**
 * Runs when new data is received from bom-api. Reads and displays the data.
 * @param error unknown, required by bom-api
 * @param data the weather NewData
 */
function NewData(error, data) {
   if (data) {
      //console.log("     Air Temp: " + data[0].air_temp);
      //console.log("Apparent Temp: " + data[0].apparent_t);
      temperatureData.air_temp = data[0].air_temp;
      lastRecordDate =  ConvertToDate(data[0].local_date_time_full);
   } else {
      console.log("no data received");
   }
   var currentDate = new Date();
   var difference = TimeBetweenDates(lastRecordDate, currentDate);
   //console.log(RecordRecencyString(difference));
   temperatureData.recency = RecordRecencyString(difference);
   if (win) {
      win.webContents.send('update', temperatureData);
   }
}

/**
 * Turns the bom-api date to a Date object.
 * @param bomDate the date from the api
 * @return the Date object
 */
function ConvertToDate(bomDate) {
   //console.log("ConvertToDate_bomDate " + bomDate);
   var date = bomDate.slice(0,4) + "-" + bomDate.slice(4,6) + "-" + bomDate.slice(6,8);
   date = date + "T" + bomDate.slice(8,10) + ":" + bomDate.slice(10,12) + ":" + bomDate.slice(12,14);
   //console.log("ConvertToDate_string " + date);
   return new Date(date);
}

/**
 * Calculates the number of hours, minutes and seconds between to Date objects.
 * @param date1 The first Date object.
 * @param date2 The second Date object, assumed to be later than date1.
 * @return An array in the form [hours, minutes, seconds]
 */
function TimeBetweenDates(date1, date2) {
   var difference = (date2 - date1) / 1000;
   var hours = Math.floor(difference / (60 * 60));
   var difference = difference - hours * 60 * 60;
   var minutes = Math.floor(difference / 60);
   var seconds = Math.floor(difference - minutes * 60);
   return [hours, minutes, seconds];
}

/**
 * Turns a time difference array into a string of text about how long since the data was updated.
 * @param timeDifference an array in the form [hours, minutes, seconds]
 * @return A string commenting on the age of the data.
 */
function RecordRecencyString(timeDifference) {
   var string = "Correct as of ";
   var hours = timeDifference[0] > 0;
   var mins = timeDifference[1] > 0;
   var seconds = timeDifference[2] > 0;
   if (hours && mins && seconds) {
      string = string + timeDifference[0] + " hours, " + timeDifference[1] + " minutes and " + timeDifference[2] + " seconds ago.";
   } else if (hours && mins) {
      string = string + timeDifference[0] + " hours and " + timeDifference[1] + " minutes ago.";
   } else if (hours && seconds) {
      string = string + timeDifference[0] + " hours and " + timeDifference[2] + " seconds ago.";
   } else if (mins && seconds) {
      string = string + timeDifference[1] + " minutes and " + timeDifference[2] + " seconds ago.";
   } else if (hours) {
      string = string + timeDifference[0] + " hours ago.";
   } else if (mins) {
      string = string + timeDifference[1] + " minutes ago.";
   } else {
      string = string + timeDifference[2] + " seconds ago.";
   }
   return string;
}
