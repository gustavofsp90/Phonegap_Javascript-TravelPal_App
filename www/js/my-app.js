
// Initialize app
var myApp = new Framework7();


// If we need to use custom DOM library, let's save it to $$ variable:
var $$ = Dom7;

// Add view
var mainView = myApp.addView('.view-main', {
    // Because we want to use dynamic navbar, we need to enable it for this view:
    dynamicNavbar: true
});

// Handle Cordova Device Ready Event
$$(document).on('deviceready', function() {
    navigator.geolocation.getCurrentPosition(geoCallback, onError);
});


// Now we need to run the code that will be executed only for About page.

// Option 1. Using page callback for page (for "about" page in this case) (recommended way):
myApp.onPageInit('about', function (page) {
    // Do something here for "about" page
    listLocations();
})


var exchangeLocation;
var exchangeBase;
var currentLocation;
var cityName;
var countryName;
var currency;
var weather;
var photos = [];
var wind;
var temp_min;
var temp_max;


$$('#btnCalculateExchange').click(function(){
  
    var currencyValue = document.getElementById('txtCurrency').value;
    var chkLocalCurrency = document.getElementById('chkLocalCurrency').checked;
    var total = document.getElementById('txtResultExchange');
    
    if(chkLocalCurrency){
        total.innerText = calculateRates(currencyValue, exchangeBase).toFixed(2) + " " + currency;        
    }
    else {
        total.innerText = calculateRates(currencyValue, exchangeLocation).toFixed(2)  + " USD"; 
        
    }
});

$$('#btnSave').click(function(){
    saveLocation(currentLocation.coords, cityName, countryName, photos, weather, currency);
});

$$('#resetCities').click(function(){
    deleteAllCities();
});

$$('#openCamera').click(function(){
        navigator.camera.getPicture(onSuccess, onFail, { 
        quality: 50,
        sourceType : Camera.PictureSourceType.CAMERA,
        targetWidth: 1000,
        targetHeight: 1000,
        correctOrientation: true,
        destinationType: Camera.DestinationType.FILE_URI});
        
});

function onSuccess(imageURI) {
    photos.push(imageURI);
}

function onFail(message) {
    alert('Failed because: ' + message);
}

function geoCallback(position) {
    console.log(position);
    currentLocation = position;
    //call cities ws
    getCity(currentLocation, function (data) {
        console.log(data);
        var cityObj = JSON.parse(data);
        console.log(cityObj);
        //set cityname
        cityName = cityObj.results[0].components.city != undefined ? cityObj.results[0].components.city : cityObj.results[0].components.town;
        //set country name
        countryName = cityObj.results[0].components.country +" "+ cityObj.results[0].annotations.flag;
        //set currency name
        currency = cityObj.results[0].annotations.currency.name;
        //call currency base ws
        getCurrencyExchange("USD", cityObj.results[0].annotations.currency.iso_code, function (data) {
            var currencyRateObj = JSON.parse(data);
            //set exchange by iso_code
            exchangeBase = currencyRateObj.rates[cityObj.results[0].annotations.currency.iso_code];
        });
        //call currency location ws
        getCurrencyExchange(cityObj.results[0].annotations.currency.iso_code, "USD", function (data) {
            var currencyRateObj = JSON.parse(data);
            //set exchange by iso_code
            exchangeLocation = currencyRateObj.rates["USD"];
        });

     // Placing the data on the front end
     document.getElementById('currentLocation').innerHTML ="<Strong>Welcome to " + cityName + " - " + countryName + "</Strong>";        
     document.getElementById('currentWeather').innerHTML = "The current temperature is: " + weather + "°C";
     document.getElementById('currentWeatherMax').innerHTML ="Max/Min: " + temp_max + "°C / " + temp_min + "°C";
     document.getElementById('currentWind').innerHTML = "Wind speed: " + wind + "mph ";
     document.getElementById('currentExchange').innerHTML ="The local Currency is " + currency;
     

 });
   
    //call weather ws
    getWeather(currentLocation, function (data) {
        var weatherObj = JSON.parse(data);
        //set weather
        weather = Math.round(weatherObj.main.temp);
        wind = weatherObj.wind.speed;
        temp_min = Math.round(weatherObj.main.temp_min);
        temp_max = Math.round(weatherObj.main.temp_max);
    });
    

}

// onError callback
function onError(msg) {
    console.log(msg);
}

function deleteAllCities(){
    localStorage.removeItem("locations");
    alert('Cities deleted');
}

function saveLocation(loc, cityName, countryName, photos, weather, currency, temp_max, temp_min, wind) {
    //create object to save in the DataBase
    var latitude = loc.latitude;
    var longitude = loc.longitude;
    var objLocation = { "latitude": latitude,
                        "longitude": longitude, 
                        "photos": photos, 
                        "cityName": cityName, 
                        "countryName": countryName, 
                        "weather": weather,
                        "currency": currency,
                        "temp_max": temp_max,
                        "temp_min": temp_min,
                        "wind": wind };

    //get all locations saved - If there is no locations, return an empty array
    var locations = JSON.parse(localStorage.getItem("locations") || "[]");
    //update if exists
    for (i = 0; i < locations.length; i++) {
        if (locations[i].latitude == latitude && locations[i].longitude == longitude) {
            locations.splice(i, 1);
        }
    }
    locations.push(objLocation);
    localStorage.setItem("locations", JSON.stringify(locations));
    alert('Location saved!');
}

function listLocations() {
    //get all locations stored in the database
    var locations = JSON.parse(localStorage.getItem("locations") || "[]");
    //loop through all the locations
    for (i = 0; i < locations.length; i++) {
        //create HTML element P 
        var p = document.createElement("p");
        //create the text to be included 
        var inputValue = locations[i].cityName + " (" + locations[i].countryName + ") - " + "Weather: " + locations[i].weather + "°C  Currency: " + locations[i].currency;
        //append the text to the html element
        p.appendChild(document.createTextNode(inputValue));
		
        for (y = 0; y < locations[i].photos.length; y++) {
            //create image element
            var img = document.createElement("img");
            //set src element
			img.setAttribute("src", locations[i].photos[y]);
			img.setAttribute("width", "150");
            img.setAttribute("height", "150");
        //append img element to the p element
            p.appendChild(img);
        }       

        //append element p to listcities div element
        document.getElementById("listCities").appendChild(p);
    }
}


function calculateRates(value, rate) {
    return value * rate;
}

function requestAPI(url, callback) {
    
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            if (request.status == 200 || request.status == 0) {
                callback(request.responseText);
            }
        }
    }
    request.send();
}

function getCity(position, callback) {
    var url = 'https://api.opencagedata.com/geocode/v1/json?q=' + position.coords.latitude + '+' + position.coords.longitude + '&key=4a218906be9e413d83d4d1c77029d1bb';
    requestAPI(url, function (data) {
        callback(data);
    });
}


function getCurrencyExchange(base, currency, callback) {
    var api = "https://api.ratesapi.io/api/latest?base=" + base + "&symbols=" + currency;
    requestAPI(api, function (data) {
        callback(data);
    });
}

function getWeather(position, callback) {
  
    var url = "https://api.openweathermap.org/data/2.5/weather?lat=" + position.coords.latitude + "&lon=" + position.coords.longitude + "&appid=d7b4c21c941b3e59e4c0f32b7768e41a&units=metric";
    requestAPI(url, function (data) {
        callback(data);
    });
}



